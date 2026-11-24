import { CurrentUser, ErrorResponse, SessionResponse } from '@labsafe/shared';
import { Controller, Get, type INestApplication, Post } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createSignedInUser,
  insertUser,
  sessionCookieOf,
  sessionSetCookie,
  signIn,
  TEST_PASSWORD,
} from './auth-helpers';
import { createTestApp } from './helpers';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SCRYPT_HASH = /^scrypt\$\d+\$\d+\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/;
const CLEARED = /^labsafe_session=;.*Expires=Thu, 01 Jan 1970 00:00:00 GMT/;

/** A route without an access level, mounted only in this test app (S02.1 AC11). */
@Controller('test-undeclared')
class UndeclaredController {
  @Get()
  read(): { ok: true } {
    return { ok: true };
  }

  @Post()
  write(): { ok: true } {
    return { ok: true };
  }
}

describe('/api/auth endpoints', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    // Explicit, so a `COOKIE_SECURE` in the shell can never change what the tests see.
    app = await createTestApp({ COOKIE_SECURE: 'false' }, [UndeclaredController]);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function countUsers(email?: string): Promise<number> {
    const rows: { count: string }[] = email
      ? await dataSource.query(`SELECT count(*) FROM users WHERE email = $1`, [email])
      : await dataSource.query(`SELECT count(*) FROM users`);
    return Number(rows[0]!.count);
  }

  async function countSessions(): Promise<number> {
    const rows: { count: string }[] = await dataSource.query(`SELECT count(*) FROM sessions`);
    return Number(rows[0]!.count);
  }

  async function me(cookie?: string): Promise<request.Response> {
    const call = http().get('/api/auth/me');
    return cookie ? call.set('Cookie', cookie) : call;
  }

  describe('POST /api/auth/signup', () => {
    it('S02.1 AC1 creates a PENDING CONTRIBUTOR, answers 201 CurrentUser and signs the person in', async () => {
      const response = await http()
        .post('/api/auth/signup')
        .send({ name: '  Sara Novak ', email: 'ac1@lab.test', password: 'long-enough' });

      expect(response.status).toBe(201);
      const user = CurrentUser.strict().parse(response.body);
      expect(user).toEqual({
        id: expect.stringMatching(UUID) as string,
        name: 'Sara Novak',
        email: 'ac1@lab.test',
        role: 'CONTRIBUTOR',
        status: 'PENDING',
      });
      const cookie = sessionCookieOf(response);

      const session = await me(cookie);
      expect(session.status).toBe(200);
      expect(SessionResponse.parse(session.body)).toEqual({ user });

      const rows: { user_id: string }[] = await dataSource.query(
        `SELECT user_id FROM sessions WHERE user_id = $1`,
        [user.id],
      );
      expect(rows).toHaveLength(1);
    });

    it('S02.1 AC2 answers 400 VALIDATION_FAILED with one field entry per problem and creates nothing', async () => {
      const usersBefore = await countUsers();
      const sessionsBefore = await countSessions();

      const response = await http()
        .post('/api/auth/signup')
        .send({ name: '', email: 'not-an-email', password: 'short' });

      expect(response.status).toBe(400);
      const body = ErrorResponse.parse(response.body);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.fields).toEqual([
        { path: 'name', message: 'Enter your name' },
        { path: 'email', message: 'Enter a valid email address' },
        { path: 'password', message: 'Password must be at least 8 characters' },
      ]);
      expect(sessionSetCookie(response)).toBeUndefined();
      expect(await countUsers()).toBe(usersBefore);
      expect(await countSessions()).toBe(sessionsBefore);
    });

    it.each([
      [{ name: 'x'.repeat(101) }, 'name', 'Name must be at most 100 characters'],
      [{ name: '   ' }, 'name', 'Enter your name'],
      [{ password: 'x'.repeat(7) }, 'password', 'Password must be at least 8 characters'],
      [{ password: 'x'.repeat(129) }, 'password', 'Password must be at most 128 characters'],
      [{ email: 'sara@' }, 'email', 'Enter a valid email address'],
    ])('S02.1 AC2 refuses %j with one field entry', async (change, path, message) => {
      const usersBefore = await countUsers();

      const response = await http()
        .post('/api/auth/signup')
        .send({ name: 'Sara', email: 'ac2-limits@lab.test', password: 'long-enough', ...change });

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).fields).toEqual([{ path, message }]);
      expect(await countUsers()).toBe(usersBefore);
    });

    it('S02.1 AC2 accepts the limits: a 100-character name and 8- and 128-character passwords', async () => {
      for (const [index, password] of ['x'.repeat(8), 'x'.repeat(128)].entries()) {
        const response = await http()
          .post('/api/auth/signup')
          .send({ name: 'n'.repeat(100), email: `ac2-ok-${index}@lab.test`, password });
        expect(response.status).toBe(201);
      }
    });

    it('S02.1 AC3 answers 409 EMAIL_TAKEN for the same email in another letter case', async () => {
      await insertUser(app, { email: 'sara@lab.test' });
      const sessionsBefore = await countSessions();

      const response = await http()
        .post('/api/auth/signup')
        .send({ name: 'Other Sara', email: 'Sara@Lab.TEST', password: 'long-enough' });

      expect(response.status).toBe(409);
      expect(ErrorResponse.parse(response.body)).toEqual({
        statusCode: 409,
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
        fields: [{ path: 'email', message: 'An account with this email already exists' }],
      });
      expect(sessionSetCookie(response)).toBeUndefined();
      expect(await countUsers('sara@lab.test')).toBe(1);
      expect(await countSessions()).toBe(sessionsBefore);
    });

    it('S02.1 AC4 ignores role and status in the body: the account is still a PENDING CONTRIBUTOR', async () => {
      const response = await http().post('/api/auth/signup').send({
        name: 'Mallory',
        email: 'ac4@lab.test',
        password: 'long-enough',
        role: 'ADMIN',
        status: 'APPROVED',
      });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ role: 'CONTRIBUTOR', status: 'PENDING' });
      const rows: { role: string; status: string }[] = await dataSource.query(
        `SELECT role, status FROM users WHERE email = $1`,
        ['ac4@lab.test'],
      );
      expect(rows).toEqual([{ role: 'CONTRIBUTOR', status: 'PENDING' }]);
    });
  });

  describe('POST /api/auth/login', () => {
    it('S02.1 AC5 logs in with the right password and the email in any letter case', async () => {
      const id = await insertUser(app, { name: 'Lena', email: 'ac5@lab.test', status: 'APPROVED' });

      const response = await http()
        .post('/api/auth/login')
        .send({ email: '  AC5@Lab.Test ', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      const user = CurrentUser.strict().parse(response.body);
      expect(user).toEqual({
        id,
        name: 'Lena',
        email: 'ac5@lab.test',
        role: 'CONTRIBUTOR',
        status: 'APPROVED',
      });
      const session = await me(sessionCookieOf(response));
      expect(SessionResponse.parse(session.body)).toEqual({ user });
    });

    it('S02.1 AC5 lets PENDING and REJECTED accounts log in (E02-D4)', async () => {
      for (const status of ['PENDING', 'REJECTED'] as const) {
        const email = `ac5-${status.toLowerCase()}@lab.test`;
        await insertUser(app, { email, status });
        const response = await http()
          .post('/api/auth/login')
          .send({ email, password: TEST_PASSWORD });
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ status });
      }
    });

    it('S02.1 AC5 deletes the user’s expired sessions and replaces the request’s old session', async () => {
      const { id, cookie: oldCookie } = await createSignedInUser(app, {
        email: 'ac5-tidy@lab.test',
      });
      await createSignedInUser(app, { email: 'ac5-other@lab.test' });
      const otherSessions = await countSessions();
      await dataSource.query(
        `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('expired-hash', $1, now() - interval '1 day')`,
        [id],
      );

      const response = await http()
        .post('/api/auth/login')
        .set('Cookie', oldCookie)
        .send({ email: 'ac5-tidy@lab.test', password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      const newCookie = sessionCookieOf(response);
      expect(newCookie).not.toBe(oldCookie);
      const rows: { token_hash: string }[] = await dataSource.query(
        `SELECT token_hash FROM sessions WHERE user_id = $1`,
        [id],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.token_hash).not.toBe('expired-hash');
      expect(await countSessions()).toBe(otherSessions);
      expect(SessionResponse.parse((await me(oldCookie)).body).user).toBeNull();
      expect(SessionResponse.parse((await me(newCookie)).body).user).toMatchObject({ id });
    });

    it('S02.1 AC6 answers 401 INVALID_CREDENTIALS, the same for a wrong password and an unknown email, and sets no cookie', async () => {
      await insertUser(app, { email: 'ac6@lab.test' });
      const sessionsBefore = await countSessions();

      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: 'ac6@lab.test', password: 'wrong-password' });
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: 'nobody@lab.test', password: TEST_PASSWORD });

      for (const response of [wrongPassword, unknownEmail]) {
        expect(response.status).toBe(401);
        expect(ErrorResponse.parse(response.body)).toEqual({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is wrong',
        });
        expect(response.headers['set-cookie']).toBeUndefined();
      }
      expect(await countSessions()).toBe(sessionsBefore);
    });

    it('S02.1 AC6 answers 400 VALIDATION_FAILED for an empty password or a bad email', async () => {
      const response = await http().post('/api/auth/login').send({ email: 'x', password: '' });

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'email', message: 'Enter a valid email address' },
        { path: 'password', message: 'Enter your password' },
      ]);
      expect(response.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('S02.1 AC7 deletes the session, clears the cookie, and the old cookie is then anonymous', async () => {
      const { id, cookie } = await createSignedInUser(app, { email: 'ac7@lab.test' });

      const response = await http().post('/api/auth/logout').set('Cookie', cookie).send({});

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      const cleared = sessionSetCookie(response);
      expect(cleared).toMatch(CLEARED);
      expect(cleared).toContain('Path=/');
      expect(cleared).toContain('HttpOnly');
      expect(cleared).toContain('SameSite=Lax');
      const rows: unknown[] = await dataSource.query(`SELECT 1 FROM sessions WHERE user_id = $1`, [
        id,
      ]);
      expect(rows).toEqual([]);

      const replay = await me(cookie);
      expect(replay.status).toBe(200);
      expect(SessionResponse.parse(replay.body)).toEqual({ user: null });

      const again = await http().post('/api/auth/logout').set('Cookie', cookie).send({});
      expect(again.status).toBe(401);
    });

    it('S02.1 AC7 logs out only the session of the request', async () => {
      const { cookie: first } = await createSignedInUser(app, { email: 'ac7-two@lab.test' });
      const second = await signIn(app, 'ac7-two@lab.test');

      await http().post('/api/auth/logout').set('Cookie', first).send({}).expect(204);

      expect(SessionResponse.parse((await me(second)).body).user).toMatchObject({
        email: 'ac7-two@lab.test',
      });
    });

    it('S02.1 AC11 answers 401 UNAUTHENTICATED without a session', async () => {
      const response = await http().post('/api/auth/logout').send({});

      expect(response.status).toBe(401);
      expect(ErrorResponse.parse(response.body)).toMatchObject({ code: 'UNAUTHENTICATED' });
    });

    it('S02.1 AC11 runs the origin check before the access check: text/plain without a session is 403, not 401', async () => {
      const response = await http()
        .post('/api/auth/logout')
        .set('Content-Type', 'text/plain')
        .send('{}');

      expect(response.status).toBe(403);
      expect(ErrorResponse.parse(response.body)).toMatchObject({ code: 'FORBIDDEN' });
    });

    it('S02.1 AC12 refuses a logout from another origin with 403 and keeps the session', async () => {
      const { cookie } = await createSignedInUser(app, { email: 'ac12-logout@lab.test' });

      const response = await http()
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .set('Origin', 'https://evil.example')
        .send({});

      expect(response.status).toBe(403);
      expect(SessionResponse.parse((await me(cookie)).body).user).not.toBeNull();
    });
  });

  describe('GET /api/auth/me', () => {
    it('S02.1 AC11 answers {user: null} to an anonymous caller and sets no cookie', async () => {
      const response = await me();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: null });
      expect(response.headers['set-cookie']).toBeUndefined();
    });

    it('S02.1 AC11 treats an unknown session cookie as anonymous and clears it', async () => {
      const response = await me('labsafe_session=not-a-real-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: null });
      expect(sessionSetCookie(response)).toMatch(CLEARED);
    });

    it('S02.1 AC11 treats an expired session as anonymous and clears the cookie', async () => {
      const { id, cookie } = await createSignedInUser(app, { email: 'ac11-expired@lab.test' });
      await dataSource.query(
        `UPDATE sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1`,
        [id],
      );

      const response = await me(cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: null });
      expect(sessionSetCookie(response)).toMatch(CLEARED);

      const logout = await http().post('/api/auth/logout').set('Cookie', cookie).send({});
      expect(logout.status).toBe(401);
    });

    it('S02.1 AC10 returns the new status and role after a change in the database, without a new login', async () => {
      const { id, cookie } = await createSignedInUser(app, { email: 'ac10@lab.test' });
      expect((await me(cookie)).body).toMatchObject({ user: { status: 'PENDING' } });

      await dataSource.query(`UPDATE users SET status = 'APPROVED' WHERE id = $1`, [id]);
      expect((await me(cookie)).body).toMatchObject({
        user: { role: 'CONTRIBUTOR', status: 'APPROVED' },
      });

      await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [id]);
      expect((await me(cookie)).body).toMatchObject({
        user: { role: 'ADMIN', status: 'APPROVED' },
      });

      await dataSource.query(
        `UPDATE users SET role = 'CONTRIBUTOR', status = 'REJECTED' WHERE id = $1`,
        [id],
      );
      expect((await me(cookie)).body).toMatchObject({
        user: { role: 'CONTRIBUTOR', status: 'REJECTED' },
      });
    });
  });

  describe('a route without an access level', () => {
    it('S02.1 AC11 refuses every caller with 403 FORBIDDEN, including an admin', async () => {
      const callers: (string | undefined)[] = [undefined];
      for (const [status, role] of [
        ['PENDING', 'CONTRIBUTOR'],
        ['APPROVED', 'CONTRIBUTOR'],
        ['APPROVED', 'ADMIN'],
      ] as const) {
        const { cookie } = await createSignedInUser(app, {
          email: `ac11-${role.toLowerCase()}-${status.toLowerCase()}@lab.test`,
          role,
          status,
        });
        callers.push(cookie);
      }

      for (const cookie of callers) {
        const read = http().get('/api/test-undeclared');
        const readResponse = await (cookie ? read.set('Cookie', cookie) : read);
        const write = http().post('/api/test-undeclared');
        const writeResponse = await (cookie ? write.set('Cookie', cookie) : write).send({});
        for (const response of [readResponse, writeResponse]) {
          expect(response.status).toBe(403);
          expect(ErrorResponse.parse(response.body)).toMatchObject({ code: 'FORBIDDEN' });
        }
      }
    });
  });

  describe('cross-site requests', () => {
    for (const path of ['/api/auth/signup', '/api/auth/login']) {
      it(`S02.1 AC12 refuses POST ${path} with a foreign Origin: 403, no account, no session`, async () => {
        // Login gets an existing account, sign-up a new email: both would succeed without the check.
        const email = `ac12-origin${path.replaceAll('/', '-')}@lab.test`;
        if (path.endsWith('login')) await insertUser(app, { email });
        const usersBefore = await countUsers();
        const sessionsBefore = await countSessions();

        const response = await http()
          .post(path)
          .set('Origin', 'https://evil.example')
          .send({ name: 'Eve', email, password: TEST_PASSWORD });

        expect(response.status).toBe(403);
        expect(ErrorResponse.parse(response.body)).toMatchObject({ code: 'FORBIDDEN' });
        expect(response.headers['set-cookie']).toBeUndefined();
        expect(await countUsers()).toBe(usersBefore);
        expect(await countSessions()).toBe(sessionsBefore);
      });

      it(`S02.1 AC12 refuses POST ${path} sent as text/plain: 403, no account, no session`, async () => {
        const usersBefore = await countUsers();
        const sessionsBefore = await countSessions();

        const response = await http()
          .post(path)
          .set('Content-Type', 'text/plain')
          .send(
            JSON.stringify({ name: 'Eve', email: 'ac12-plain@lab.test', password: TEST_PASSWORD }),
          );

        expect(response.status).toBe(403);
        expect(ErrorResponse.parse(response.body)).toMatchObject({ code: 'FORBIDDEN' });
        expect(response.headers['set-cookie']).toBeUndefined();
        expect(await countUsers()).toBe(usersBefore);
        expect(await countSessions()).toBe(sessionsBefore);
      });
    }

    it('S02.1 AC12 accepts a sign-up whose Origin is the app’s own host', async () => {
      const response = await http()
        .post('/api/auth/signup')
        .set('Host', 'labsafe.test:4100')
        .set('Origin', 'http://labsafe.test:4100')
        .send({ name: 'Own', email: 'ac12-own@lab.test', password: 'long-enough' });

      expect(response.status).toBe(201);
    });
  });

  describe('passwords never leave the server', () => {
    it('S02.1 AC13 stores two different scrypt hashes for the same password, neither containing it', async () => {
      const password = 'same-password-twice';
      for (const email of ['ac13-a@lab.test', 'ac13-b@lab.test']) {
        await http().post('/api/auth/signup').send({ name: 'Twin', email, password }).expect(201);
      }

      const rows: { password_hash: string }[] = await dataSource.query(
        `SELECT password_hash FROM users WHERE email IN ('ac13-a@lab.test', 'ac13-b@lab.test')`,
      );
      expect(rows).toHaveLength(2);
      const [first, second] = rows.map((row) => row.password_hash) as [string, string];
      expect(first).toMatch(SCRYPT_HASH);
      expect(second).toMatch(SCRYPT_HASH);
      expect(first).not.toBe(second);
      expect(first).not.toContain(password);
      expect(second).not.toContain(password);
    });

    it('S02.1 AC13 returns neither the password nor the hash from sign-up, login or me', async () => {
      const password = 'scan-this-password';
      const signUp = await http()
        .post('/api/auth/signup')
        .send({ name: 'Scan', email: 'ac13-scan@lab.test', password });
      const login = await http()
        .post('/api/auth/login')
        .send({ email: 'ac13-scan@lab.test', password });
      const session = await me(sessionCookieOf(login));
      const rows: { password_hash: string }[] = await dataSource.query(
        `SELECT password_hash FROM users WHERE email = 'ac13-scan@lab.test'`,
      );
      const hash = rows[0]!.password_hash;

      expect([signUp.status, login.status, session.status]).toEqual([201, 200, 200]);
      for (const response of [signUp, login, session]) {
        expect(response.text).not.toContain(password);
        expect(response.text).not.toContain(hash);
        expect(response.text).not.toContain(hash.split('$')[5]!);
        expect(response.text.toLowerCase()).not.toContain('password');
        expect(response.text.toLowerCase()).not.toContain('hash');
      }
      expect(Object.keys(signUp.body as object).sort()).toEqual([
        'email',
        'id',
        'name',
        'role',
        'status',
      ]);
    });
  });

  describe('cookie and table shape', () => {
    it('S02.1 AC14 sets exactly one cookie, labsafe_session, HttpOnly, SameSite=Lax, Path=/, for 7 days', async () => {
      await insertUser(app, { email: 'ac14@lab.test' });

      const response = await http()
        .post('/api/auth/login')
        .send({ email: 'ac14@lab.test', password: TEST_PASSWORD });

      const header: unknown = response.headers['set-cookie'];
      expect(Array.isArray(header) ? header : [header]).toHaveLength(1);
      const cookie = sessionSetCookie(response)!;
      const [pair, ...attributes] = cookie.split(';').map((part) => part.trim());
      expect(pair).toMatch(/^labsafe_session=[A-Za-z0-9_-]{43}$/);
      expect(attributes).toEqual(
        expect.arrayContaining(['Max-Age=604800', 'Path=/', 'HttpOnly', 'SameSite=Lax']),
      );
      expect(attributes).not.toContain('Secure');
    });

    it('S02.1 AC14 has only the NFR5 columns in users', async () => {
      const rows: { column_name: string }[] = await dataSource.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' ORDER BY column_name`,
      );

      expect(rows.map((row) => row.column_name)).toEqual([
        'created_at',
        'email',
        'id',
        'name',
        'password_hash',
        'role',
        'status',
        'updated_at',
      ]);
    });

    it('S02.1 AC14 the User and Session entities match the migrated tables (no pending schema change)', async () => {
      const pending = await dataSource.driver.createSchemaBuilder().log();

      expect(pending.upQueries.map(({ query }) => query)).toEqual([]);
    });
  });
});

describe('/api/auth with COOKIE_SECURE=true', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'true' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('S02.1 AC14 marks the session cookie Secure, also when it is cleared', async () => {
    await insertUser(app, { email: 'ac14-secure@lab.test' });

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ac14-secure@lab.test', password: TEST_PASSWORD });
    expect(sessionSetCookie(login)).toContain('; Secure');

    const logout = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', sessionCookieOf(login))
      .send({});
    expect(logout.status).toBe(204);
    expect(sessionSetCookie(logout)).toContain('; Secure');
  });
});
