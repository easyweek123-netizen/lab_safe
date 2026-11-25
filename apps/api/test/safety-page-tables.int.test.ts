import {
  CATEGORIES,
  EMERGENCY_EQUIPMENT,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  REVISION_KINDS,
  REVISION_STATUSES,
} from '@labsafe/shared';
import { DataSource, QueryFailedError } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertTestDatabase, TEST_DATABASE_URL } from '../scripts/test-db-guard';
import { dataSourceOptions } from '../src/db/data-source';
import { Session } from '../src/modules/auth/session.entity';
import { InstrumentRevision } from '../src/modules/instruments/instrument-revision.entity';
import { Instrument } from '../src/modules/instruments/instrument.entity';
import { RevisionHazard } from '../src/modules/instruments/revision-hazard.entity';
import { RevisionProtectiveEquipment } from '../src/modules/instruments/revision-protective-equipment.entity';
import { LabRoom } from '../src/modules/meta/lab-room.entity';
import { Photo } from '../src/modules/photos/photo.entity';
import { User } from '../src/modules/users/user.entity';

type Query = (sql: string, parameters?: unknown[]) => Promise<unknown>;

const valuesOf = (list: readonly { value: string }[]) => list.map(({ value }) => value);

/** The six emergency items, every one "not applicable". */
const ALL_NOT_APPLICABLE = Object.fromEntries(
  valuesOf(EMERGENCY_EQUIPMENT).map((item) => [item, { kind: 'NOT_APPLICABLE' }]),
);

