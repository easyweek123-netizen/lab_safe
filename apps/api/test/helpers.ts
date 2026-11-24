import { type DynamicModule, type INestApplication, Module, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Client } from 'pg';
import { assertTestDatabase, TEST_DATABASE_URL } from '../scripts/test-db-guard';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { loadConfig } from '../src/common/config';

/** Tables that `resetTables` keeps: the migrated lab rooms and TypeORM's migration records. */
const KEPT_TABLES = ['lab_rooms', 'migrations'];

/**
 * Builds and starts the real app (the same `NestFactory.create`, `AppModule` and `configureApp`
 * as `main.ts`) on `labsafe_test`. `env` overrides single settings, for example `WEB_DIST_DIR` in
 * S01.3. `extraControllers` adds test-only routes next to the real ones, behind the same global
 * guards (S02.1 AC11 uses a route without an access level). Close it with `app.close()` in
 * `afterAll`.
 *
 * Not `@nestjs/testing`: its `compile()` creates the providers before the HTTP adapter exists,
 * so `@nestjs/serve-static` would pick its do-nothing loader and never serve the web app.
 */
export async function createTestApp(
  env: Record<string, string> = {},
  extraControllers: Type[] = [],
): Promise<INestApplication> {
  const config = loadConfig({ ...process.env, ...env });
  // Integration tests write data, so they may only ever use the test database.
  assertTestDatabase(config.DATABASE_URL);

  const root = AppModule.forRoot(config);
  const app = await NestFactory.create(
    extraControllers.length === 0 ? root : withControllers(root, extraControllers),
    {
      logger: ['error', 'warn'],
      // Throw start-up errors to the test instead of ending the test process.
      abortOnError: false,
    },
  );
  configureApp(app);
  await app.init();
  return app;
}

@Module({})
class TestRoutesModule {}

/** A root module that imports the real `AppModule` and adds the given controllers. */
function withControllers(root: DynamicModule, controllers: Type[]): DynamicModule {
  return { module: TestRoutesModule, imports: [root], controllers };
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
