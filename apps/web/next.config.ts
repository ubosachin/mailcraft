import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@mailcraft/shared-types',
    '@mailcraft/validation',
    '@mailcraft/database',
    '@mailcraft/email-renderer',
  ],
  serverExternalPackages: ['mongoose', 'mongodb', 'bullmq', 'ioredis'],
};

export default nextConfig;