/** The columns of a complete, valid revision row; a test overrides single columns. */
function validRevision(ids: {
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
    manufacturer: null,
    model: null,
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

describe('safety page tables', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    assertTestDatabase(TEST_DATABASE_URL);
    // Every entity the safety page tables relate to, so the schema builder compares all of them.
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

  /** The Postgres error code (SQLSTATE) of a failed query, or undefined if it did not fail. */
  async function sqlStateOf(promise: Promise<unknown>): Promise<string | undefined> {
    const error: unknown = await promise.then(
      () => undefined,
      (caught: unknown) => caught,
    );
    if (error === undefined) return undefined;
    expect(error).toBeInstanceOf(QueryFailedError);
    return (error as QueryFailedError<Error & { code?: string }>).driverError.code;
  }

  /** Inserts a user, a photo and an instrument, and returns the ids a revision needs. */
  async function insertParents(query: Query) {
    const [user] = (await query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ('Sara', 'sara@lab.test', 'x', 'CONTRIBUTOR', 'APPROVED') RETURNING id`,
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

  /** The SQL state of inserting a valid revision with `change` applied. */
  function revisionInsertState(change: Record<string, unknown>): Promise<string | undefined> {
    return sqlStateOf(
      inRolledBackTransaction(async (query) => {
        const ids = await insertParents(query);
        await insertRevision(query, { ...validRevision(ids), ...change });
      }),
    );
  }

  it('S03.1 AC13 the entities match the migrated tables (no pending schema change)', async () => {
    const pending = await dataSource.driver.createSchemaBuilder().log();

    expect(pending.upQueries.map(({ query }) => query)).toEqual([]);
  });

  it('S03.1 AC13 the tables have exactly the E03 columns', async () => {
    const rows = await dataSource.query<Array<{ table_name: string; columns: string[] }>>(
      `SELECT table_name, array_agg(column_name::text ORDER BY column_name) AS columns
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name IN
         ('photos', 'instruments', 'instrument_revisions', 'revision_hazards', 'revision_protective_equipment')
       GROUP BY table_name ORDER BY table_name`,
    );

    expect(
      Object.fromEntries(rows.map(({ table_name, columns }) => [table_name, columns])),
    ).toEqual({
      instrument_revisions: [
        'before_use',
        'category',
        'created_at',
        'description',
        'do_not',
        'emergency',
        'emergency_equipment',
        'emergency_phone',
        'hazard_level',
        'hazard_pictograms',
        'id',
        'instrument_id',
        'kind',
        'lab_room_id',
        'manufacturer',
        'model',
        'name',
        'no_significant_hazards',
        'photo_id',
        'responsible_contact',
        'responsible_name',
        'safe_operation',
        'standard_lab_attire_only',
        'status',
        'submitted_at',
        'submitted_by',
        'training_given_by',
        'training_required',
        'updated_at',
      ],
      instruments: ['created_at', 'created_by', 'id', 'updated_at'],
      photos: [
        'bytes',
        'content_type',
        'created_at',
        'height',
        'id',
        'owner_id',
        'updated_at',
        'width',
      ],
      revision_hazards: ['hazard_type', 'note', 'revision_id'],
      revision_protective_equipment: ['equipment_item', 'note', 'revision_id'],
    });
  });

  it('S03.1 AC13 the CHECK lists equal the shared constants', async () => {
    const rows = await dataSource.query<Array<{ conname: string; definition: string }>>(
      `SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
       WHERE conname = ANY($1::text[])`,
      [
        [
          'instrument_revisions_category_check',
          'instrument_revisions_hazard_level_check',
          'instrument_revisions_kind_check',
          'instrument_revisions_status_check',
          'instrument_revisions_hazard_pictograms_check',
          'instrument_revisions_emergency_equipment_check',
          'revision_hazards_hazard_type_check',
          'revision_protective_equipment_equipment_item_check',
        ],
      ],
    );
    const listed = Object.fromEntries(
      rows.map(({ conname, definition }) => [
        conname,
        [...definition.matchAll(/'([A-Z0-9_]+)'/g)].map((match) => match[1]),
      ]),
    );

    expect(listed).toEqual({
      instrument_revisions_category_check: valuesOf(CATEGORIES),
      instrument_revisions_hazard_level_check: valuesOf(HAZARD_LEVELS),
      instrument_revisions_kind_check: [...REVISION_KINDS],
      instrument_revisions_status_check: [...REVISION_STATUSES],
      instrument_revisions_hazard_pictograms_check: valuesOf(HAZARD_PICTOGRAMS),
      instrument_revisions_emergency_equipment_check: valuesOf(EMERGENCY_EQUIPMENT),
      revision_hazards_hazard_type_check: valuesOf(HAZARD_TYPES),
      revision_protective_equipment_equipment_item_check: valuesOf(PROTECTIVE_EQUIPMENT),
    });
  });

  it('S03.1 AC13 instrument_revisions.submitted_by and instrument_id are indexed', async () => {
    const rows = await dataSource.query<Array<{ indexname: string; indexdef: string }>>(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = 'instrument_revisions' ORDER BY indexname`,
    );

    expect(rows.map(({ indexname }) => indexname)).toEqual([
      'instrument_revisions_instrument_id_idx',
      'instrument_revisions_pkey',
      'instrument_revisions_submitted_by_idx',
    ]);
    expect(rows[0]?.indexdef).toMatch(/\(instrument_id\)/);
    expect(rows[2]?.indexdef).toMatch(/\(submitted_by\)/);
  });

  it('S03.1 AC13 accepts a complete revision with its hazard and PPE rows', async () => {
    const state = await sqlStateOf(
      inRolledBackTransaction(async (query) => {
        const ids = await insertParents(query);
        const revisionId = await insertRevision(query, validRevision(ids));
        await query(
          `INSERT INTO revision_hazards (revision_id, hazard_type, note) VALUES ($1, 'VACUUM', 'Glass under vacuum')`,
          [revisionId],
        );
        await query(
          `INSERT INTO revision_protective_equipment (revision_id, equipment_item, note) VALUES ($1, $2, NULL)`,
          [revisionId, valuesOf(PROTECTIVE_EQUIPMENT)[0]],
        );
      }),
    );

    expect(state).toBeUndefined();
  });

  it('S03.1 AC12 refuses a revision that requires training with hazard level LOW (23514)', async () => {
    expect(await revisionInsertState({ training_required: true, hazard_level: 'LOW' })).toBe(
      '23514',
    );
  });

  it.each([
    ['training required without who gives it', { training_given_by: null }],
    ['training required with only spaces as who gives it', { training_given_by: '   ' }],
    ['who gives the training without training', { training_required: false }],
  ])('S03.1 AC13 refuses a revision with %s (23514)', async (_label, change) => {
    expect(await revisionInsertState(change)).toBe('23514');
  });

  it.each([
    ['category', { category: 'KITCHEN' }],
    ['hazard_level', { hazard_level: 'EXTREME' }],
    ['kind', { kind: 'DRAFT' }],
    ['status', { status: 'DELETED' }],
    ['hazard_pictograms', { hazard_pictograms: ['FLAMMABLE', 'NOT_A_PICTOGRAM'] }],
  ])('S03.1 AC13 refuses a %s outside its fixed list (23514)', async (_label, change) => {
    expect(await revisionInsertState(change)).toBe('23514');
  });

  it.each([
    'name',
    'description',
    'responsible_name',
    'responsible_contact',
    'before_use',
    'safe_operation',
    'do_not',
    'emergency',
    'emergency_phone',
  ])('S03.1 AC13 refuses a blank %s (23514) and a missing one (23502)', async (column) => {
    expect(await revisionInsertState({ [column]: '  ' })).toBe('23514');
    expect(await revisionInsertState({ [column]: null })).toBe('23502');
  });

  it.each(['manufacturer', 'model'])(
    'S03.1 AC13 refuses a blank optional %s (23514)',
    async (column) => {
      expect(await revisionInsertState({ [column]: ' ' })).toBe('23514');
    },
  );

  it('S03.1 AC13 refuses an unknown lab room (foreign key violation 23503)', async () => {
    expect(await revisionInsertState({ lab_room_id: '00000000-0000-4000-8000-000000000000' })).toBe(
      '23503',
    );
  });

  it('S03.1 AC13 refuses an emergency_equipment without all six items (23514)', async () => {
    const five = Object.fromEntries(
      Object.entries(ALL_NOT_APPLICABLE).filter(([item]) => item !== 'EYEWASH'),
    );

    expect(await revisionInsertState({ emergency_equipment: JSON.stringify(five) })).toBe('23514');
  });

  it.each([
    ['a hazard type outside the list', 'revision_hazards', 'hazard_type', 'RADIATION', 'x'],
    ['a blank hazard note', 'revision_hazards', 'hazard_type', 'VACUUM', ' '],
    [
      'a PPE item outside the list',
      'revision_protective_equipment',
      'equipment_item',
      'HELMET',
      null,
    ],
    [
      'a blank PPE note',
      'revision_protective_equipment',
      'equipment_item',
      valuesOf(PROTECTIVE_EQUIPMENT)[0],
      ' ',
    ],
  ])('S03.1 AC13 refuses %s (23514)', async (_label, table, column, value, note) => {
    const state = await sqlStateOf(
      inRolledBackTransaction(async (query) => {
        const revisionId = await insertRevision(query, validRevision(await insertParents(query)));
        await query(`INSERT INTO ${table} (revision_id, ${column}, note) VALUES ($1, $2, $3)`, [
          revisionId,
          value,
          note,
        ]);
      }),
    );

    expect(state).toBe('23514');
  });

  it('S03.1 AC13 refuses the same hazard type twice on one revision (23505)', async () => {
    const state = await sqlStateOf(
      inRolledBackTransaction(async (query) => {
        const revisionId = await insertRevision(query, validRevision(await insertParents(query)));
        const insert = `INSERT INTO revision_hazards (revision_id, hazard_type, note) VALUES ($1, 'VACUUM', 'x')`;
        await query(insert, [revisionId]);
        await query(insert, [revisionId]);
      }),
    );

    expect(state).toBe('23505');
  });

  it('S03.1 AC13 deleting a revision removes its hazard and PPE rows', async () => {
    const counts = await inRolledBackTransaction(async (query) => {
      const revisionId = await insertRevision(query, validRevision(await insertParents(query)));
      await query(
        `INSERT INTO revision_hazards (revision_id, hazard_type, note) VALUES ($1, 'VACUUM', 'x')`,
        [revisionId],
      );
      await query(
        `INSERT INTO revision_protective_equipment (revision_id, equipment_item) VALUES ($1, $2)`,
        [revisionId, valuesOf(PROTECTIVE_EQUIPMENT)[0]],
      );
      await query('DELETE FROM instrument_revisions WHERE id = $1', [revisionId]);
      return query(
        `SELECT (SELECT count(*)::int FROM revision_hazards) AS hazards,
                (SELECT count(*)::int FROM revision_protective_equipment) AS ppe`,
      );
    });

    expect(counts).toEqual([{ hazards: 0, ppe: 0 }]);
  });

  it('S03.1 AC13 refuses deleting a photo or an instrument that a revision uses (23503)', async () => {
    const result = await inRolledBackTransaction(async (query) => {
      const ids = await insertParents(query);
      await insertRevision(query, validRevision(ids));
      // Each delete in its own savepoint, so the first failure does not abort the second.
      await query('SAVEPOINT photo');
      const photo = await sqlStateOf(query('DELETE FROM photos WHERE id = $1', [ids.photoId]));
      await query('ROLLBACK TO SAVEPOINT photo');
      const instrument = await sqlStateOf(
        query('DELETE FROM instruments WHERE id = $1', [ids.instrumentId]),
      );
      return { photo, instrument };
    });

    expect(result).toEqual({ photo: '23503', instrument: '23503' });
  });

  it('S03.1 AC13 the Photo entity never loads bytes unless asked for', async () => {
    const bytesSelected = dataSource
      .getRepository(Photo)
      .metadata.columns.find(({ propertyName }) => propertyName === 'bytes')?.isSelect;

    expect(bytesSelected).toBe(false);
  });
});
