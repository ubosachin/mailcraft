import { Types } from 'mongoose';
import { GMAIL_SMTP_DAILY_LIMIT } from '@mailcraft/shared-types';
import { EmailConnection, IEmailConnectionDoc } from './models/EmailConnection.js';

export interface DailyQuotaStatus {
  limit: number | null;
  sentToday: number;
  remaining: number | null;
}

export interface DailyQuotaReservation extends DailyQuotaStatus {
  allowed: boolean;
}

export function getUtcDayStart(date = new Date()): Date {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function resolveEffectiveDailyLimit(
  connection: Pick<IEmailConnectionDoc, 'provider' | 'dailyQuotaLimit'>
): number | null {
  if (typeof connection.dailyQuotaLimit === 'number' && connection.dailyQuotaLimit > 0) {
    return connection.dailyQuotaLimit;
  }
  if (connection.provider === 'gmail_smtp') {
    return GMAIL_SMTP_DAILY_LIMIT;
  }
  return null;
}

export function getConnectionDailyQuotaStatus(
  connection: Pick<
    IEmailConnectionDoc,
    'provider' | 'dailyQuotaLimit' | 'dailySentCount' | 'dailySentWindowStart'
  >
): DailyQuotaStatus {
  const limit = resolveEffectiveDailyLimit(connection);
  if (limit === null) {
    return { limit: null, sentToday: 0, remaining: null };
  }

  const todayStart = getUtcDayStart();
  const isCurrentWindow =
    connection.dailySentWindowStart &&
    new Date(connection.dailySentWindowStart).getTime() >= todayStart.getTime();
  const sentToday = isCurrentWindow ? Math.max(0, connection.dailySentCount || 0) : 0;

  return {
    limit,
    sentToday,
    remaining: Math.max(0, limit - sentToday),
  };
}

/**
 * Atomically reserves 1 send slot against a connection's daily UTC quota when a daily limit applies.
 */
export async function reserveConnectionDailyQuota(
  connectionId: Types.ObjectId | string,
  limitOverride?: number | null
): Promise<DailyQuotaReservation> {
  const conn = await EmailConnection.findById(connectionId).select(
    'provider dailyQuotaLimit dailySentCount dailySentWindowStart'
  );
  if (!conn) {
    return { allowed: false, limit: 0, sentToday: 0, remaining: 0 };
  }

  const effectiveLimit =
    typeof limitOverride === 'number' && limitOverride > 0
      ? limitOverride
      : resolveEffectiveDailyLimit(conn);

  if (effectiveLimit === null) {
    return { allowed: true, limit: null, sentToday: 0, remaining: null };
  }

  const todayStart = getUtcDayStart();

  // Roll the daily window counter forward atomically if we crossed 00:00 UTC
  await EmailConnection.updateOne(
    {
      _id: conn._id,
      $or: [
        { dailySentWindowStart: null },
        { dailySentWindowStart: { $exists: false } },
        { dailySentWindowStart: { $lt: todayStart } },
      ],
    },
    {
      $set: {
        dailySentCount: 0,
        dailySentWindowStart: todayStart,
      },
    }
  );

  // Atomically reserve 1 send unit only if still strictly below the daily cap
  const incremented = await EmailConnection.findOneAndUpdate(
    {
      _id: conn._id,
      dailySentCount: { $lt: effectiveLimit },
    },
    {
      $inc: { dailySentCount: 1 },
    },
    { new: true }
  );

  if (!incremented) {
    return {
      allowed: false,
      limit: effectiveLimit,
      sentToday: effectiveLimit,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    limit: effectiveLimit,
    sentToday: incremented.dailySentCount,
    remaining: Math.max(0, effectiveLimit - incremented.dailySentCount),
  };
}

