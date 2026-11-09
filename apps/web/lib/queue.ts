import { Queue } from 'bullmq';

let campaignQueue: Queue | null = null;
let testEmailQueue: Queue | null = null;

function getRedisConnectionOptions() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const parsed = new URL(url);

  return {
    host: parsed.hostname || '127.0.0.1',
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null,
  };
}

export function getCampaignQueue(): Queue {
  if (!campaignQueue) {
    campaignQueue = new Queue('mailcraft-campaigns', {
      connection: getRedisConnectionOptions(),
    });
  }
  return campaignQueue;
}

export function getTestEmailQueue(): Queue {
  if (!testEmailQueue) {
    testEmailQueue = new Queue('mailcraft-test-emails', {
      connection: getRedisConnectionOptions(),
    });
  }
  return testEmailQueue;
}

export async function enqueueCampaignJob(campaignId: string) {
  const q = getCampaignQueue();
  return await q.add(
    'dispatch-campaign',
    { campaignId },
    {
      jobId: `camp_${campaignId}_${Date.now()}`,
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

