import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

/**
 * Hashes a plain text password using Node.js scrypt algorithm with a random salt.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain text password against a stored salted scrypt hash string.
 */
export function comparePassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const hashBuffer = Buffer.from(hash, 'hex');
    const suppliedHashBuffer = scryptSync(password, salt, 64);
    return timingSafeEqual(hashBuffer, suppliedHashBuffer);
  } catch (error) {
    return false;
  }
}
