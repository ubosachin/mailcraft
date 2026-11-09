import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return {
    hash: derivedKey.toString('hex'),
    salt,
  };
}

/**
 * Verifies a plaintext password against a stored salt and hash using timing-safe comparison
 */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedKeyBuffer = Buffer.from(hash, 'hex');
    if (derivedKey.length !== storedKeyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(derivedKey, storedKeyBuffer);
  } catch {
    return false;
  }
}

