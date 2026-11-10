import Redis from 'ioredis';

interface RateLimitConfig {
  max: number; // Maximum allowed requests
  windowMs: number; // Time window in milliseconds
}

export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  // 10 sessions created per IP per 10 minutes
  SESSION_CREATE: { max: 10, windowMs: 10 * 60 * 1000 },
  // 20 campaigns created per session per hour
  CAMPAIGN_CREATE: { max: 20, windowMs: 60 * 60 * 1000 },
  // 5 live campaign broadcasts per session per hour
  CAMPAIGN_SEND: { max: 5, windowMs: 60 * 60 * 1000 },
  // 15 test email dispatches per session per 15 minutes
  TEST_EMAIL: { max: 15, windowMs: 15 * 60 * 1000 },
  // 10 contact imports per session per hour
  CONTACT_IMPORT: { max: 10, windowMs: 60 * 60 * 1000 },
  // 30 webhook payloads per second per IP
  WEBHOOK: { max: 30, windowMs: 1000 },
  // Generic API limit: 120 requests per minute
  API_DEFAULT: { max: 120, windowMs: 60 * 1000 },
};

// In-memory sliding window cache for local development or fallback
interface SlidingWindowRecord {
  timestamps: number[];
}
const memoryCache = new Map<string, SlidingWindowRecord>();

let redisClient: Redis | null = null;
let redisFailed = false;

function getRedisClient(): Redis | null {
  if (redisFailed) return null;
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL?.trim();
  if (
    !url ||
    (process.env.NODE_ENV === 'production' &&
      (url.includes('127.0.0.1') || url.includes('localhost')))
  ) {
    redisFailed = true;
    return null;
  }

  try {
    redisClient = new Redis(url, {
      tls: url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redisClient.on('error', () => {
      // Graceful fallback to in-memory on error
      redisFailed = true;
    });

    redisClient.connect().catch(() => {
      redisFailed = true;
    });

    return redisClient;
  } catch {
    redisFailed = true;
    return null;
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Checks and increments rate limit counter for a given key and action
 */
export async function checkRateLimit(
  key: string,
  ruleName: keyof typeof RATE_LIMIT_RULES | RateLimitConfig = 'API_DEFAULT'
): Promise<RateLimitResult> {
  const rule: RateLimitConfig =
    typeof ruleName === 'string'
      ? RATE_LIMIT_RULES[ruleName] || RATE_LIMIT_RULES.API_DEFAULT
      : ruleName;

  const now = Date.now();
  const redis = getRedisClient();

  if (redis && redis.status === 'ready') {
    try {
      const redisKey = `ratelimit:${key}`;
      const windowSeconds = Math.ceil(rule.windowMs / 1000);

      const current = await redis.incr(redisKey);
      if (current === 1) {
        await redis.expire(redisKey, windowSeconds);
      }

      const ttl = await redis.ttl(redisKey);
      const remaining = Math.max(0, rule.max - current);
      const resetMs = ttl > 0 ? ttl * 1000 : rule.windowMs;

      return {
        success: current <= rule.max,
        limit: rule.max,
        remaining,
        resetMs,
      };
    } catch {
      // Fallback to in-memory below
    }
  }

  // In-memory sliding window fallback
  const windowStart = now - rule.windowMs;
  let record = memoryCache.get(key);

  if (!record) {
    record = { timestamps: [] };
    memoryCache.set(key, record);
  }

  // Prune timestamps older than window
  record.timestamps = record.timestamps.filter((t) => t > windowStart);

  if (record.timestamps.length >= rule.max) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, oldest + rule.windowMs - now);

    return {
      success: false,
      limit: rule.max,
      remaining: 0,
      resetMs,
    };
  }

  record.timestamps.push(now);
  const remaining = rule.max - record.timestamps.length;
  const resetMs = rule.windowMs;

  // Cleanup old cache entries periodically
  if (memoryCache.size > 10000) {
    for (const [k, v] of memoryCache.entries()) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1] < windowStart) {
        memoryCache.delete(k);
      }
    }
  }

  return {
    success: true,
    limit: rule.max,
    remaining,
    resetMs,
  };
}

