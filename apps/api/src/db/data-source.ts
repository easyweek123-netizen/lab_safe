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
    extra: { connectionTimeoutMillis: 3000 },
  };
}
