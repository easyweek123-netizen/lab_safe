import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../../src/common/config';

const DATABASE_URL = 'postgres://labsafe:labsafe@localhost:5442/labsafe';

function configErrorOf(env: NodeJS.ProcessEnv): ConfigError {
  try {
    loadConfig(env);
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return error as ConfigError;
  }
  throw new Error('loadConfig did not throw');
}

describe('loadConfig', () => {
  it('TC-7.1 refuses an env without DATABASE_URL and names it', () => {
    const error = configErrorOf({ PORT: '3000', NODE_ENV: 'development' });

    expect(error.message).toBe('Invalid configuration: DATABASE_URL: is required');
  });

  it('TC-7.1 refuses a DATABASE_URL that is not a URL', () => {
    const error = configErrorOf({ DATABASE_URL: 'not a url' });

    expect(error.message).toBe('Invalid configuration: DATABASE_URL: must be a valid URL');
  });

  it('TC-7.2 names both PORT and NODE_ENV in one ConfigError', () => {
    const error = configErrorOf({ PORT: 'abc', NODE_ENV: 'staging', DATABASE_URL });

    expect(error.message).toMatch(/^Invalid configuration: /);
    expect(error.message).toContain('PORT: must be a whole number from 1 to 65535');
    expect(error.message).toContain('NODE_ENV: must be one of development, test, production');
    expect(error.message).not.toContain('\n');
  });

  it.each(['0', '65536', '30.5', ''])('TC-7.2 refuses PORT=%j', (PORT) => {
    const error = configErrorOf({ PORT, DATABASE_URL });

    expect(error.message).toBe(
      'Invalid configuration: PORT: must be a whole number from 1 to 65535',
    );
  });

  it('TC-7.3 uses the defaults when only DATABASE_URL is set', () => {
    const config = loadConfig({ DATABASE_URL });

    expect(config).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL,
      COOKIE_SECURE: false,
    });
    expect(config.WEB_DIST_DIR).toBeUndefined();
  });

  it('TC-7.3 coerces PORT from text and keeps only known settings', () => {
    const config = loadConfig({ DATABASE_URL, PORT: '4100', NODE_ENV: 'test', HOME: '/x' });

    expect(config).toEqual({ NODE_ENV: 'test', PORT: 4100, DATABASE_URL, COOKIE_SECURE: false });
  });
});

describe('loadConfig COOKIE_SECURE', () => {
  it.each([
    ['development', false],
    ['test', false],
    ['production', true],
  ] as const)('S02.1 AC14 defaults COOKIE_SECURE for NODE_ENV=%s to %s', (NODE_ENV, expected) => {
    expect(loadConfig({ DATABASE_URL, NODE_ENV }).COOKIE_SECURE).toBe(expected);
  });

  it('S02.1 AC14 lets COOKIE_SECURE override the default in both directions', () => {
    expect(
      loadConfig({ DATABASE_URL, NODE_ENV: 'production', COOKIE_SECURE: 'false' }).COOKIE_SECURE,
    ).toBe(false);
    expect(
      loadConfig({ DATABASE_URL, NODE_ENV: 'development', COOKIE_SECURE: 'true' }).COOKIE_SECURE,
    ).toBe(true);
  });

  it.each(['yes', '1', 'TRUE', ''])('S02.1 AC14 refuses COOKIE_SECURE=%j', (COOKIE_SECURE) => {
    const error = configErrorOf({ DATABASE_URL, COOKIE_SECURE });

    expect(error.message).toBe('Invalid configuration: COOKIE_SECURE: must be true or false');
  });
});

describe('loadConfig WEB_DIST_DIR', () => {
  const folders: string[] = [];

  /** A new folder in the system temp directory, deleted after each test. */
  function tempFolder(): string {
    const folder = mkdtempSync(join(tmpdir(), 'labsafe-web-dist-'));
    folders.push(folder);
    return folder;
  }

  afterEach(() => {
    for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
  });

  it('TC-3.1 refuses a folder without index.html and names WEB_DIST_DIR', () => {
    const folder = tempFolder();

    const error = configErrorOf({ DATABASE_URL, WEB_DIST_DIR: folder });

    expect(error.message).toBe(`Invalid configuration: WEB_DIST_DIR: no index.html in ${folder}`);
  });

  it('TC-3.1 refuses a folder that does not exist', () => {
    const folder = join(tempFolder(), 'missing');

    const error = configErrorOf({ DATABASE_URL, WEB_DIST_DIR: folder });

    expect(error.message).toBe(`Invalid configuration: WEB_DIST_DIR: no index.html in ${folder}`);
  });

  it('TC-3.1 refuses a folder whose index.html is a folder', () => {
    const folder = tempFolder();
    mkdtempSync(join(folder, 'index.html'));

    expect(() => loadConfig({ DATABASE_URL, WEB_DIST_DIR: folder })).toThrow(
      /WEB_DIST_DIR: no index\.html in /,
    );
  });

  it('TC-3.2 returns the absolute path of a folder with index.html', () => {
    const folder = tempFolder();
    writeFileSync(join(folder, 'index.html'), '<!doctype html>');

    expect(loadConfig({ DATABASE_URL, WEB_DIST_DIR: folder }).WEB_DIST_DIR).toBe(folder);
  });

  it('TC-3.2 resolves a relative path against the working directory', () => {
    const folder = tempFolder();
    writeFileSync(join(folder, 'index.html'), '<!doctype html>');

    const config = loadConfig({ DATABASE_URL, WEB_DIST_DIR: relative(process.cwd(), folder) });

    expect(config.WEB_DIST_DIR).toBe(folder);
  });
});

