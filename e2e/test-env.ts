/**
 * The test settings (E01 design §6), shared by `pnpm qa:serve` (`qa-serve.ts`) and `pnpm e2e`
 * (`playwright.config.ts`). Not secrets: the test database runs locally with fixed credentials.
 *
 * `DATABASE_URL` must equal `TEST_DATABASE_URL` in `apps/api/scripts/test-db-guard.ts`, the only
 * database that `pnpm test:db:prepare` resets before the app starts.
 */
export const TEST_PORT = 4100;

export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

/** The environment of the built app. Relative paths are resolved against the repository root. */
export const TEST_ENV = {
  DATABASE_URL: 'postgres://labsafe:labsafe@localhost:5443/labsafe_test',
  PORT: String(TEST_PORT),
  NODE_ENV: 'test',
  WEB_DIST_DIR: 'apps/web/dist',
} as const;
