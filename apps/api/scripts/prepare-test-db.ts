import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../src/db/data-source';
import { assertTestDatabase, TEST_DATABASE_URL } from './test-db-guard';

export const TEST_DB_NOT_RUNNING_MESSAGE =
  'The test database on localhost:5443 is not running. Run `pnpm db:up` first.';

export class TestDatabaseNotRunningError extends Error {
  override name = 'TestDatabaseNotRunningError';
  constructor() {
    super(TEST_DB_NOT_RUNNING_MESSAGE);
  }
}

/** True for a refused connection, also when Node tried several addresses (an `AggregateError`). */
function isConnectionRefused(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ((error as { code?: unknown }).code === 'ECONNREFUSED') return true;
  const inner = (error as { errors?: unknown }).errors;
  return Array.isArray(inner) && inner.some(isConnectionRefused);
}

/**
 * Empties `labsafe_test` and runs every migration (E01 design §6). The guard runs before any
 * connection. It reads no environment variable, so a `DATABASE_URL` in the shell can never
 * redirect it. Later epics add the e2e seed here.
 */
export async function prepareTestDb(url: string = TEST_DATABASE_URL): Promise<void> {
  assertTestDatabase(url);

  const dataSource = new DataSource(dataSourceOptions(url));
  try {
    await dataSource.initialize();
  } catch (error) {
    if (isConnectionRefused(error)) throw new TestDatabaseNotRunningError();
    throw error;
  }

  try {
    await dataSource.query('DROP SCHEMA public CASCADE');
    await dataSource.query('CREATE SCHEMA public');
    await dataSource.runMigrations({ transaction: 'each' });
  } finally {
    await dataSource.destroy();
  }
}

// Run as a script (`tsx scripts/prepare-test-db.ts`), not when imported by tests or `globalSetup`.
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  prepareTestDb().then(
    () => process.stdout.write('Test database labsafe_test is ready.\n'),
    (error: unknown) => {
      if (error instanceof TestDatabaseNotRunningError) {
        // Only the message, no stack trace (AC10).
        process.stderr.write(`${error.message}\n`);
        process.exit(1);
      }
      throw error;
    },
  );
}
