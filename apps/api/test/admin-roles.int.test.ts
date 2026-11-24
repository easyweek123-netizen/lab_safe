import {
  type AccountStatus,
  AdminUser,
  AdminUserList,
  ErrorResponse,
  type Role,
  SessionResponse,
} from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TEST_DATABASE_URL } from '../scripts/test-db-guard';
import { createSignedInUser, insertUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const LAST_ADMIN_MESSAGE = 'There must be at least one admin.';
const NOT_APPROVED_MESSAGE = 'Only approved accounts can change role.';

interface UserRow {
  status: AccountStatus;
  role: Role;
  updated_at: Date;
}

describe('/api/admin/users role sharing', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let admin: { id: string; cookie: string };

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
    admin = await createSignedInUser(app, {
      name: 'Ada Admin',
      email: 'admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
  });

  const http = () => request(app.getHttpServer());

  function listApproved(cookie: string | undefined, query = '?status=APPROVED'): request.Test {
    const call = http().get(`/api/admin/users${query}`);
    return cookie ? call.set('Cookie', cookie) : call;
  }

  function changeRole(id: string, body: unknown, cookie: string | undefined): request.Test {
    const call = http().put(`/api/admin/users/${id}/role`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  async function rowOf(id: string): Promise<UserRow> {
    const rows: UserRow[] = await dataSource.query(
      `SELECT status, role, updated_at FROM users WHERE id = $1`,
      [id],
    );
    return rows[0]!;
  }

  async function adminIds(): Promise<string[]> {
    const rows: { id: string }[] = await dataSource.query(
      `SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id`,
    );
    return rows.map((row) => row.id);
  }

  async function me(cookie: string): Promise<SessionResponse['user']> {
    const response = await http().get('/api/auth/me').set('Cookie', cookie);
    expect(response.status).toBe(200);
    return SessionResponse.parse(response.body).user;
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  async function approvedContributor(name: string, email: string) {
    return createSignedInUser(app, { name, email, role: 'CONTRIBUTOR', status: 'APPROVED' });
  }

  async function secondAdmin() {
    return createSignedInUser(app, {
      name: 'Bea Boss',
      email: 'bea@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
  }

  describe('GET /api/admin/users?status=APPROVED', () => {
    it('S02.3 AC1 lists only the approved accounts, by name then email then id, as AdminUserList', async () => {
      const zed = await insertUser(app, {
        name: 'Zed Zane',
        email: 'zed@lab.test',
        status: 'APPROVED',
      });
      const ben2 = await insertUser(app, {
        name: 'Ben Berg',
        email: 'ben2@lab.test',
        status: 'APPROVED',
      });
      const ben1 = await insertUser(app, {
        name: 'Ben Berg',
        email: 'ben1@lab.test',
        role: 'ADMIN',
        status: 'APPROVED',
      });
      await insertUser(app, { name: 'Aaron Pending', email: 'pending@lab.test' });
      await insertUser(app, {
        name: 'Abe Rejected',
        email: 'rejected@lab.test',
        status: 'REJECTED',
      });

      const response = await listApproved(admin.cookie);

      expect(response.status).toBe(200);
      const body = AdminUserList.strict().parse(response.body);
      expect(
        body.users.map((user) => [user.id, user.name, user.email, user.role, user.status]),
      ).toEqual([
        [admin.id, 'Ada Admin', 'admin@lab.test', 'ADMIN', 'APPROVED'],
        [ben1, 'Ben Berg', 'ben1@lab.test', 'ADMIN', 'APPROVED'],
        [ben2, 'Ben Berg', 'ben2@lab.test', 'CONTRIBUTOR', 'APPROVED'],
        [zed, 'Zed Zane', 'zed@lab.test', 'CONTRIBUTOR', 'APPROVED'],
      ]);
      for (const user of body.users) {
        expect(Object.keys(AdminUser.strict().parse(user)).sort()).toEqual(
          ['createdAt', 'email', 'id', 'name', 'role', 'status'].sort(),
        );
      }
      expect(JSON.stringify(response.body)).not.toContain('scrypt');
    });

    it('S02.3 AC1 orders accounts with the same name by email', async () => {
      const ids = [
        await insertUser(app, { name: 'Same Name', email: 'c@lab.test', status: 'APPROVED' }),
        await insertUser(app, { name: 'Same Name', email: 'a@lab.test', status: 'APPROVED' }),
        await insertUser(app, { name: 'Same Name', email: 'b@lab.test', status: 'APPROVED' }),
      ];

      const body = AdminUserList.parse((await listApproved(admin.cookie)).body);

      expect(body.users.filter((user) => user.name === 'Same Name').map((user) => user.id)).toEqual(
        [ids[1], ids[2], ids[0]],
      );
    });

    it.each([
      ['no status', ''],
      ['status REJECTED', '?status=REJECTED'],
      ['a lower-case status', '?status=approved'],
      ['a repeated status', '?status=APPROVED&status=APPROVED'],
    ])('S02.3 AC8 refuses %s with 400 VALIDATION_FAILED', async (_label, query) => {
      const response = await listApproved(admin.cookie, query);

      expectError(response, 400, 'VALIDATION_FAILED');
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'status', message: expect.any(String) as string },
      ]);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('S02.3 AC3 makes an approved contributor an admin; their existing session is an admin at the next request', async () => {
      const person = await approvedContributor('Sara Novak', 'sara@lab.test');
      expectError(await listApproved(person.cookie, '?status=PENDING'), 403, 'FORBIDDEN');

      const response = await changeRole(person.id, { role: 'ADMIN' }, admin.cookie);

      expect(response.status).toBe(200);
      expect(AdminUser.strict().parse(response.body)).toMatchObject({
        id: person.id,
        name: 'Sara Novak',
        email: 'sara@lab.test',
        role: 'ADMIN',
        status: 'APPROVED',
      });
      expect(await rowOf(person.id)).toMatchObject({ role: 'ADMIN', status: 'APPROVED' });
      expect(await me(person.cookie)).toMatchObject({ id: person.id, role: 'ADMIN' });
      expect((await listApproved(person.cookie, '?status=PENDING')).status).toBe(200);
    });

    it('S02.3 AC4 makes another admin a contributor; their existing session loses admin access but stays approved', async () => {
      const bea = await secondAdmin();

      const response = await changeRole(bea.id, { role: 'CONTRIBUTOR' }, admin.cookie);

      expect(response.status).toBe(200);
      expect(AdminUser.strict().parse(response.body)).toMatchObject({
        id: bea.id,
        role: 'CONTRIBUTOR',
        status: 'APPROVED',
      });
      expect(await me(bea.cookie)).toMatchObject({ role: 'CONTRIBUTOR', status: 'APPROVED' });
      expectError(await listApproved(bea.cookie, '?status=PENDING'), 403, 'FORBIDDEN');
      expect(await adminIds()).toEqual([admin.id]);
    });

    it('S02.3 AC5 refuses the only admin removing their own role with 409 LAST_ADMIN', async () => {
      const before = await rowOf(admin.id);

      const response = await changeRole(admin.id, { role: 'CONTRIBUTOR' }, admin.cookie);

      expectError(response, 409, 'LAST_ADMIN');
      expect(ErrorResponse.parse(response.body).message).toBe(LAST_ADMIN_MESSAGE);
      expect(await rowOf(admin.id)).toEqual(before);
      expect(await me(admin.cookie)).toMatchObject({ role: 'ADMIN' });
    });

    it('S02.3 AC6 of two admins demoting each other at once, exactly one wins and one admin remains (lock held from a separate connection)', async () => {
      const bea = await secondAdmin();
      const other = new Client({ connectionString: TEST_DATABASE_URL });
      await other.connect();
      try {
        // The test plays admin A: it takes the lock on the admin rows first.
        await other.query('BEGIN');
        const otherPid = (await other.query<{ pid: number }>('SELECT pg_backend_pid() AS pid'))
          .rows[0]!.pid;
        await other.query(`SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id FOR UPDATE`);

        // Admin B demotes admin A through HTTP; it must wait for the lock.
        let settled = false;
        const demoteA = changeRole(admin.id, { role: 'CONTRIBUTOR' }, bea.cookie).then(
          (response) => {
            settled = true;
            return response;
          },
        );
        // Wait until the request is blocked by the test's connection, or has already answered
        // (which happens only if `changeRole` takes no lock: the test then fails below).
        for (let attempt = 0; attempt < 200 && !settled; attempt += 1) {
          const blocked = await dataSource.query(
            `SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))`,
            [otherPid],
          );
          if ((blocked as unknown[]).length > 0) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }

        // Admin A demotes admin B and commits.
        await other.query(`UPDATE users SET role = 'CONTRIBUTOR' WHERE id = $1`, [bea.id]);
        await other.query('COMMIT');

        const response = await demoteA;
        expectError(response, 409, 'LAST_ADMIN');
        expect(ErrorResponse.parse(response.body).message).toBe(LAST_ADMIN_MESSAGE);
        expect(await adminIds()).toEqual([admin.id]);
      } finally {
        await other.end();
      }
    });

    it('S02.3 AC6 two simultaneous HTTP demotions of each other give one 200 and one 409', async () => {
      const bea = await secondAdmin();

      const responses = await Promise.all([
        changeRole(bea.id, { role: 'CONTRIBUTOR' }, admin.cookie),
        changeRole(admin.id, { role: 'CONTRIBUTOR' }, bea.cookie),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)!.body).toMatchObject({
        code: 'LAST_ADMIN',
      });
      expect(await adminIds()).toHaveLength(1);
    });

    it('S02.3 AC7 an admin removes their own role while another admin exists, and loses admin access at once', async () => {
      const bea = await secondAdmin();

      const response = await changeRole(admin.id, { role: 'CONTRIBUTOR' }, admin.cookie);

      expect(response.status).toBe(200);
      expect(AdminUser.parse(response.body)).toMatchObject({ id: admin.id, role: 'CONTRIBUTOR' });
      expect(await me(admin.cookie)).toMatchObject({ role: 'CONTRIBUTOR', status: 'APPROVED' });
      expectError(await listApproved(admin.cookie), 403, 'FORBIDDEN');
      expect(await adminIds()).toEqual([bea.id]);
    });

    it.each<AccountStatus>(['PENDING', 'REJECTED'])(
      'S02.3 AC8 a %s account cannot be made an admin: 409 USER_NOT_APPROVED, unchanged',
      async (status) => {
        const target = await insertUser(app, { email: 'target@lab.test', status });
        const before = await rowOf(target);

        const response = await changeRole(target, { role: 'ADMIN' }, admin.cookie);

        expectError(response, 409, 'USER_NOT_APPROVED');
        expect(ErrorResponse.parse(response.body).message).toBe(NOT_APPROVED_MESSAGE);
        expect(await rowOf(target)).toEqual(before);
      },
    );

    it('S02.3 AC8 an unknown id gives 404 NOT_FOUND', async () => {
      expectError(await changeRole(UNKNOWN_ID, { role: 'ADMIN' }, admin.cookie), 404, 'NOT_FOUND');
    });

    it.each(['not-a-uuid', '123', `${UNKNOWN_ID}x`])(
      'S02.3 AC8 the id %j gives 400 VALIDATION_FAILED',
      async (id) => {
        const response = await changeRole(id, { role: 'ADMIN' }, admin.cookie);

        expectError(response, 400, 'VALIDATION_FAILED');
        expect(ErrorResponse.parse(response.body).fields).toEqual([
          { path: 'id', message: expect.any(String) as string },
        ]);
      },
    );

    it.each([
      ['a missing role', {}],
      ['an unknown role', { role: 'OWNER' }],
      ['a lower-case role', { role: 'admin' }],
      ['a null role', { role: null }],
    ])('S02.3 AC8 %s gives 400 VALIDATION_FAILED and changes nothing', async (_label, body) => {
      const person = await approvedContributor('Sara Novak', 'sara@lab.test');
      const before = await rowOf(person.id);

      const response = await changeRole(person.id, body, admin.cookie);

      expectError(response, 400, 'VALIDATION_FAILED');
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'role', message: expect.any(String) as string },
      ]);
      expect(await rowOf(person.id)).toEqual(before);
    });

    it.each<Role>(['ADMIN', 'CONTRIBUTOR'])(
      'S02.3 AC8 setting the role %s an account already has answers 200 and changes nothing',
      async (role) => {
        const target =
          role === 'ADMIN'
            ? admin.id
            : (await approvedContributor('Sara Novak', 'sara@lab.test')).id;
        const before = await rowOf(target);

        const response = await changeRole(target, { role }, admin.cookie);

        expect(response.status).toBe(200);
        expect(AdminUser.parse(response.body)).toMatchObject({ id: target, role });
        expect(await rowOf(target)).toEqual(before);
      },
    );

    it('S02.3 AC8 a status in the body is ignored', async () => {
      const target = await insertUser(app, { email: 'target@lab.test', status: 'PENDING' });

      const response = await changeRole(
        target,
        { role: 'ADMIN', status: 'APPROVED' },
        admin.cookie,
      );

      expectError(response, 409, 'USER_NOT_APPROVED');
      expect(await rowOf(target)).toMatchObject({ role: 'CONTRIBUTOR', status: 'PENDING' });
    });
  });

  describe('S02.3 AC9 refused callers', () => {
    const callers = [
      { label: 'an anonymous visitor', status: 401, code: 'UNAUTHENTICATED', account: undefined },
      { label: 'a pending account', status: 403, code: 'FORBIDDEN', account: 'PENDING' },
      { label: 'a rejected account', status: 403, code: 'FORBIDDEN', account: 'REJECTED' },
      { label: 'an approved contributor', status: 403, code: 'FORBIDDEN', account: 'APPROVED' },
    ] as const;

    const endpoints = [
      { label: 'GET /api/admin/users?status=APPROVED', change: false },
      { label: 'PUT /api/admin/users/:id/role', change: true },
    ] as const;

    const matrix = callers.flatMap((caller) => endpoints.map((endpoint) => ({ caller, endpoint })));

    it.each(matrix)(
      'S02.3 AC9 $caller.label calling $endpoint.label gets $caller.status $caller.code and no role changes',
      async ({ caller, endpoint }) => {
        const target = await insertUser(app, {
          name: 'Tia Target',
          email: 'target@lab.test',
          status: 'APPROVED',
        });
        const caller_ =
          caller.account === undefined
            ? undefined
            : await createSignedInUser(app, {
                email: 'caller@lab.test',
                role: 'CONTRIBUTOR',
                status: caller.account,
              });
        const watched = [target, admin.id, ...(caller_ ? [caller_.id] : [])];
        const before = await Promise.all(watched.map(rowOf));

        const response = endpoint.change
          ? await changeRole(target, { role: 'ADMIN' }, caller_?.cookie)
          : await listApproved(caller_?.cookie);

        expectError(response, caller.status, caller.code);
        expect(JSON.stringify(response.body)).not.toContain('target@lab.test');
        expect(await Promise.all(watched.map(rowOf))).toEqual(before);
      },
    );

    it.each(['PENDING', 'REJECTED', 'APPROVED'] as const)(
      'S02.3 AC9 a %s contributor promoting themselves gets 403 FORBIDDEN and stays a contributor',
      async (status) => {
        const self = await createSignedInUser(app, {
          email: 'self@lab.test',
          role: 'CONTRIBUTOR',
          status,
        });
        const before = await rowOf(self.id);

        const response = await changeRole(self.id, { role: 'ADMIN' }, self.cookie);

        expectError(response, 403, 'FORBIDDEN');
        expect(await rowOf(self.id)).toEqual(before);
      },
    );

    it('S02.3 AC9 a foreign Origin on PUT is refused before any change', async () => {
      const person = await approvedContributor('Sara Novak', 'sara@lab.test');

      const response = await changeRole(person.id, { role: 'ADMIN' }, admin.cookie).set(
        'Origin',
        'https://evil.example',
      );

      expectError(response, 403, 'FORBIDDEN');
      expect(await rowOf(person.id)).toMatchObject({ role: 'CONTRIBUTOR' });
    });
  });
});
