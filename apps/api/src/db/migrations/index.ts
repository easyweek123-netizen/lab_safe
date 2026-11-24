import type { MigrationInterface } from 'typeorm';
import { CreateLabRooms1793232000000 } from './1793232000000-CreateLabRooms';
import { CreateUsersAndSessions1795521437455 } from './1795521437455-CreateUsersAndSessions';

/**
 * Every migration, oldest first. An explicit list, no file globs: later epics append their
 * migrations here, so the CLI, the app and `prepare-test-db` always run the same set.
 */
export const ALL_MIGRATIONS: Array<new () => MigrationInterface> = [
  CreateLabRooms1793232000000,
  CreateUsersAndSessions1795521437455,
];
