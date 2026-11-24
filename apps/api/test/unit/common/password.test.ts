import { describe, expect, it } from 'vitest';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../../../src/common/password';

const PASSWORD = 'correct horse battery';
/** `scrypt$N$r$p$salt$hash`: the parameters of E02-D6, a 16-byte salt and a 64-byte key. */
const FORMAT = /^scrypt\$131072\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/;

describe('hashPassword', () => {
  it('S02.1 AC13 writes the scrypt$N$r$p$salt$hash format with the E02-D6 parameters', async () => {
    expect(await hashPassword(PASSWORD)).toMatch(FORMAT);
  });

  it('S02.1 AC13 gives two different hashes for one password, neither containing it', async () => {
    const [first, second] = await Promise.all([hashPassword(PASSWORD), hashPassword(PASSWORD)]);

    expect(first).not.toBe(second);
    for (const hash of [first, second]) {
      expect(hash).not.toContain(PASSWORD);
      expect(hash).not.toContain(Buffer.from(PASSWORD).toString('base64url'));
    }
  });
});

describe('verifyPassword', () => {
  it('S02.1 AC13 accepts the right password and refuses a wrong one', async () => {
    const hash = await hashPassword(PASSWORD);

    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword('correct horse batterY', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it.each([
    ['an empty value', ''],
    ['another algorithm', 'bcrypt$131072$8$1$c2FsdA$aGFzaA'],
    ['missing parts', 'scrypt$131072$8$1$c2FsdA'],
    ['an N that is not a power of two', 'scrypt$100000$8$1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA'],
    ['an N far too large', 'scrypt$1073741824$8$1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA'],
    ['an r that is not a number', 'scrypt$131072$x$1$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA'],
    ['a p of 0', 'scrypt$131072$8$0$c2FsdHNhbHRzYWx0c2FsdA$aGFzaA'],
    ['an empty salt', 'scrypt$131072$8$1$$aGFzaA'],
    ['a hash that is not base64url', 'scrypt$131072$8$1$c2FsdHNhbHRzYWx0c2FsdA$not*base64'],
    ['an extra part', 'scrypt$131072$8$1$c2FsdA$aGFzaA$more'],
  ])('S02.1 AC13 returns false, without throwing, for %s', async (_label, stored) => {
    await expect(verifyPassword(PASSWORD, stored)).resolves.toBe(false);
  });

  it('S02.1 AC13 offers a well-formed dummy hash that matches no ordinary password', async () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(FORMAT);
    expect(await verifyPassword(PASSWORD, DUMMY_PASSWORD_HASH)).toBe(false);
  });
});
