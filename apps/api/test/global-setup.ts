import { prepareTestDb, TestDatabaseNotRunningError } from '../scripts/prepare-test-db';

/** Runs once before all integration tests: empty `labsafe_test`, then every migration. */
export default async function setup(): Promise<void> {
  try {
    await prepareTestDb();
  } catch (error) {
    if (error instanceof TestDatabaseNotRunningError) {
      // Only the "run `pnpm db:up`" message, without a stack trace (E01 design §12, TC-10.4).
      const plain = new Error(error.message);
      plain.stack = error.message;
      throw plain;
    }
    throw error;
  }
}
