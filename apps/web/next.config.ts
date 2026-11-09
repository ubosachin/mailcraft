import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@mailcraft/shared-types', '@mailcraft/validation', '@mailcraft/database'],
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
