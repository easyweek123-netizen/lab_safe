import type { DataSourceOptions } from 'typeorm';
import { ALL_MIGRATIONS } from './migrations';

export { ALL_MIGRATIONS };

/**
 * The connection options shared by the CLI, the app and `prepare-test-db`. Importing this file
 * never reads the configuration: callers pass the URL. The schema changes only through
 * migrations (`synchronize: false`, design doc §10).
 */
export function dataSourceOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    migrations: ALL_MIGRATIONS,
    migrationsTableName: 'migrations',
    synchronize: false,
    // Generated UUIDs use `gen_random_uuid()` (built into PostgreSQL 13+), as the migrations do.
    // Never run `CREATE EXTENSION` on connect: that would change the schema outside migrations.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    extra: { connectionTimeoutMillis: 3000 },
  };
}
