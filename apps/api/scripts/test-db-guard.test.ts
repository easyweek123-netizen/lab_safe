import { DataSource } from 'typeorm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareTestDb, TEST_DB_NOT_RUNNING_MESSAGE } from './prepare-test-db';
import { assertTestDatabase, NotTestDatabaseError, TEST_DATABASE_URL } from './test-db-guard';

const REFUSED_URLS = [
  ['the development database', 'postgres://labsafe:labsafe@localhost:5442/labsafe'],
  ['the right port with the wrong database', 'postgres://labsafe:labsafe@localhost:5443/labsafe'],
  [
    'the right database on the wrong port',
    'postgres://labsafe:labsafe@localhost:5442/labsafe_test',
  ],
  ['a URL that cannot be parsed', 'not a url'],
  ['the right database with no port', 'postgres://labsafe:labsafe@localhost/labsafe_test'],
  [
    'a database name that only starts with labsafe_test',
    'postgres://labsafe:labsafe@localhost:5443/labsafe_test2',
  ],
] as const;

describe('assertTestDatabase', () => {
  it.each(REFUSED_URLS)(
    'TC-10.1 refuses %s and names labsafe_test and port 5443',
    (_label, url) => {
      let thrown: unknown;
      try {
        assertTestDatabase(url);
      } catch (error) {
        thrown = error;
      }
      expect(thrown).toBeInstanceOf(NotTestDatabaseError);
      const message = (thrown as Error).message;
      expect(message).toContain('labsafe_test');
      expect(message).toContain('5443');
    },
  );

  it('TC-10.2 accepts the test database URL', () => {
    expect(TEST_DATABASE_URL).toBe('postgres://labsafe:labsafe@localhost:5443/labsafe_test');
    expect(() =>
      assertTestDatabase('postgres://labsafe:labsafe@localhost:5443/labsafe_test'),
    ).not.toThrow();
  });
});

describe('prepareTestDb', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(REFUSED_URLS)('TC-10.1 refuses %s before connecting', async (_label, url) => {
    const initialize = vi.spyOn(DataSource.prototype, 'initialize');
    await expect(prepareTestDb(url)).rejects.toBeInstanceOf(NotTestDatabaseError);
    expect(initialize).not.toHaveBeenCalled();
  });

  it('AC10 turns a refused connection into the "run pnpm db:up" message', async () => {
    const refused = new AggregateError(
      [Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5443'), { code: 'ECONNREFUSED' })],
      'connect ECONNREFUSED',
    );
    const initialize = vi.spyOn(DataSource.prototype, 'initialize').mockRejectedValue(refused);
    const query = vi.spyOn(DataSource.prototype, 'query');

    await expect(prepareTestDb()).rejects.toThrow(TEST_DB_NOT_RUNNING_MESSAGE);
    expect(initialize).toHaveBeenCalledOnce();
    expect(query).not.toHaveBeenCalled();
    expect(TEST_DB_NOT_RUNNING_MESSAGE).toBe(
      'The test database on localhost:5443 is not running. Run `pnpm db:up` first.',
    );
  });
});
