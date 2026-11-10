import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('https://web-tawny-three-j5f5132mxd.vercel.app'),
  API_BASE_URL: z.string().url().optional(),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine((val) => val.startsWith('mongodb://') || val.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://',
    }),
  MONGODB_MAX_POOL_SIZE: z.string().optional(),
  REDIS_URL: z
    .string()
    .optional()
    .refine((val) => !val || val.startsWith('redis://') || val.startsWith('rediss://'), {
      message: 'REDIS_URL must start with redis:// or rediss:// when provided',
    }),
  ENCRYPTION_KEY: z
    .string()
    .min(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .max(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a valid 64-character hex string'),
  ENCRYPTION_KEY_VERSION: z.string().optional(),
  APP_SECRET: z.string().min(32, 'APP_SECRET must be at least 32 characters for security'),

  // Optional Providers & Platform Webhooks
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  BREVO_API_KEY: z.string().optional(),
  SYSTEM_BREVO_API_KEY: z.string().optional(),
  SYSTEM_SENDER_EMAIL: z.string().optional(),
  BREVO_WEBHOOK_SECRET: z.string().optional(),

  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export interface ProviderConfigurationStatus {
  database: 'connected' | 'unconfigured';
  redis: 'configured' | 'unconfigured';
  encryption: 'valid' | 'invalid';
  gmail: 'configured' | 'not_configured';
  brevo: 'configured' | 'not_configured';
  ses: 'configured' | 'not_configured';
  cloudinary: 'configured' | 'not_configured';
  sentry: 'configured' | 'not_configured';
}

export function validateEnvironment(env: Record<string, string | undefined>): {
  valid: boolean;
  config?: EnvConfig;
  errors?: string[];
  status: ProviderConfigurationStatus;
} {
  const normalizedEnv = {
    ...env,
    REDIS_URL: env.REDIS_URL?.trim() || undefined,
    NEXT_PUBLIC_APP_URL:
      env.NEXT_PUBLIC_APP_URL ||
      (env.NODE_ENV === 'production'
        ? 'https://web-tawny-three-j5f5132mxd.vercel.app'
        : 'http://localhost:3000'),
  };
  const result = envSchema.safeParse(normalizedEnv);

  const status: ProviderConfigurationStatus = {
    database: env.MONGODB_URI ? 'connected' : 'unconfigured',
    redis: env.REDIS_URL ? 'configured' : 'unconfigured',
    encryption:
      env.ENCRYPTION_KEY && /^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY) ? 'valid' : 'invalid',
    gmail:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? 'configured' : 'not_configured',
    brevo: env.BREVO_API_KEY ? 'configured' : 'not_configured',
    ses:
      env.AWS_REGION && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? 'configured'
        : 'not_configured',
    cloudinary:
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
        ? 'configured'
        : 'not_configured',
    sentry: env.SENTRY_DSN ? 'configured' : 'not_configured',
  };

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      status,
    };
  }

  return {
    valid: true,
    config: result.data,
    status,
  };
}
