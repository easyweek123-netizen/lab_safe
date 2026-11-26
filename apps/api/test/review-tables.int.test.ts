import { EMERGENCY_EQUIPMENT } from '@labsafe/shared';
import { DataSource, QueryFailedError } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertTestDatabase, TEST_DATABASE_URL } from '../scripts/test-db-guard';
import { ALL_MIGRATIONS, dataSourceOptions } from '../src/db/data-source';
import { Session } from '../src/modules/auth/session.entity';
import { InstrumentRevision } from '../src/modules/instruments/instrument-revision.entity';
import { Instrument } from '../src/modules/instruments/instrument.entity';
import { RevisionHazard } from '../src/modules/instruments/revision-hazard.entity';
import { RevisionProtectiveEquipment } from '../src/modules/instruments/revision-protective-equipment.entity';
import { LabRoom } from '../src/modules/meta/lab-room.entity';
import { Photo } from '../src/modules/photos/photo.entity';
import { User } from '../src/modules/users/user.entity';

type Query = (sql: string, parameters?: unknown[]) => Promise<unknown>;

/** How a statement failed: its SQL state and the constraint it broke. */
interface Failure {
  code: string | undefined;
  constraint: string | undefined;
}

const NO_ID = '00000000-0000-4000-8000-000000000000';

/** The six emergency items, every one "not applicable". */
const ALL_NOT_APPLICABLE = Object.fromEntries(
  EMERGENCY_EQUIPMENT.map(({ value }) => [value, { kind: 'NOT_APPLICABLE' }]),
);

/** The columns of an E03-style pending revision row, without any E04 column. */
function pendingRevision(ids: {
  instrumentId: string;
  userId: string;
  photoId: string;
  labRoomId: string;
}): Record<string, unknown> {
  return {
    instrument_id: ids.instrumentId,
    kind: 'NEW',
    status: 'PENDING',
    submitted_by: ids.userId,
    submitted_at: new Date(),
    name: 'Rotary evaporator',
    description: 'Removes solvents under reduced pressure.',
    category: 'SEPARATION_EVAPORATION',
    lab_room_id: ids.labRoomId,
    responsible_name: 'Dr. Lee',
    responsible_contact: 'lee@lab.test',
    hazard_level: 'MEDIUM',
    training_required: true,
    training_given_by: 'Dr. Lee',
    no_significant_hazards: false,
    standard_lab_attire_only: false,
    hazard_pictograms: ['FLAMMABLE'],
    before_use: 'Check the glassware.',
    safe_operation: 'Start the vacuum slowly.',
    do_not: 'Do not leave it running unattended.',
    emergency: 'Stop the rotation and vent.',
    emergency_phone: '112',
    emergency_equipment: JSON.stringify(ALL_NOT_APPLICABLE),
    photo_id: ids.photoId,
  };
}

