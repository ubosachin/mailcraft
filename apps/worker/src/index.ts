import { Worker, Queue } from 'bullmq';
import dotenv from 'dotenv';
import { getRedisConnectionOptions } from './redis.js';
import { processCampaignJob } from './processors/campaign.processor.js';
import { processTestEmailJob } from './processors/test-email.processor.js';
import { connectToDatabase } from '@mailcraft/database';
import { validateEnvironment } from '@mailcraft/validation';
import { workerLogger } from './logger.js';

dotenv.config();

// Validate Environment at Worker Startup
const envResult = validateEnvironment(process.env);
if (!envResult.valid) {
  console.error('❌ [Worker Startup] Invalid environment configuration:');
  envResult.errors?.forEach((e) => console.error(`  - ${e}`));
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
} else {
  console.log('✓ [Worker Startup] Environment verified successfully.');
}

const connection = getRedisConnectionOptions();

// Dead-Letter Queue (DLQ) for permanently failed campaign broadcasts
const dlq = new Queue('mailcraft-campaigns-dlq', { connection });

async function main() {
  console.log('--- MailCraft Background Campaign Worker Starting ---');

  await connectToDatabase();
  console.log('✓ Worker connected to MongoDB');

  const campaignWorker = new Worker(
    'mailcraft-campaigns',
    async (job) => {
      await processCampaignJob(job);
    },
    {
      connection,
      concurrency: 5,
      lockDuration: 30000,
      stalledInterval: 15000,
      maxStalledCount: 2,
    }
  );

  const testEmailWorker = new Worker(
    'mailcraft-test-emails',
    async (job) => {
      return await processTestEmailJob(job);
    },
    {
      connection,
      concurrency: 10,
      lockDuration: 15000,
    }
  );

  campaignWorker.on('completed', (job) => {
    workerLogger.info(`Job ${job.id} completed successfully`, {
      jobId: job.id,
      campaignId: job.data.campaignId,
    });
  });

  campaignWorker.on('failed', async (job, err) => {
    workerLogger.error(`Job ${job?.id} failed`, {
      jobId: job?.id,
      campaignId: job?.data?.campaignId,
      attemptsMade: job?.attemptsMade,
    }, err);

    // Route to Dead-Letter Queue if all retry attempts exhausted
    const maxAttempts = job?.opts?.attempts || 3;
    if (job && job.attemptsMade >= maxAttempts) {
      try {
        await dlq.add('dead-letter-campaign', {
          jobId: job.id,
          campaignId: job.data?.campaignId,
          failedReason: err.message,
          attemptsMade: job.attemptsMade,
          failedAt: new Date().toISOString(),
        });
        console.warn(`⚠️ [DLQ] Job ${job.id} exceeded ${maxAttempts} attempts and routed to mailcraft-campaigns-dlq`);
      } catch (dlqErr) {
        console.error('Failed to route job to DLQ:', dlqErr);
      }
    }
  });

  testEmailWorker.on('completed', (job) => {
    workerLogger.info(`Test email dispatched`, { jobId: job.id });
  });

  console.log('✓ Workers initialized on BullMQ queues: mailcraft-campaigns & mailcraft-test-emails');
  console.log('✓ Dead-Letter Queue (DLQ) ready: mailcraft-campaigns-dlq');
  console.log('⚡ Worker listening for incoming promotional email broadcasts...');

  const shutdown = async () => {
    console.log('Shutting down workers gracefully...');
    await campaignWorker.close();
    await testEmailWorker.close();
    await dlq.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
