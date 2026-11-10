import { connectToDatabase } from '@mailcraft/database';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { getCampaignQueue, getTestEmailQueue, isRedisConfigured } from './queue';

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
    const dbConn = await connectToDatabase();
    const activeDb = dbConn.connection?.db || mongoose.connection?.db;
    if (activeDb) {
      await activeDb.admin().ping();
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

  // 2. Check Redis (optional in serverless inline mode)
  const redisConfigured = isRedisConfigured();
  const redisStart = Date.now();
  if (!redisConfigured) {
    checks.redis = {
      status: 'not_configured',
      mode: 'serverless_inline',
    };
  } else {
    try {
      const url = process.env.REDIS_URL!.trim();
      const redis = new Redis(url, {
        tls: url.startsWith('rediss://') ? {} : undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 2500,
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
  }

  const ready = mongoOk && (redisConfigured ? redisOk : true);
  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    checks,
  };
}

export async function getQueueMetrics() {
  if (!isRedisConfigured()) {
    return {
      configured: false,
      mode: 'serverless_inline',
      campaigns: {},
      testEmails: {},
      timestamp: new Date().toISOString(),
    };
  }

  const campQueue = getCampaignQueue();
  const testQueue = getTestEmailQueue();

  const [campCounts, testCounts] = await Promise.all([
    campQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused'),
    testQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
  ]);

  return {
    configured: true,
    mode: 'redis_bullmq',
    campaigns: campCounts,
    testEmails: testCounts,
    timestamp: new Date().toISOString(),
  };
}

