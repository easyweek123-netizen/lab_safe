import { CurrentUser } from '@labsafe/shared';
import { type INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigError } from '../src/common/config';
import { insertUser, TEST_PASSWORD, TEST_PASSWORD_HASH } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';

const ADMIN_EMAIL = 'first.admin@lab.test';
const ADMIN_PASSWORD = 'bootstrap-password-1';
const ADMIN_NAME = 'First Admin';

/** All three settings; the email in mixed case, as someone might type it. */
const BOOTSTRAP_ENV = {
  BOOTSTRAP_ADMIN_EMAIL: 'First.Admin@Lab.TEST',
  BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
  BOOTSTRAP_ADMIN_NAME: ADMIN_NAME,
};

/** Removes the settings from the shell's environment, so only each test's own settings count. */
function clearBootstrapSettings(): void {
  for (const name of Object.keys(BOOTSTRAP_ENV)) delete process.env[name];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  updated_at: Date;
}

describe('first admin from BOOTSTRAP_ADMIN_* at start-up', () => {
  const apps: INestApplication[] = [];
  const savedEnv = { ...process.env };

  /** Starts the real app with these settings; closed after each test. */
  async function start(env: Record<string, string>): Promise<INestApplication> {
    const app = await createTestApp(env);
    apps.push(app);
    return app;
  }

  async function stop(app: INestApplication): Promise<void> {
    apps.splice(apps.indexOf(app), 1);
    await app.close();
  }

  async function usersOf(app: INestApplication): Promise<UserRow[]> {
    return app
      .get(DataSource)
      .query(
        `SELECT id, name, email, password_hash, role, status, updated_at FROM users ORDER BY created_at, email`,
      );
  }

  function logIn(app: INestApplication, email: string, password: string) {
    return request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  }

  /** The warning calls of the bootstrap service. */
  function bootstrapWarnings(warn: { mock: { calls: unknown[][] } }): string[] {
    return warn.mock.calls
      .map((args) => String(args[0]))
      .filter((message) => message.includes('BOOTSTRAP_ADMIN'));
  }

  beforeEach(async () => {
    clearBootstrapSettings();
    await resetTables();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    for (const app of apps.splice(0)) await app.close();
    process.env = { ...savedEnv };
  });

  it('S02.2 AC1 creates exactly one APPROVED ADMIN that logs in with the configured password', async () => {
    const app = await start(BOOTSTRAP_ENV);

    const users = await usersOf(app);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      status: 'APPROVED',
    });
    expect(users[0]!.password_hash).toMatch(/^scrypt\$/);
    expect(users[0]!.password_hash).not.toContain(ADMIN_PASSWORD);

    const response = await logIn(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(response.status).toBe(200);
    expect(CurrentUser.parse(response.body)).toEqual({
      id: users[0]!.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      status: 'APPROVED',
    });
  });

  it('S02.2 AC1 adds nothing on a second start', async () => {
    const first = await start(BOOTSTRAP_ENV);
    const before = await usersOf(first);
    await stop(first);

    const second = await start(BOOTSTRAP_ENV);

    expect(await usersOf(second)).toEqual(before);
  });

  it('S02.2 AC1 changes nothing when an admin already exists', async () => {
    const setup = await start({});
    await insertUser(setup, {
      email: 'existing.admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    // The configured email has an account, but an admin exists: it must stay a contributor.
    await insertUser(setup, { email: ADMIN_EMAIL, status: 'PENDING' });
    const before = await usersOf(setup);
    await stop(setup);
    const warn = vi.spyOn(Logger.prototype, 'warn');

    const app = await start(BOOTSTRAP_ENV);

    expect(await usersOf(app)).toEqual(before);
    expect((await logIn(app, ADMIN_EMAIL, ADMIN_PASSWORD)).status).toBe(401);
    expect(bootstrapWarnings(warn)).toEqual([]);
  });

  it.each(['PENDING', 'REJECTED', 'APPROVED'] as const)(
    'S02.2 AC1 makes the existing %s account of the email an APPROVED ADMIN and keeps its password',
    async (status) => {
      const setup = await start({});
      const id = await insertUser(setup, { name: 'Sara Lab', email: ADMIN_EMAIL, status });
      await insertUser(setup, { email: 'other@lab.test', status: 'PENDING' });
      const [before] = (await usersOf(setup)).filter((user) => user.id === id);
      await stop(setup);

      const app = await start(BOOTSTRAP_ENV);

      const users = await usersOf(app);
      expect(users).toHaveLength(2);
      const after = users.find((user) => user.id === id);
      expect(after).toMatchObject({
        name: 'Sara Lab',
        email: ADMIN_EMAIL,
        password_hash: TEST_PASSWORD_HASH,
        role: 'ADMIN',
        status: 'APPROVED',
      });
      expect(after!.updated_at.getTime()).toBeGreaterThan(before!.updated_at.getTime());
      expect(users.find((user) => user.id !== id)).toMatchObject({
        role: 'CONTRIBUTOR',
        status: 'PENDING',
      });
      expect((await logIn(app, ADMIN_EMAIL, TEST_PASSWORD)).body).toMatchObject({
        id,
        role: 'ADMIN',
        status: 'APPROVED',
      });
      expect((await logIn(app, ADMIN_EMAIL, ADMIN_PASSWORD)).status).toBe(401);
    },
  );

  it('S02.2 AC2 refuses to start with only some settings and names the missing ones in one line', async () => {
    const attempt = createTestApp({
      BOOTSTRAP_ADMIN_EMAIL: ADMIN_EMAIL,
      BOOTSTRAP_ADMIN_PASSWORD: ADMIN_PASSWORD,
    });

    await expect(attempt).rejects.toBeInstanceOf(ConfigError);
    await expect(attempt).rejects.toThrow(
      /^Invalid configuration: BOOTSTRAP_ADMIN_NAME: is required when any BOOTSTRAP_ADMIN_\* setting is set$/,
    );
  });

  it('S02.2 AC2 starts without settings and no admin, creates nobody and logs one warning without secrets', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn');

    const app = await start({});

    expect(await usersOf(app)).toEqual([]);
    const warnings = bootstrapWarnings(warn);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).not.toMatch(/password\s*[:=]/i);
    const health = await request(app.getHttpServer()).get('/api/health');
    expect(health.status).toBe(200);
  });

  it('S02.2 AC2 logs no warning without settings when an admin exists', async () => {
    const setup = await start({});
    await insertUser(setup, {
      email: 'existing.admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    await stop(setup);
    const warn = vi.spyOn(Logger.prototype, 'warn');

    await start({});

    expect(bootstrapWarnings(warn)).toEqual([]);
  });

  it('S02.2 AC1 never logs the configured password or email', async () => {
    const spies = (['log', 'warn', 'error', 'debug', 'verbose'] as const).map((method) =>
      vi.spyOn(Logger.prototype, method),
    );

    await start(BOOTSTRAP_ENV);

    const logged = spies.flatMap((spy) => spy.mock.calls.flat().map(String)).join('\n');
    expect(logged).not.toContain(ADMIN_PASSWORD);
    expect(logged.toLowerCase()).not.toContain(ADMIN_EMAIL);
  });
});
