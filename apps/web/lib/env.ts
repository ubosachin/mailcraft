import { validateEnvironment, EnvConfig, ProviderConfigurationStatus } from '@mailcraft/validation';

let validatedEnv: EnvConfig | null = null;
let envStatus: ProviderConfigurationStatus | null = null;

export function getEnvironmentConfig(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = validateEnvironment(process.env);
  envStatus = result.status;

  if (!result.valid) {
    console.error('❌ [MailCraft Startup] Environment validation failed:');
    result.errors?.forEach((err) => console.error(`  - ${err}`));

    // In production, refuse to boot with invalid environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Production environment configuration invalid: ${result.errors?.join(', ')}`);
    }
  } else {
    validatedEnv = result.config || (process.env as unknown as EnvConfig);
    console.log('✓ [MailCraft Startup] Environment verified successfully.');
    console.log(`  - Database: ${envStatus.database}`);
    console.log(`  - Redis Queue: ${envStatus.redis}`);
    console.log(`  - Cryptographic Vault: ${envStatus.encryption}`);
    console.log(`  - Gmail OAuth: ${envStatus.gmail}`);
    console.log(`  - Brevo Bulk: ${envStatus.brevo}`);
    console.log(`  - Amazon SES: ${envStatus.ses}`);
    console.log(`  - Cloudinary Storage: ${envStatus.cloudinary}`);
    console.log(`  - Sentry Monitoring: ${envStatus.sentry}`);
  }

  return validatedEnv || (process.env as unknown as EnvConfig);
}

export function getEnvironmentStatus(): ProviderConfigurationStatus {
  if (!envStatus) {
    const result = validateEnvironment(process.env);
    envStatus = result.status;
  }
  return envStatus;
}

