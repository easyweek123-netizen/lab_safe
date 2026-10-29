import { DataSource } from 'typeorm';
import { loadConfig } from '../common/config';
import { dataSourceOptions } from './data-source';

/**
 * For the TypeORM CLI only (`db:migrate`, `db:generate`), on the development database from
 * `DATABASE_URL`. Each run needs the user's approval. The entity glob lets later epics run
 * `migration:generate`; the paths are relative to `apps/api`, where the scripts run.
 */
export default new DataSource({
  ...dataSourceOptions(loadConfig().DATABASE_URL),
  entities: ['src/**/*.entity.ts'],
});
