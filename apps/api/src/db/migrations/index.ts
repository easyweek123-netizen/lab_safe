import type { MigrationInterface } from 'typeorm';
import { CreateLabRooms1793232000000 } from './1793232000000-CreateLabRooms';

/**
 * Every migration, oldest first. An explicit list, no file globs: later epics append their
 * migrations here, so the CLI, the app and `prepare-test-db` always run the same set.
 */
export const ALL_MIGRATIONS: Array<new () => MigrationInterface> = [CreateLabRooms1793232000000];
