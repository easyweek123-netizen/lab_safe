/**
 * The test settings (E01 design §6), shared by `pnpm qa:serve` (`qa-serve.ts`) and `pnpm e2e`
 * (`playwright.config.ts`). Not secrets: the test database runs locally with fixed credentials.
 *
 * `DATABASE_URL` must equal `TEST_DATABASE_URL` in `apps/api/scripts/test-db-guard.ts`, the only
 * database that `pnpm test:db:prepare` resets before the app starts.
 */
export const TEST_PORT = 4100;

export const TEST_BASE_URL = `http://localhost:${TEST_PORT}`;

/**
 * The setup admin that the test copies start with (S02.2 AC3): `BootstrapAdminService` creates it
 * on the fresh `labsafe_test`. Test-only values, not secrets; the e2e helpers log in with them.
 */
export const TEST_ADMIN = {
  name: 'Setup Admin',
  email: 'setup.admin@labsafe.test',
  password: 'setup-admin-password',
} as const;

/** The environment of the built app. Relative paths are resolved against the repository root. */
export const TEST_ENV = {
  DATABASE_URL: 'postgres://labsafe:labsafe@localhost:5443/labsafe_test',
  PORT: String(TEST_PORT),
  NODE_ENV: 'test',
  WEB_DIST_DIR: 'apps/web/dist',
  BOOTSTRAP_ADMIN_EMAIL: TEST_ADMIN.email,
  BOOTSTRAP_ADMIN_PASSWORD: TEST_ADMIN.password,
  BOOTSTRAP_ADMIN_NAME: TEST_ADMIN.name,
} as const;