describe('loadConfig BOOTSTRAP_ADMIN_*', () => {
  const BOOTSTRAP = {
    BOOTSTRAP_ADMIN_EMAIL: '  Admin@Lab.TEST ',
    BOOTSTRAP_ADMIN_PASSWORD: 'admin-password-1',
    BOOTSTRAP_ADMIN_NAME: '  Lab Admin ',
  };

  it('S02.2 AC1 reads all three settings into BOOTSTRAP_ADMIN, email lower-cased, name trimmed', () => {
    const config = loadConfig({ DATABASE_URL, ...BOOTSTRAP });

    expect(config.BOOTSTRAP_ADMIN).toEqual({
      email: 'admin@lab.test',
      password: 'admin-password-1',
      name: 'Lab Admin',
    });
    expect(config).not.toHaveProperty('BOOTSTRAP_ADMIN_PASSWORD');
  });

  it('S02.2 AC2 leaves BOOTSTRAP_ADMIN undefined when none of the three is set', () => {
    expect(loadConfig({ DATABASE_URL }).BOOTSTRAP_ADMIN).toBeUndefined();
  });

  it.each([
    [['BOOTSTRAP_ADMIN_EMAIL'], ['BOOTSTRAP_ADMIN_PASSWORD', 'BOOTSTRAP_ADMIN_NAME']],
    [['BOOTSTRAP_ADMIN_PASSWORD'], ['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_NAME']],
    [['BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_NAME'], ['BOOTSTRAP_ADMIN_PASSWORD']],
  ] as const)(
    'S02.2 AC2 refuses %j alone in one line that names the missing %j',
    (given, missing) => {
      const env: NodeJS.ProcessEnv = { DATABASE_URL };
      for (const name of given) env[name] = BOOTSTRAP[name];

      const error = configErrorOf(env);

      expect(error.message).toBe(
        `Invalid configuration: ${missing
          .map((name) => `${name}: is required when any BOOTSTRAP_ADMIN_* setting is set`)
          .join('; ')}`,
      );
      expect(error.message).not.toContain('\n');
      expect(error.message).not.toContain(BOOTSTRAP.BOOTSTRAP_ADMIN_PASSWORD);
    },
  );

  it('S02.2 AC2 names a missing setting next to other bad settings', () => {
    const error = configErrorOf({ BOOTSTRAP_ADMIN_EMAIL: 'admin@lab.test' });

    expect(error.message).toContain('DATABASE_URL: is required');
    expect(error.message).toContain('BOOTSTRAP_ADMIN_PASSWORD: is required');
    expect(error.message).toContain('BOOTSTRAP_ADMIN_NAME: is required');
  });

  it('S02.2 AC2 checks the email, password and name with the sign-up rules', () => {
    const error = configErrorOf({
      DATABASE_URL,
      BOOTSTRAP_ADMIN_EMAIL: 'not-an-email',
      BOOTSTRAP_ADMIN_PASSWORD: 'short',
      BOOTSTRAP_ADMIN_NAME: '   ',
    });

    expect(error.message).toBe(
      'Invalid configuration: BOOTSTRAP_ADMIN_EMAIL: Enter a valid email address; ' +
        'BOOTSTRAP_ADMIN_PASSWORD: Password must be at least 8 characters; ' +
        'BOOTSTRAP_ADMIN_NAME: Enter your name',
    );
  });

  it('S02.2 AC2 never puts the password into the error message', () => {
    const password = 'x'.repeat(129);

    const error = configErrorOf({ DATABASE_URL, ...BOOTSTRAP, BOOTSTRAP_ADMIN_PASSWORD: password });

    expect(error.message).toBe(
      'Invalid configuration: BOOTSTRAP_ADMIN_PASSWORD: Password must be at most 128 characters',
    );
  });
});
