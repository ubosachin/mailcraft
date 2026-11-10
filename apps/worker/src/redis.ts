import { ConnectionOptions } from 'bullmq';

export function getRedisConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const parsed = new URL(url);

  return {
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port) || 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  };
}
