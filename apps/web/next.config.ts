import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  poweredByHeader: false,
  transpilePackages: [
    '@mailcraft/shared-types',
    '@mailcraft/validation',
    '@mailcraft/database',
    '@mailcraft/email-renderer',
    '@mailcraft/email-providers',
  ],
  serverExternalPackages: ['mongoose', 'mongodb', 'bullmq', 'ioredis', 'nodemailer'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Optional MongoDB driver peer dependencies in mongodb/lib/deps.js are wrapped in try/catch.
      // Externalizing them avoids noisy "Module not found" bundler warnings while preserving
      // runtime MODULE_NOT_FOUND handling when Mongoose is bundled via workspace packages.
      const optionalMongoExternals = {
        aws4: 'commonjs aws4',
        kerberos: 'commonjs kerberos',
        '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
        '@aws-sdk/credential-providers': 'commonjs @aws-sdk/credential-providers',
        'gcp-metadata': 'commonjs gcp-metadata',
        snappy: 'commonjs snappy',
        socks: 'commonjs socks',
        'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      };
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [optionalMongoExternals, ...existingExternals];
    }
    return config;
  },
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

