import crypto from 'node:crypto';
import { IEncryptedCredentials } from '@mailcraft/shared-types';

const ALGORITHM = 'aes-256-gcm';
const DEFAULT_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY_HEX;
  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

export function encryptCredentials(payload: unknown): IEncryptedCredentials {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
  let ciphertext = cipher.update(serialized, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: ciphertext,
  };
}

export function decryptCredentials<T = unknown>(encrypted: IEncryptedCredentials): T {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const tag = Buffer.from(encrypted.tag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return decrypted as unknown as T;
  }
}

export function generateSessionToken(): string {
  return 'mc_sess_' + crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(rawToken: string): string {
  const secret = process.env.APP_SECRET || 'mailcraft_default_app_secret_dev_2026';
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashVerificationCode(code: string): string {
  const secret = process.env.APP_SECRET || 'mailcraft_default_app_secret_dev_2026';
  return crypto.createHmac('sha256', secret).update(code).digest('hex');
}
