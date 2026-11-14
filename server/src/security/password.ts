import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt-v1$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  const parts = encoded?.split('$');
  const valid = parts?.length === 3 && parts[0] === 'scrypt-v1' &&
    /^[0-9a-f]{32}$/.test(parts[1]) && /^[0-9a-f]{64}$/.test(parts[2]);
  const salt = valid ? Buffer.from(parts[1], 'hex') : Buffer.alloc(16);
  const expected = valid ? Buffer.from(parts[2], 'hex') : Buffer.alloc(32);
  const actual = await derive(password, salt);
  return !!valid && timingSafeEqual(actual, expected);
}