describe('review and publishing columns', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    assertTestDatabase(TEST_DATABASE_URL);
    dataSource = new DataSource({
      ...dataSourceOptions(TEST_DATABASE_URL),
      entities: [
        User,
        Session,
        LabRoom,
        Photo,
        Instrument,
        InstrumentRevision,
        RevisionHazard,
        RevisionProtectiveEquipment,
      ],
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  /** Runs statements in one transaction that is always rolled back, so the tables stay empty. */
  async function inRolledBackTransaction<T>(work: (query: Query) => Promise<T>): Promise<T> {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      return await work((sql, parameters) => runner.query(sql, parameters));
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  }

  /** How `promise` failed, or undefined if it succeeded. */
  async function failureOf(promise: Promise<unknown>): Promise<Failure | undefined> {
    const error: unknown = await promise.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    if (error === undefined) return undefined;
    expect(error).toBeInstanceOf(QueryFailedError);
    const driverError = (error as QueryFailedError<Error & { code?: string; constraint?: string }>)
      .driverError;
    return { code: driverError.code, constraint: driverError.constraint };
  }

  /** Inserts an approved admin and returns its id. */
  async function insertAdmin(query: Query, email = 'ada@lab.test'): Promise<string> {
    const [admin] = (await query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Ada', $1, 'x', 'ADMIN', 'APPROVED') RETURNING id`,
      [email],
    )) as Array<{ id: string }>;
    return admin!.id;
  }

  /** Inserts a contributor, a photo and an instrument, and returns the ids a revision needs. */
  async function insertParents(query: Query, email = 'sara@lab.test') {
    const [user] = (await query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Sara', $1, 'x', 'CONTRIBUTOR', 'APPROVED') RETURNING id`,
      [email],
    )) as Array<{ id: string }>;
    const [photo] = (await query(
      `INSERT INTO photos (owner_id, content_type, bytes, width, height)
       VALUES ($1, 'image/jpeg', '\\xffd8ffd9'::bytea, 1600, 1200) RETURNING id`,
      [user!.id],
    )) as Array<{ id: string }>;
    const [instrument] = (await query(
      'INSERT INTO instruments (created_by) VALUES ($1) RETURNING id',
      [user!.id],
    )) as Array<{ id: string }>;
    const [room] = (await query('SELECT id FROM lab_rooms ORDER BY code LIMIT 1')) as Array<{
      id: string;
    }>;
    return {
      userId: user!.id,
      photoId: photo!.id,
      instrumentId: instrument!.id,
      labRoomId: room!.id,
    };
  }

  /** Inserts one revision row built from `columns`, and returns its id. */
  async function insertRevision(query: Query, columns: Record<string, unknown>): Promise<string> {
    const names = Object.keys(columns);
    const placeholders = names.map((_name, index) => `$${index + 1}`);
    const [row] = (await query(
      `INSERT INTO instrument_revisions (${names.join(', ')})
       VALUES (${placeholders.join(', ')}) RETURNING id`,
      Object.values(columns),
    )) as Array<{ id: string }>;
    return row!.id;
  }

  /** An instrument with one revision approved by an admin; returns their ids. */
  async function insertApproved(query: Query, email = 'sara@lab.test') {
    const ids = await insertParents(query, email);
    const adminId = await insertAdmin(query, `admin-${email}`);
    const revisionId = await insertRevision(query, {
      ...pendingRevision(ids),
      status: 'APPROVED',
      reviewed_by: adminId,
      reviewed_at: new Date(),
    });
    return { ...ids, adminId, revisionId };
  }

  /** Publishes `revisionId` on `instrumentId` at `slug`. */
  function publish(query: Query, instrumentId: string, slug: string | null, revisionId: unknown) {
    return query('UPDATE instruments SET slug = $2, published_revision_id = $3 WHERE id = $1', [
      instrumentId,
      slug,
      revisionId,
    ]);
  }

  /** How inserting a pending revision with `change` applied fails (an admin is in `adminId`). */
  function revisionFailure(
    change: (adminId: string) => Record<string, unknown>,
  ): Promise<Failure | undefined> {
    return failureOf(
      inRolledBackTransaction(async (query) => {
        const ids = await insertParents(query);
        const adminId = await insertAdmin(query);
        await insertRevision(query, { ...pendingRevision(ids), ...change(adminId) });
      }),
    );
  }

  it('S04.2 AC3 the entities match the migrated tables (no pending schema change)', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map(({ query }) => query)).toEqual([]);
  });

  it('S04.2 AC3 an E03-style pending row still inserts, with version 1 and no review data', async () => {
    const row = await inRolledBackTransaction(async (query) => {
      const revisionId = await insertRevision(query, pendingRevision(await insertParents(query)));
      return query(
        `SELECT version, reviewed_by, reviewed_at, review_note FROM instrument_revisions WHERE id = $1`,
        [revisionId],
      );
    });

    expect(row).toEqual([{ version: 1, reviewed_by: null, reviewed_at: null, review_note: null }]);
  });

  it('S04.2 AC3 accepts a published instrument and a rejected revision with a note', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        await publish(query, approved.instrumentId, 'rotary-evaporator-2', approved.revisionId);
        const ids = await insertParents(query, 'tom@lab.test');
        await insertRevision(query, {
          ...pendingRevision(ids),
          status: 'REJECTED',
          reviewed_by: approved.adminId,
          reviewed_at: new Date(),
          review_note: 'Add the emergency number.',
          version: 3,
        });
      }),
    );

    expect(failure).toBeUndefined();
  });

  it('S04.2 AC3 refuses a published_revision_id that belongs to another instrument', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        const other = await insertParents(query, 'tom@lab.test');
        await publish(query, other.instrumentId, 'rotary-evaporator', approved.revisionId);
      }),
    );

    expect(failure).toEqual({ code: '23503', constraint: 'instruments_published_revision_fkey' });
  });

  it('S04.2 AC3 refuses a published_revision_id that is no revision', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const ids = await insertParents(query);
        await publish(query, ids.instrumentId, 'rotary-evaporator', NO_ID);
      }),
    );

    expect(failure).toEqual({ code: '23503', constraint: 'instruments_published_revision_fkey' });
  });

  it('S04.2 AC3 refuses deleting the published revision', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        await publish(query, approved.instrumentId, 'rotary-evaporator', approved.revisionId);
        await query('DELETE FROM instrument_revisions WHERE id = $1', [approved.revisionId]);
      }),
    );

    expect(failure).toEqual({ code: '23503', constraint: 'instruments_published_revision_fkey' });
  });

  it.each([
    ['a slug without a published revision', 'rotary-evaporator', false],
    ['a published revision without a slug', null, true],
  ])('S04.2 AC3 refuses %s', async (_label, slug, withRevision) => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        await publish(
          query,
          approved.instrumentId,
          slug,
          withRevision ? approved.revisionId : null,
        );
      }),
    );

    expect(failure).toEqual({ code: '23514', constraint: 'instruments_published_check' });
  });

  it('S04.2 AC3 refuses two instruments with the same slug', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const first = await insertApproved(query, 'sara@lab.test');
        const second = await insertApproved(query, 'tom@lab.test');
        await publish(query, first.instrumentId, 'rotary-evaporator', first.revisionId);
        await publish(query, second.instrumentId, 'rotary-evaporator', second.revisionId);
      }),
    );

    expect(failure).toEqual({ code: '23505', constraint: 'instruments_slug_key' });
  });

  it.each([
    'Rotary-evaporator',
    'rotary_evaporator',
    'rotary evaporator',
    '-rotary',
    'rotary-',
    'rotary--evaporator',
    'büchi',
    '',
  ])('S04.2 AC3 refuses the slug "%s", which is not lowercase with hyphens', async (slug) => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        await publish(query, approved.instrumentId, slug, approved.revisionId);
      }),
    );

    expect(failure).toEqual({ code: '23514', constraint: 'instruments_slug_check' });
  });

  it.each([
    ['an APPROVED revision without reviewer', { status: 'APPROVED', reviewed_at: new Date() }],
    ['an APPROVED revision without date', { status: 'APPROVED', reviewed_by: 'admin' }],
    [
      'a REJECTED revision without reviewer',
      { status: 'REJECTED', reviewed_at: new Date(), review_note: 'Fix it.' },
    ],
    [
      'a REJECTED revision without date',
      { status: 'REJECTED', reviewed_by: 'admin', review_note: 'Fix it.' },
    ],
    [
      'a REJECTED revision without a note',
      { status: 'REJECTED', reviewed_by: 'admin', reviewed_at: new Date() },
    ],
    [
      'a REJECTED revision with only spaces as its note',
      { status: 'REJECTED', reviewed_by: 'admin', reviewed_at: new Date(), review_note: '   ' },
    ],
    ['a PENDING revision with a note', { review_note: 'Fix it.' }],
    [
      'a PENDING revision with a reviewer and date',
      { reviewed_by: 'admin', reviewed_at: new Date() },
    ],
    [
      'an APPROVED revision with a note',
      { status: 'APPROVED', reviewed_by: 'admin', reviewed_at: new Date(), review_note: 'Fine.' },
    ],
  ])('S04.2 AC3 refuses %s', async (_label, change) => {
    const failure = await revisionFailure((adminId) =>
      Object.fromEntries(
        Object.entries(change).map(([column, value]) => [
          column,
          value === 'admin' ? adminId : value,
        ]),
      ),
    );

    expect(failure).toEqual({ code: '23514', constraint: 'instrument_revisions_review_check' });
  });

  it.each([0, -1])('S04.2 AC3 refuses a version of %i', async (version) => {
    expect(await revisionFailure(() => ({ version }))).toEqual({
      code: '23514',
      constraint: 'instrument_revisions_version_check',
    });
  });

  it('S04.2 AC3 refuses a reviewer who is no user', async () => {
    expect(
      await revisionFailure(() => ({
        status: 'APPROVED',
        reviewed_by: NO_ID,
        reviewed_at: new Date(),
      })),
    ).toEqual({ code: '23503', constraint: 'instrument_revisions_reviewed_by_fkey' });
  });

  it('S04.2 AC3 refuses deleting a user who reviewed a revision', async () => {
    const failure = await failureOf(
      inRolledBackTransaction(async (query) => {
        const approved = await insertApproved(query);
        await query('DELETE FROM users WHERE id = $1', [approved.adminId]);
      }),
    );

    expect(failure).toEqual({ code: '23503', constraint: 'instrument_revisions_reviewed_by_fkey' });
  });

  it('S04.2 AC3 indexes the queue order and the photo, and keys (instrument_id, id)', async () => {
    const rows = await dataSource.query<Array<{ indexname: string; indexdef: string }>>(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename IN ('instrument_revisions', 'instruments') ORDER BY indexname`,
    );
    const definitions = Object.fromEntries(
      rows.map(({ indexname, indexdef }) => [indexname, indexdef]),
    );

    expect(definitions['instrument_revisions_status_submitted_at_idx']).toMatch(
      /\(status, submitted_at\)/,
    );
    expect(definitions['instrument_revisions_photo_id_idx']).toMatch(/\(photo_id\)/);
    expect(definitions['instrument_revisions_instrument_id_id_key']).toMatch(
      /UNIQUE INDEX .*\(instrument_id, id\)/,
    );
    expect(definitions['instruments_slug_key']).toMatch(/UNIQUE INDEX .*\(slug\)/);
  });

  it('S04.2 AC3 down undoes the migration', async () => {
    const migration = ALL_MIGRATIONS.find(({ name }) => name.startsWith('AddReviewAndPublishing'));
    expect(migration).toBeDefined();

    const columnsQuery = `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name IN ('instruments', 'instrument_revisions')
       ORDER BY table_name, column_name`;
    const constraintsQuery = `SELECT conname FROM pg_constraint
       WHERE conrelid IN ('instruments'::regclass, 'instrument_revisions'::regclass) ORDER BY conname`;
    const indexesQuery = `SELECT indexname FROM pg_indexes
       WHERE tablename IN ('instruments', 'instrument_revisions') ORDER BY indexname`;

    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      const before = {
        columns: (await runner.query(columnsQuery)) as Array<{ column_name: string }>,
        constraints: (await runner.query(constraintsQuery)) as Array<{ conname: string }>,
        indexes: (await runner.query(indexesQuery)) as Array<{ indexname: string }>,
      };
      await new migration!().down(runner);
      const after = {
        columns: (await runner.query(columnsQuery)) as Array<{ column_name: string }>,
        constraints: (await runner.query(constraintsQuery)) as Array<{ conname: string }>,
        indexes: (await runner.query(indexesQuery)) as Array<{ indexname: string }>,
      };

      const added = [
        'slug',
        'published_revision_id',
        'reviewed_by',
        'reviewed_at',
        'review_note',
        'version',
      ];
      expect(before.columns.map(({ column_name }) => column_name)).toEqual(
        expect.arrayContaining(added),
      );
      expect(after.columns).toEqual(
        before.columns.filter(({ column_name }) => !added.includes(column_name)),
      );
      const addedConstraints = [
        'instruments_slug_key',
        'instruments_slug_check',
        'instruments_published_check',
        'instruments_published_revision_fkey',
        'instrument_revisions_instrument_id_id_key',
        'instrument_revisions_review_check',
        'instrument_revisions_version_check',
        'instrument_revisions_reviewed_by_fkey',
      ];
      expect(before.constraints.map(({ conname }) => conname)).toEqual(
        expect.arrayContaining(addedConstraints),
      );
      expect(after.constraints).toEqual(
        before.constraints.filter(({ conname }) => !addedConstraints.includes(conname)),
      );
      const addedIndexes = [
        'instruments_slug_key',
        'instrument_revisions_instrument_id_id_key',
        'instrument_revisions_status_submitted_at_idx',
        'instrument_revisions_photo_id_idx',
      ];
      expect(after.indexes).toEqual(
        before.indexes.filter(({ indexname }) => !addedIndexes.includes(indexname)),
      );
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
