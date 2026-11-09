import { connectToDatabase } from '@mailcraft/database';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { getCampaignQueue, getTestEmailQueue } from './queue';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  environment: string;
  dependencies: {
    mongodb: {
      status: 'connected' | 'disconnected' | 'error';
      latencyMs?: number;
      error?: string;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'error';
      latencyMs?: number;
      error?: string;
    };
  };
}

export async function checkLiveness() {
  const mem = process.memoryUsage();
  return {
    status: 'live',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
  };
}

export async function checkReadiness(): Promise<{
  ready: boolean;
  status: 'ready' | 'not_ready';
  checks: Record<string, unknown>;
}> {
  const checks: Record<string, unknown> = {};
  let mongoOk = false;
  let redisOk = false;

  // 1. Check MongoDB
  const mongoStart = Date.now();
  try {
    await connectToDatabase();
    if (mongoose.connection?.db) {
      await mongoose.connection.db.admin().ping();
      mongoOk = true;
      checks.mongodb = {
        status: 'connected',
        latencyMs: Date.now() - mongoStart,
      };
    } else {
      checks.mongodb = { status: 'connecting' };
    }
  } catch (err) {
    checks.mongodb = {
      status: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // 2. Check Redis
  const redisStart = Date.now();
  try {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    const redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await redis.connect();
    const ping = await redis.ping();
    await redis.quit();

    if (ping === 'PONG') {
      redisOk = true;
      checks.redis = {
        status: 'connected',
        latencyMs: Date.now() - redisStart,
      };
    } else {
      checks.redis = { status: 'unexpected_response' };
    }
  } catch (err) {
    checks.redis = {
      status: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const ready = mongoOk && redisOk;
  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    checks,
  };
}

export async function getQueueMetrics() {
  const campQueue = getCampaignQueue();
  const testQueue = getTestEmailQueue();

  const [campCounts, testCounts] = await Promise.all([
    campQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    testQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  return {
    campaigns: campCounts,
    testEmails: testCounts,
    timestamp: new Date().toISOString(),
  };
}

