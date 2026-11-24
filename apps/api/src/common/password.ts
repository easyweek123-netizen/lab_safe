import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with scrypt (E02 design "Data", decision E02-D6). A stored value is
 * `scrypt$N$r$p$salt$hash`, salt and hash in base64url, so the parameters travel with the hash
 * and can be raised later without breaking old accounts. Never log a password or a hash.
 */

const N = 2 ** 17;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/** Limits for a stored value, so a malformed one can never make scrypt throw or run away. */
const MAX_N = 2 ** 20;
const MAX_R = 32;
const MAX_P = 16;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const POSITIVE_INT = /^[1-9][0-9]{0,9}$/;

/**
 * A well-formed hash of a random secret that was thrown away. `AuthService.login` verifies
 * against it when the email is unknown, so both login failures cost one scrypt (BE-03).
 */
export const DUMMY_PASSWORD_HASH =
  'scrypt$131072$8$1$IzgSNNWqTfd8qwxnHivbIw$g4XMB8u2MQEhLb24PZUdvGWl9RNAd_gJ2yblhn3rh6bjVKhST_SEts476gr9QR0eI5mvzqr1z7ySSIm47uFHBw';

/** scrypt needs about 128 · N · r bytes; Node refuses anything above `maxmem` (32 MiB default). */
function optionsFor(n: number, r: number, p: number): ScryptOptions {
  return { N: n, r, p, maxmem: 2 * 128 * n * r };
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Hashes a password with a new random salt. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, KEY_BYTES, optionsFor(N, R, P));
  return ['scrypt', N, R, P, salt.toString('base64url'), key.toString('base64url')].join('$');
}

interface StoredHash {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

/** The parts of a stored value, or undefined if it is not a hash this module could have written. */
function parseStoredHash(stored: string): StoredHash | undefined {
  const parts = stored.split('$');
  if (parts.length !== 6) return undefined;
  const [algorithm, nText, rText, pText, saltText, keyText] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (algorithm !== 'scrypt') return undefined;
  if (![nText, rText, pText].every((text) => POSITIVE_INT.test(text))) return undefined;
  if (!BASE64URL.test(saltText) || !BASE64URL.test(keyText)) return undefined;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  const isPowerOfTwo = n > 1 && (n & (n - 1)) === 0;
  if (!isPowerOfTwo || n > MAX_N || r > MAX_R || p > MAX_P) return undefined;
  const salt = Buffer.from(saltText, 'base64url');
  const key = Buffer.from(keyText, 'base64url');
  if (salt.length === 0 || key.length === 0) return undefined;
  return { n, r, p, salt, key };
}

/**
 * True if the password matches the stored hash. Compares in constant time. A malformed stored
 * value gives false, never an exception.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStoredHash(stored);
  if (!parsed) return false;
  const key = await deriveKey(
    password,
    parsed.salt,
    parsed.key.length,
    optionsFor(parsed.n, parsed.r, parsed.p),
  );
  return timingSafeEqual(key, parsed.key);
}
