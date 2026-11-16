/**
 * The only database that tests may reset (E01-D4, root CLAUDE.md hard rule). Not a secret: the
 * test database runs locally on tmpfs with fixed credentials. `TEST_ENV.DATABASE_URL` in
 * `e2e/test-env.ts` (the app started by `pnpm qa:serve` and `pnpm e2e`) must stay equal to it.
 */
export const TEST_DATABASE_URL = 'postgres://labsafe:labsafe@localhost:5443/labsafe_test';

const EXPECTED_DATABASE = 'labsafe_test';
const EXPECTED_PORT = '5443';
const ALLOWED_HOSTS: readonly string[] = ['localhost', '127.0.0.1'];

export class NotTestDatabaseError extends Error {
  override name = 'NotTestDatabaseError';
}

/**
 * Throws unless `url` names database `labsafe_test` on port 5443 of `localhost` or `127.0.0.1`,
 * with no query string or hash (`pg` lets query parameters such as `?host=` or `?port=` override
 * the URL's own parts). Call it before any connection.
 */
export function assertTestDatabase(url: string): void {
  const refuse = (reason: string): never => {
    throw new NotTestDatabaseError(
      `Refusing to reset this database: ${reason}. Only database "${EXPECTED_DATABASE}" on port ${EXPECTED_PORT} of localhost may be reset.`,
    );
  };

  // Checked on the raw string so that even an empty `?` or `#` is refused.
  if (url.includes('?') || url.includes('#')) {
    return refuse('the database URL has a query string or hash');
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return refuse('the database URL cannot be parsed');
  }

  let database: string;
  try {
    database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    return refuse('the database name cannot be read');
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) refuse(`the host is "${parsed.hostname}"`);
  if (database !== EXPECTED_DATABASE) refuse(`the database is "${database}"`);
  if (parsed.port !== EXPECTED_PORT) refuse(`the port is "${parsed.port || 'the default'}"`);
}
