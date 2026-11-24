import {
  AdminUser,
  AdminUserList,
  type AccountStatus,
  ErrorResponse,
  type Role,
  SessionResponse,
} from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser, insertUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const ALREADY_HANDLED = 'This sign-up was already handled.';

type Action = 'approve' | 'reject';

interface UserRow {
  status: AccountStatus;
  role: Role;
  updated_at: Date;
}

describe('/api/admin/users sign-up review', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminCookie: string;

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'false' });
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // Every test starts from empty tables and one signed-in admin.
  beforeEach(async () => {
    await resetTables();
    ({ cookie: adminCookie } = await createSignedInUser(app, {
      name: 'Ada Admin',
      email: 'admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    }));
  });

  const http = () => request(app.getHttpServer());

  function list(cookie: string | undefined, query: string = '?status=PENDING'): request.Test {
    const call = http().get(`/api/admin/users${query}`);
    return cookie ? call.set('Cookie', cookie) : call;
  }

  function act(action: Action, id: string, cookie: string | undefined): request.Test {
    const call = http().post(`/api/admin/users/${id}/${action}`);
    return (cookie ? call.set('Cookie', cookie) : call).send({});
  }

  async function rowOf(id: string): Promise<UserRow> {
    const rows: UserRow[] = await dataSource.query(
      `SELECT status, role, updated_at FROM users WHERE id = $1`,
      [id],
    );
    return rows[0]!;
  }

  async function setCreatedAt(id: string, createdAt: string): Promise<void> {
    await dataSource.query(`UPDATE users SET created_at = $2 WHERE id = $1`, [id, createdAt]);
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  describe('GET /api/admin/users?status=PENDING', () => {
    it('S02.2 AC4 lists only the pending accounts, oldest first, as AdminUserList', async () => {
      const newest = await insertUser(app, { name: 'Cleo New', email: 'cleo@lab.test' });
      const oldest = await insertUser(app, { name: 'Anna Old', email: 'anna@lab.test' });
      const middle = await insertUser(app, { name: 'Ben Mid', email: 'ben@lab.test' });
      const approved = await insertUser(app, { email: 'ok@lab.test', status: 'APPROVED' });
      const rejected = await insertUser(app, { email: 'no@lab.test', status: 'REJECTED' });
      await setCreatedAt(newest, '2026-11-24T12:00:00.000Z');
      await setCreatedAt(oldest, '2026-11-20T08:15:00.000Z');
      await setCreatedAt(middle, '2026-11-22T10:00:00.000Z');
      await setCreatedAt(approved, '2026-11-01T00:00:00.000Z');
      await setCreatedAt(rejected, '2026-11-01T00:00:00.000Z');

      const response = await list(adminCookie);

      expect(response.status).toBe(200);
      const body = AdminUserList.strict().parse(response.body);
      expect(body.users).toEqual([
        {
          id: oldest,
          name: 'Anna Old',
          email: 'anna@lab.test',
          role: 'CONTRIBUTOR',
          status: 'PENDING',
          createdAt: '2026-11-20T08:15:00.000Z',
        },
        {
          id: middle,
          name: 'Ben Mid',
          email: 'ben@lab.test',
          role: 'CONTRIBUTOR',
          status: 'PENDING',
          createdAt: '2026-11-22T10:00:00.000Z',
        },
        {
          id: newest,
          name: 'Cleo New',
          email: 'cleo@lab.test',
          role: 'CONTRIBUTOR',
          status: 'PENDING',
          createdAt: '2026-11-24T12:00:00.000Z',
        },
      ]);
      for (const user of response.body.users as unknown[]) AdminUser.strict().parse(user);
      expect(JSON.stringify(response.body)).not.toMatch(/password|hash|scrypt/i);
    });

    it('S02.2 AC4 orders accounts with the same sign-up time by id', async () => {
      const ids = [
        await insertUser(app, { email: 'p1@lab.test' }),
        await insertUser(app, { email: 'p2@lab.test' }),
        await insertUser(app, { email: 'p3@lab.test' }),
      ];
      for (const id of ids) await setCreatedAt(id, '2026-11-24T09:00:00.000Z');

      const response = await list(adminCookie);

      expect(response.status).toBe(200);
      const body = AdminUserList.parse(response.body);
      expect(body.users.map((user) => user.id)).toEqual([...ids].sort());
    });

    it('S02.2 AC4 answers an empty list when nobody is waiting', async () => {
      await insertUser(app, { email: 'ok@lab.test', status: 'APPROVED' });

      const response = await list(adminCookie);

      expect(response.status).toBe(200);
      expect(AdminUserList.strict().parse(response.body)).toEqual({ users: [] });
    });

    it.each([
      ['no status', ''],
      ['status REJECTED', '?status=REJECTED'],
      ['a lower-case status', '?status=pending'],
      ['a repeated status', '?status=PENDING&status=PENDING'],
    ])('S02.2 AC8 refuses %s with 400 VALIDATION_FAILED', async (_label, query) => {
      const response = await list(adminCookie, query);

      expectError(response, 400, 'VALIDATION_FAILED');
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'status', message: expect.any(String) as string },
      ]);
    });
  });

  describe('POST /api/admin/users/:id/approve', () => {
    it('S02.2 AC6 approves a pending sign-up with 200 AdminUser and the person is approved at their next request', async () => {
      const person = await createSignedInUser(app, { name: 'Sara Novak', email: 'sara@lab.test' });
      await setCreatedAt(person.id, '2026-11-24T09:30:00.000Z');

      const response = await act('approve', person.id, adminCookie);

      expect(response.status).toBe(200);
      expect(AdminUser.strict().parse(response.body)).toEqual({
        id: person.id,
        name: 'Sara Novak',
        email: 'sara@lab.test',
        role: 'CONTRIBUTOR',
        status: 'APPROVED',
        createdAt: '2026-11-24T09:30:00.000Z',
      });
      expect(await rowOf(person.id)).toMatchObject({ status: 'APPROVED', role: 'CONTRIBUTOR' });

      // The person's existing session, no new login.
      const me = await http().get('/api/auth/me').set('Cookie', person.cookie);
      expect(me.status).toBe(200);
      expect(SessionResponse.parse(me.body).user).toMatchObject({
        id: person.id,
        status: 'APPROVED',
      });

      const pending = AdminUserList.parse((await list(adminCookie)).body);
      expect(pending.users.map((user) => user.id)).not.toContain(person.id);
    });

    it('S02.2 AC6 moves updated_at forward', async () => {
      const id = await insertUser(app, { email: 'sara@lab.test' });
      await dataSource.query(`UPDATE users SET updated_at = '2026-01-01T00:00:00Z' WHERE id = $1`, [
        id,
      ]);

      expect((await act('approve', id, adminCookie)).status).toBe(200);

      expect((await rowOf(id)).updated_at.getTime()).toBeGreaterThan(
        new Date('2026-01-01T00:00:00Z').getTime(),
      );
    });
  });

  describe('POST /api/admin/users/:id/reject', () => {
    it('S02.2 AC7 rejects a pending sign-up with 200 AdminUser; the person is rejected at their next request and cannot sign up again', async () => {
      const person = await createSignedInUser(app, { name: 'Rex Ray', email: 'rex@lab.test' });

      const response = await act('reject', person.id, adminCookie);

      expect(response.status).toBe(200);
      expect(AdminUser.strict().parse(response.body)).toMatchObject({
        id: person.id,
        name: 'Rex Ray',
        email: 'rex@lab.test',
        role: 'CONTRIBUTOR',
        status: 'REJECTED',
      });
      expect(await rowOf(person.id)).toMatchObject({ status: 'REJECTED' });

      const me = await http().get('/api/auth/me').set('Cookie', person.cookie);
      expect(SessionResponse.parse(me.body).user).toMatchObject({ status: 'REJECTED' });

      const signUpAgain = await http()
        .post('/api/auth/signup')
        .send({ name: 'Rex Ray', email: 'Rex@Lab.test', password: 'long-enough' });
      expectError(signUpAgain, 409, 'EMAIL_TAKEN');
      expect(ErrorResponse.parse(signUpAgain.body).message).toBe(
        'An account with this email already exists',
      );

      const pending = AdminUserList.parse((await list(adminCookie)).body);
      expect(pending.users.map((user) => user.id)).not.toContain(person.id);
    });
  });

  describe.each<Action>(['approve', 'reject'])('POST /api/admin/users/:id/%s errors', (action) => {
    it.each<AccountStatus>(['APPROVED', 'REJECTED'])(
      `S02.2 AC8 ${action}: an account that is %s gives 409 USER_NOT_PENDING and stays unchanged`,
      async (status) => {
        const id = await insertUser(app, { email: 'done@lab.test', status });
        const before = await rowOf(id);

        const response = await act(action, id, adminCookie);

        expectError(response, 409, 'USER_NOT_PENDING');
        expect(ErrorResponse.parse(response.body).message).toBe(ALREADY_HANDLED);
        expect(await rowOf(id)).toEqual(before);
      },
    );

    it(`S02.2 AC8 ${action}: an admin account gives 409 USER_NOT_PENDING and stays unchanged`, async () => {
      const id = await insertUser(app, {
        email: 'other.admin@lab.test',
        role: 'ADMIN',
        status: 'APPROVED',
      });
      const before = await rowOf(id);

      expectError(await act(action, id, adminCookie), 409, 'USER_NOT_PENDING');
      expect(await rowOf(id)).toEqual(before);
    });

    it(`S02.2 AC8 ${action}: a sign-up another admin handled a moment earlier gives 409 USER_NOT_PENDING`, async () => {
      const id = await insertUser(app, { email: 'race@lab.test' });
      const other = action === 'approve' ? 'reject' : 'approve';

      expect((await act(other, id, adminCookie)).status).toBe(200);
      const handled = await rowOf(id);

      expectError(await act(action, id, adminCookie), 409, 'USER_NOT_PENDING');
      expect(await rowOf(id)).toEqual(handled);
    });

    it(`S02.2 AC8 ${action}: two calls at the same moment give one 200 and one 409`, async () => {
      const id = await insertUser(app, { email: 'race@lab.test' });

      const responses = await Promise.all([
        act(action, id, adminCookie),
        act(action, id, adminCookie),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    });

    it(`S02.2 AC8 ${action}: an unknown id gives 404 NOT_FOUND`, async () => {
      expectError(await act(action, UNKNOWN_ID, adminCookie), 404, 'NOT_FOUND');
    });

    it.each(['not-a-uuid', '123', `${UNKNOWN_ID}x`])(
      `S02.2 AC8 ${action}: the id %j gives 400 VALIDATION_FAILED`,
      async (id) => {
        const response = await act(action, id, adminCookie);

        expectError(response, 400, 'VALIDATION_FAILED');
        expect(ErrorResponse.parse(response.body).fields).toEqual([
          { path: 'id', message: expect.any(String) as string },
        ]);
      },
    );
  });

  describe('S02.2 AC9 refused callers', () => {
    const callers = [
      { label: 'an anonymous visitor', status: 401, code: 'UNAUTHENTICATED', account: undefined },
      { label: 'a pending account', status: 403, code: 'FORBIDDEN', account: 'PENDING' },
      { label: 'a rejected account', status: 403, code: 'FORBIDDEN', account: 'REJECTED' },
      { label: 'an approved contributor', status: 403, code: 'FORBIDDEN', account: 'APPROVED' },
    ] as const;

    const endpoints = [
      { label: 'GET /api/admin/users?status=PENDING', action: undefined },
      { label: 'POST /api/admin/users/:id/approve', action: 'approve' },
      { label: 'POST /api/admin/users/:id/reject', action: 'reject' },
    ] as const;

    const matrix = callers.flatMap((caller) => endpoints.map((endpoint) => ({ caller, endpoint })));

    it.each(matrix)(
      'S02.2 AC9 $caller.label calling $endpoint.label gets $caller.status $caller.code and the target is unchanged',
      async ({ caller, endpoint }) => {
        const target = await insertUser(app, { name: 'Tia Target', email: 'target@lab.test' });
        const before = await rowOf(target);
        const cookie =
          caller.account === undefined
            ? undefined
            : (
                await createSignedInUser(app, {
                  email: 'caller@lab.test',
                  role: 'CONTRIBUTOR',
                  status: caller.account,
                })
              ).cookie;

        const response =
          endpoint.action === undefined
            ? await list(cookie)
            : await act(endpoint.action, target, cookie);

        expectError(response, caller.status, caller.code);
        expect(JSON.stringify(response.body)).not.toContain('target@lab.test');
        expect(await rowOf(target)).toEqual(before);
      },
    );
  });
});
