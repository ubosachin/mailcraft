import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: [
    '@mailcraft/shared-types',
    '@mailcraft/validation',
    '@mailcraft/database',
    '@mailcraft/email-renderer',
    '@mailcraft/email-providers',
  ],
  serverExternalPackages: ['mongoose', 'mongodb', 'bullmq', 'ioredis', 'nodemailer'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;

