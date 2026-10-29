import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import { assertTestDatabase, TEST_DATABASE_URL } from '../scripts/test-db-guard';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/common/config';

/** Tables that `resetTables` keeps: the migrated lab rooms and TypeORM's migration records. */
const KEPT_TABLES = ['lab_rooms', 'migrations'];

/**
 * Builds and starts the real app (the same `AppModule` and `configureApp` as `main.ts`) on
 * `labsafe_test`. `env` overrides single settings, for example `WEB_DIST_DIR` in S01.3.
 * Close it with `app.close()` in `afterAll`.
 */
export async function createTestApp(env: Record<string, string> = {}): Promise<INestApplication> {
  const config = loadConfig({ ...process.env, ...env });
  // Integration tests write data, so they may only ever use the test database.
  assertTestDatabase(config.DATABASE_URL);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app;
}

/**
 * Empties every table in `public` except `lab_rooms` and `migrations`
 * (`TRUNCATE … RESTART IDENTITY CASCADE`). Does nothing when there are no such tables.
 */
export async function resetTables(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT (tablename = ANY($1::text[]))`,
      [KEPT_TABLES],
    );
    if (rows.length === 0) return;
    const tables = rows
      .map(({ tablename }) => `public."${tablename.replaceAll('"', '""')}"`)
      .join(', ');
    await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  } finally {
    await client.end();
  }
}
