import { ACCOUNT_STATUSES, ROLES } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers';

describe('users and sessions tables', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Runs statements in one transaction that is always rolled back, so the tables stay empty. */
  async function inRolledBackTransaction<T>(
    work: (query: (sql: string, parameters?: unknown[]) => Promise<unknown>) => Promise<T>,
  ): Promise<T> {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      return await work((sql, parameters) => runner.query(sql, parameters));
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  }

  /** The Postgres error code (SQLSTATE) of a failed query, or undefined if it did not fail. */
  async function sqlStateOf(promise: Promise<unknown>): Promise<string | undefined> {
    const error: unknown = await promise.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    if (error === undefined) return undefined;
    expect(error).toBeInstanceOf(QueryFailedError);
    return (error as QueryFailedError<Error & { code?: string }>).driverError.code;
  }

  const INSERT_USER =
    'INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id';

  function insertUser(
    query: (sql: string, parameters?: unknown[]) => Promise<unknown>,
    change: Partial<Record<'name' | 'email' | 'role' | 'status', string>> = {},
  ): Promise<unknown> {
    const row = {
      name: 'Sara',
      email: 'sara@lab.test',
      role: 'CONTRIBUTOR',
      status: 'PENDING',
      ...change,
    };
    return query(INSERT_USER, [row.name, row.email, 'scrypt$1$1$1$a$b', row.role, row.status]);
  }

  it('S02.1 AC14 users has only id, name, email, password_hash, role, status, created_at and updated_at', async () => {
    const rows = await dataSource.query<Array<{ column_name: string }>>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' ORDER BY column_name`,
    );

    expect(rows.map(({ column_name }) => column_name)).toEqual([
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

  it('S02.1 AC4 a new row is a PENDING CONTRIBUTOR by default', async () => {
    const rows = await inRolledBackTransaction((query) =>
      query(
        `INSERT INTO users (name, email, password_hash) VALUES ('Sara', 'sara@lab.test', 'x')
         RETURNING role, status, created_at, updated_at`,
      ),
    );

    expect(rows).toEqual([expect.objectContaining({ role: 'CONTRIBUTOR', status: 'PENDING' })]);
    const [row] = rows as Array<{ created_at: Date; updated_at: Date }>;
    expect(row?.created_at).toBeInstanceOf(Date);
    expect(row?.updated_at).toBeInstanceOf(Date);
  });

  it('S02.1 AC4 the role and status CHECKs list exactly the shared ROLES and ACCOUNT_STATUSES', async () => {
    const rows = await dataSource.query<Array<{ conname: string; definition: string }>>(
      `SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
       WHERE conname IN ('users_role_check', 'users_status_check') ORDER BY conname`,
    );
    const valuesOf = (definition: string) =>
      [...definition.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);

    expect(rows.map(({ conname }) => conname)).toEqual(['users_role_check', 'users_status_check']);
    expect(valuesOf(rows[0]!.definition)).toEqual([...ROLES]);
    expect(valuesOf(rows[1]!.definition)).toEqual([...ACCOUNT_STATUSES]);
  });

  it.each([
    ['an unknown role', { role: 'OWNER' }],
    ['an unknown status', { status: 'BANNED' }],
    ['an admin that is not approved', { role: 'ADMIN', status: 'PENDING' }],
    ['an email with capitals', { email: 'Sara@Lab.test' }],
    ['an empty name', { name: '' }],
    ['a name with spaces around it', { name: ' Sara ' }],
    ['a name of 101 characters', { name: 'S'.repeat(101) }],
  ])('S02.1 AC4 refuses a user with %s (check violation 23514)', async (_label, change) => {
    const state = await sqlStateOf(inRolledBackTransaction((query) => insertUser(query, change)));

    expect(state).toBe('23514');
  });

  it('S02.1 AC4 accepts an approved admin', async () => {
    const state = await sqlStateOf(
      inRolledBackTransaction((query) => insertUser(query, { role: 'ADMIN', status: 'APPROVED' })),
    );

    expect(state).toBeUndefined();
  });

  it('S02.1 AC3 refuses a second user with the same email (unique violation 23505)', async () => {
    const state = await sqlStateOf(
      inRolledBackTransaction(async (query) => {
        await insertUser(query);
        await insertUser(query, { name: 'Other Sara' });
      }),
    );

    expect(state).toBe('23505');
  });

  it('S02.1 AC14 refuses a duplicate token_hash, and deleting a user deletes their sessions', async () => {
    const result = await inRolledBackTransaction(async (query) => {
      const [user] = (await insertUser(query)) as Array<{ id: string }>;
      const insertSession = `INSERT INTO sessions (token_hash, user_id, expires_at)
                             VALUES ($1, $2, now() + interval '7 days')`;
      await query(insertSession, ['a'.repeat(64), user!.id]);
      const duplicate = await sqlStateOf(query(insertSession, ['a'.repeat(64), user!.id]));
      return { duplicate };
    });
    expect(result.duplicate).toBe('23505');

    const cascade = await inRolledBackTransaction(async (query) => {
      const [user] = (await insertUser(query)) as Array<{ id: string }>;
      await query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now())`, [
        'b'.repeat(64),
        user!.id,
      ]);
      await query('DELETE FROM users WHERE id = $1', [user!.id]);
      return query('SELECT count(*)::int AS count FROM sessions');
    });
    expect(cascade).toEqual([{ count: 0 }]);
  });

  it('S02.1 AC14 sessions.token_hash is unique and sessions.user_id is indexed', async () => {
    const rows = await dataSource.query<Array<{ indexname: string; indexdef: string }>>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sessions' ORDER BY indexname`,
    );

    expect(rows.map(({ indexname }) => indexname)).toEqual([
      'sessions_pkey',
      'sessions_token_hash_key',
      'sessions_user_id_idx',
    ]);
    expect(rows[1]?.indexdef).toMatch(/UNIQUE INDEX .* \(token_hash\)/);
    expect(rows[2]?.indexdef).toMatch(/\(user_id\)/);
  });
});
