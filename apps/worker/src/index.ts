import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import { getRedisConnectionOptions } from './redis.js';
import { processCampaignJob } from './processors/campaign.processor.js';
import { processTestEmailJob } from './processors/test-email.processor.js';
import { connectToDatabase } from '@mailcraft/database';

dotenv.config();

const connection = getRedisConnectionOptions();

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
    }
  );

  campaignWorker.on('completed', (job) => {
    console.log(`[CampaignWorker] Job ${job.id} completed successfully`);
  });

  campaignWorker.on('failed', (job, err) => {
    console.error(`[CampaignWorker] Job ${job?.id} failed with error:`, err.message);
  });

  testEmailWorker.on('completed', (job) => {
    console.log(`[TestEmailWorker] Job ${job.id} dispatched test email`);
  });

  console.log('✓ Workers initialized on BullMQ queues: mailcraft-campaigns & mailcraft-test-emails');
  console.log('⚡ Worker listening for incoming promotional email broadcasts...');

  const shutdown = async () => {
    console.log('Shutting down workers gracefully...');
    await campaignWorker.close();
    await testEmailWorker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});

