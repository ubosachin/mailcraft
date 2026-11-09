export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export const RATE_LIMIT_RULES: Record<string, RateLimitConfig> = {
  SESSION_CREATE: { max: 10, windowMs: 10 * 60 * 1000 },
  CAMPAIGN_CREATE: { max: 20, windowMs: 60 * 60 * 1000 },
  CAMPAIGN_SEND: { max: 5, windowMs: 60 * 60 * 1000 },
  TEST_EMAIL: { max: 15, windowMs: 15 * 60 * 1000 },
  CONTACT_IMPORT: { max: 10, windowMs: 60 * 60 * 1000 },
  WEBHOOK: { max: 30, windowMs: 1000 },
  API_DEFAULT: { max: 120, windowMs: 60 * 1000 },
};

interface MemoryRecord {
  timestamps: number[];
}
const memoryCache = new Map<string, MemoryRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * Universal in-memory sliding window rate limiter
 */
export function checkMemoryRateLimit(
  key: string,
  ruleName: keyof typeof RATE_LIMIT_RULES | RateLimitConfig = 'API_DEFAULT'
): RateLimitResult {
  const rule: RateLimitConfig =
    typeof ruleName === 'string'
      ? RATE_LIMIT_RULES[ruleName] || RATE_LIMIT_RULES.API_DEFAULT
      : ruleName;

  const now = Date.now();
  const windowStart = now - rule.windowMs;
  let record = memoryCache.get(key);

  if (!record) {
    record = { timestamps: [] };
    memoryCache.set(key, record);
  }

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
  return {
    success: true,
    limit: rule.max,
    remaining: rule.max - record.timestamps.length,
    resetMs: rule.windowMs,
  };
}

