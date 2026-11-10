import { Queue, ConnectionOptions } from 'bullmq';

let campaignQueue: Queue | null = null;
let testEmailQueue: Queue | null = null;

/**
 * Returns true only when REDIS_URL is configured (and not implicitly localhost in production).
 */
export function isRedisConfigured(): boolean {
  const configured = process.env.REDIS_URL?.trim();
  if (!configured) return false;
  if (
    process.env.NODE_ENV === 'production' &&
    (configured.includes('127.0.0.1') || configured.includes('localhost'))
  ) {
    return false;
  }
  return configured.startsWith('redis://') || configured.startsWith('rediss://');
}

export function getRedisConnectionOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';
  const parsed = new URL(url);

  return {
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port) || 6379,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    connectTimeout: 4000,
    maxRetriesPerRequest: null,
  };
}

export function getCampaignQueue(): Queue {
  if (!campaignQueue) {
    campaignQueue = new Queue('mailcraft-campaigns', {
      connection: getRedisConnectionOptions(),
    });
    campaignQueue.on('error', () => {
      // Prevent unhandled socket error crashes in serverless environments
    });
  }
  return campaignQueue;
}

export function getTestEmailQueue(): Queue {
  if (!testEmailQueue) {
    testEmailQueue = new Queue('mailcraft-test-emails', {
      connection: getRedisConnectionOptions(),
    });
    testEmailQueue.on('error', () => {
      // Prevent unhandled socket error crashes in serverless environments
    });
  }
  return testEmailQueue;
}

/**
 * Checks whether Redis is reachable AND at least one external BullMQ campaign worker is online.
 */
export async function hasActiveCampaignWorker(timeoutMs = 1500): Promise<boolean> {
  if (!isRedisConfigured()) {
    return false;
  }

  try {
    const q = getCampaignQueue();
    const workers = await Promise.race([
      q.getWorkers(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis worker check timed out')), timeoutMs)
      ),
    ]);
    return Array.isArray(workers) && workers.length > 0;
  } catch {
    return false;
  }
}

export async function enqueueCampaignJob(
  campaignId: string,
  options?: { delayMs?: number; jobId?: string }
) {
  const q = getCampaignQueue();
  return await q.add(
    'dispatch-campaign',
    { campaignId },
    {
      jobId: options?.jobId || `camp_${campaignId}_${Date.now()}`,
      delay: options?.delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    }
  );
}

export async function enqueueTestEmailJob(campaignId: string, testEmail: string) {
  const q = getTestEmailQueue();
  return await q.add('send-test-email', { campaignId, testEmail }, { removeOnComplete: true });
}
