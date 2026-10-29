import { beforeAll } from 'vitest';
import { resetTables } from './helpers';

// Every integration-test file starts with empty tables (lab rooms and migration records stay).
beforeAll(async () => {
  await resetTables();
});
