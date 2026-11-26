import { ErrorResponse, MySubmissions, Submission } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const EMERGENCY_MISSING = "Give a location or choose 'Not applicable'";

type SignedIn = { id: string; cookie: string };

describe('/api/submissions', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let author: SignedIn;
  let other: SignedIn;
  let admin: SignedIn;
  let pending: SignedIn;
  let rejected: SignedIn;
  let labRoomId: string;
  let photoId: string;

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'false' });
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetTables();
    author = await createSignedInUser(app, {
      name: 'Ada Author',
      email: 'author@lab.test',
      status: 'APPROVED',
    });
    other = await createSignedInUser(app, {
      name: 'Otto Other',
      email: 'other@lab.test',
      status: 'APPROVED',
    });
    admin = await createSignedInUser(app, {
      name: 'Anna Admin',
      email: 'admin@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    pending = await createSignedInUser(app, { email: 'pending@lab.test', status: 'PENDING' });
    rejected = await createSignedInUser(app, { email: 'rejected@lab.test', status: 'REJECTED' });
    labRoomId = await firstLabRoomId(app);
    photoId = await insertPhoto(app, author.id);
  });

  const http = () => request(app.getHttpServer());

  function submit(cookie: string | undefined, body: unknown): request.Test {
    const call = http().post('/api/submissions');
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  function mine(cookie: string | undefined): request.Test {
    const call = http().get('/api/submissions/mine');
    return cookie ? call.set('Cookie', cookie) : call;
  }

  const page = (overrides: Record<string, unknown> = {}) => ({
    ...validPage({ photoId, labRoomId }),
    ...overrides,
  });

  /** Row counts of the four tables a submission writes. */
  async function counts(): Promise<Record<string, number>> {
    const rows: Array<Record<string, string>> = await dataSource.query(
      `SELECT (SELECT count(*) FROM instruments) AS instruments,
              (SELECT count(*) FROM instrument_revisions) AS revisions,
              (SELECT count(*) FROM revision_hazards) AS hazards,
              (SELECT count(*) FROM revision_protective_equipment) AS ppe`,
    );
    return Object.fromEntries(Object.entries(rows[0]!).map(([key, value]) => [key, Number(value)]));
  }

  const NOTHING = { instruments: 0, revisions: 0, hazards: 0, ppe: 0 };

  /** Expects 400 `VALIDATION_FAILED`, nothing written, and returns the fields as `path → message`. */
  async function expectRefused(response: request.Response): Promise<Record<string, string>> {
    expect(response.status).toBe(400);
    const body = ErrorResponse.parse(response.body);
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(await counts()).toEqual(NOTHING);
    return Object.fromEntries((body.fields ?? []).map(({ path, message }) => [path, message]));
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  describe('POST /api/submissions', () => {
    it('S03.1 AC8 stores a complete page as a pending NEW submission in all four tables', async () => {
      const before = Date.now();
      const response = await submit(author.cookie, page());

      expect(response.status).toBe(201);
      const submission = Submission.parse(response.body);
      expect(submission.kind).toBe('NEW');
      expect(submission.status).toBe('PENDING');
      expect(submission.submittedBy).toEqual({ id: author.id, name: 'Ada Author' });
      expect(Date.parse(submission.submittedAt)).toBeGreaterThanOrEqual(before - 1000);
      expect(submission.content).toEqual(page());

      expect(await counts()).toEqual({ instruments: 1, revisions: 1, hazards: 2, ppe: 2 });
      const [revision] = (await dataSource.query(
        `SELECT r.id, r.kind, r.status, r.submitted_by, i.created_by, r.name, r.photo_id,
                r.lab_room_id, r.training_given_by, r.hazard_pictograms, r.emergency_equipment
           FROM instrument_revisions r JOIN instruments i ON i.id = r.instrument_id`,
      )) as Array<Record<string, unknown>>;
      expect(revision).toMatchObject({
        id: submission.id,
        kind: 'NEW',
        status: 'PENDING',
        submitted_by: author.id,
        created_by: author.id,
        name: 'Rotary evaporator',
        photo_id: photoId,
        lab_room_id: labRoomId,
        training_given_by: 'Dr. Lee',
        hazard_pictograms: ['FLAMMABLE'],
        emergency_equipment: page().emergencyEquipment,
      });
      const hazards = (await dataSource.query(
        'SELECT revision_id, hazard_type, note FROM revision_hazards ORDER BY hazard_type',
      )) as Array<Record<string, unknown>>;
      expect(hazards).toEqual([
        {
          revision_id: submission.id,
          hazard_type: 'CHEMICAL_EXPOSURE',
          note: 'Solvent vapours escape when the flask is changed.',
        },
        {
          revision_id: submission.id,
          hazard_type: 'HOT_SURFACE',
          note: 'The water bath reaches 90 °C.',
        },
      ]);
      const ppe = (await dataSource.query(
        'SELECT revision_id, equipment_item, note FROM revision_protective_equipment ORDER BY equipment_item',
      )) as Array<Record<string, unknown>>;
      expect(ppe).toEqual([
        {
          revision_id: submission.id,
          equipment_item: 'CHEMICAL_RESISTANT_GLOVES',
          note: 'Change them after a spill.',
        },
        { revision_id: submission.id, equipment_item: 'SAFETY_GLASSES', note: null },
      ]);
    });

    it('S03.1 AC8 stores trimmed texts, drops the trainer without training and ignores unknown keys', async () => {
      const response = await submit(
        author.cookie,
        page({
          name: '  Rotary evaporator  ',
          manufacturer: '   ',
          trainingRequired: false,
          trainingGivenBy: 'Someone',
          noSignificantHazards: true,
          hazards: [],
          standardLabAttireOnly: true,
          protectiveEquipment: [],
          status: 'APPROVED',
          kind: 'UPDATE',
          submittedBy: other.id,
        }),
      );

      expect(response.status).toBe(201);
      const submission = Submission.parse(response.body);
      expect(submission.status).toBe('PENDING');
      expect(submission.kind).toBe('NEW');
      expect(submission.submittedBy.id).toBe(author.id);
      expect(submission.content).toMatchObject({
        name: 'Rotary evaporator',
        manufacturer: null,
        trainingRequired: false,
        trainingGivenBy: null,
        hazards: [],
        protectiveEquipment: [],
      });
      expect(await counts()).toEqual({ instruments: 1, revisions: 1, hazards: 0, ppe: 0 });
      const [row] = (await dataSource.query(
        'SELECT name, manufacturer, training_given_by, status, kind FROM instrument_revisions',
      )) as Array<Record<string, unknown>>;
      expect(row).toEqual({
        name: 'Rotary evaporator',
        manufacturer: null,
        training_given_by: null,
        status: 'PENDING',
        kind: 'NEW',
      });
    });

    it('S03.1 AC9 answers {} with a fields entry for every required field and writes nothing', async () => {
      const fields = await expectRefused(await submit(author.cookie, {}));

      expect(fields).toEqual({
        name: "Enter the instrument's name",
        photoId: 'Upload a photo',
        category: 'Choose a category',
        labRoomId: 'Choose a lab room',
        description: 'Enter a short description',
        responsibleName: "Enter the responsible person's name",
        responsibleContact: "Enter the responsible person's email or phone extension",
        hazardLevel: 'Choose a hazard level',
        trainingRequired: 'Choose whether training is required',
        hazards: "Choose at least one hazard, or 'No significant hazards'",
        protectiveEquipment: "Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
        beforeUse: 'Fill in Before use',
        safeOperation: 'Fill in Safe operation',
        doNot: 'Fill in Do NOT',
        emergency: 'Fill in Emergency & first aid',
        emergencyPhone: 'Enter the emergency phone number',
        'emergencyEquipment.EYEWASH': EMERGENCY_MISSING,
        'emergencyEquipment.SAFETY_SHOWER': EMERGENCY_MISSING,
        'emergencyEquipment.FIRE_EXTINGUISHER': EMERGENCY_MISSING,
        'emergencyEquipment.SPILL_KIT': EMERGENCY_MISSING,
        'emergencyEquipment.FIRST_AID_KIT': EMERGENCY_MISSING,
        'emergencyEquipment.EMERGENCY_STOP': EMERGENCY_MISSING,
      });
    });

    it('S03.1 AC9 counts a text of only spaces as missing', async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ name: '   ', beforeUse: ' \n ', emergencyPhone: ' ' })),
      );

      expect(fields).toEqual({
        name: "Enter the instrument's name",
        beforeUse: 'Fill in Before use',
        emergencyPhone: 'Enter the emergency phone number',
      });
    });

    describe('S03.1 AC10 names exactly the one gap', () => {
      const cases: Array<[string, () => Record<string, unknown>, Record<string, string>]> = [
        [
          'no hazard type and no "No significant hazards"',
          () => page({ hazards: [], noSignificantHazards: false }),
          { hazards: "Choose at least one hazard, or 'No significant hazards'" },
        ],
        [
          'a hazard type without its note',
          () => page({ hazards: [{ type: 'HOT_SURFACE', note: '  ' }] }),
          { 'hazards.0.note': 'Describe how this hazard arises' },
        ],
        [
          'no PPE item and no "No PPE beyond standard lab attire"',
          () => page({ protectiveEquipment: [], standardLabAttireOnly: false }),
          {
            protectiveEquipment:
              "Choose at least one PPE item, or 'No PPE beyond standard lab attire'",
          },
        ],
        [
          'an emergency item with neither a location nor "Not applicable"',
          () =>
            page({
              emergencyEquipment: {
                ...page().emergencyEquipment,
                SPILL_KIT: { kind: 'LOCATION', location: ' ' },
              },
            }),
          { 'emergencyEquipment.SPILL_KIT': EMERGENCY_MISSING },
        ],
        [
          'training required without who gives it',
          () => page({ trainingRequired: true, trainingGivenBy: '' }),
          { trainingGivenBy: 'Enter who gives the training' },
        ],
      ];

      for (const [gap, body, expected] of cases) {
        it(`S03.1 AC10 ${gap}`, async () => {
          expect(await expectRefused(await submit(author.cookie, body()))).toEqual(expected);
        });
      }
    });

    it("S03.1 AC11 refuses a hazard type together with 'No significant hazards'", async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ noSignificantHazards: true })),
      );

      expect(fields).toEqual({
        noSignificantHazards: "Choose hazards or 'No significant hazards', not both.",
      });
    });

    it("S03.1 AC11 refuses a PPE item together with 'No PPE beyond standard lab attire'", async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ standardLabAttireOnly: true })),
      );

      expect(fields).toEqual({
        standardLabAttireOnly: "Choose PPE items or 'No PPE beyond standard lab attire', not both.",
      });
    });

    it('S03.1 AC12 refuses training required with hazard level Low on hazardLevel', async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ trainingRequired: true, hazardLevel: 'LOW' })),
      );

      expect(fields).toEqual({
        hazardLevel: "A page that requires training can't have a Low hazard level.",
      });
    });

    describe('S03.1 AC13 refuses a value the contract does not allow', () => {
      const cases: Array<[string, () => Record<string, unknown>, string]> = [
        ['a category outside PRD §4.2', () => page({ category: 'KITCHEN' }), 'category'],
        [
          'a hazard type outside PRD §4.2',
          () => page({ hazards: [{ type: 'DRAGONS', note: 'Fire.' }] }),
          'hazards.0.type',
        ],
        [
          'a PPE item outside PRD §4.2',
          () => page({ protectiveEquipment: [{ item: 'CAPE', note: null }] }),
          'protectiveEquipment.0.item',
        ],
        ['a GHS pictogram outside PRD §4.2', () => page({ pictograms: ['SKULL'] }), 'pictograms.0'],
        [
          'a hazard type listed twice',
          () =>
            page({
              hazards: [
                { type: 'HOT_SURFACE', note: 'The bath.' },
                { type: 'HOT_SURFACE', note: 'The flask.' },
              ],
            }),
          'hazards',
        ],
        [
          'a pictogram listed twice',
          () => page({ pictograms: ['FLAMMABLE', 'FLAMMABLE'] }),
          'pictograms',
        ],
        ['a text longer than its limit', () => page({ name: 'x'.repeat(121) }), 'name'],
        ['a guideline longer than its limit', () => page({ doNot: 'x'.repeat(4001) }), 'doNot'],
      ];

      for (const [what, body, path] of cases) {
        it(`S03.1 AC13 ${what}`, async () => {
          const fields = await expectRefused(await submit(author.cookie, body()));
          expect(Object.keys(fields)).toEqual([path]);
        });
      }
    });

    it('S03.1 AC13 refuses a lab room id that is not in lab_rooms', async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ labRoomId: UNKNOWN_ID })),
      );

      expect(fields).toEqual({ labRoomId: 'Choose a lab room' });
    });

    it('S03.1 AC13 refuses a photo id that does not exist', async () => {
      const fields = await expectRefused(
        await submit(author.cookie, page({ photoId: UNKNOWN_ID })),
      );

      expect(fields).toEqual({ photoId: 'Upload a photo' });
    });

    it('S03.1 AC13 refuses a photo uploaded by someone else, also for an admin', async () => {
      const othersPhoto = await insertPhoto(app, other.id);

      expect(
        await expectRefused(await submit(author.cookie, page({ photoId: othersPhoto }))),
      ).toEqual({ photoId: 'Upload a photo' });
      expect(
        await expectRefused(await submit(admin.cookie, page({ photoId: othersPhoto }))),
      ).toEqual({ photoId: 'Upload a photo' });
    });

    it('S03.1 AC13 names an unknown room and a foreign photo together', async () => {
      const othersPhoto = await insertPhoto(app, other.id);

      const fields = await expectRefused(
        await submit(author.cookie, page({ labRoomId: UNKNOWN_ID, photoId: othersPhoto })),
      );

      expect(fields).toEqual({ labRoomId: 'Choose a lab room', photoId: 'Upload a photo' });
    });

    it('S03.1 AC14 refuses an anonymous visitor with 401 and writes nothing', async () => {
      expectError(await submit(undefined, page()), 401, 'UNAUTHENTICATED');
      expect(await counts()).toEqual(NOTHING);
    });

    it('S03.1 AC14 refuses pending and rejected accounts with 403 and writes nothing', async () => {
      for (const caller of [pending, rejected]) {
        const ownPhoto = await insertPhoto(app, caller.id);
        expectError(await submit(caller.cookie, page({ photoId: ownPhoto })), 403, 'FORBIDDEN');
      }
      expect(await counts()).toEqual(NOTHING);
    });

    it('S03.1 AC14 lets an admin submit (201)', async () => {
      const adminPhoto = await insertPhoto(app, admin.id);

      const response = await submit(admin.cookie, page({ photoId: adminPhoto }));

      expect(response.status).toBe(201);
      expect(Submission.parse(response.body).submittedBy).toEqual({
        id: admin.id,
        name: 'Anna Admin',
      });
    });

    it('S03.1 AC19 a submitted page has no public page and its photo stays hidden', async () => {
      expect((await submit(author.cookie, page())).status).toBe(201);

      expectError(await http().get('/api/instruments/rotary-evaporator'), 404, 'NOT_FOUND');
      expectError(await http().get(`/api/photos/${photoId}`), 404, 'NOT_FOUND');
    });
  });

  describe('GET /api/submissions/mine', () => {
    it("S03.1 AC16 lists only the caller's own submissions, newest first", async () => {
      const first = Submission.parse(
        (await submit(author.cookie, page({ name: 'Rotary evaporator' }))).body,
      );
      const second = Submission.parse(
        (await submit(author.cookie, page({ name: 'Muffle furnace' }))).body,
      );
      const adminPhoto = await insertPhoto(app, admin.id);
      expect((await submit(admin.cookie, page({ photoId: adminPhoto }))).status).toBe(201);

      const response = await mine(author.cookie);

      expect(response.status).toBe(200);
      expect(MySubmissions.parse(response.body)).toEqual({
        submissions: [
          {
            id: second.id,
            name: 'Muffle furnace',
            status: 'PENDING',
            submittedAt: second.submittedAt,
            slug: null,
            reviewNote: null,
          },
          {
            id: first.id,
            name: 'Rotary evaporator',
            status: 'PENDING',
            submittedAt: first.submittedAt,
            slug: null,
            reviewNote: null,
          },
        ],
      });
    });

    it('S03.1 AC16 gives a contributor without submissions an empty list', async () => {
      expect((await submit(author.cookie, page())).status).toBe(201);

      const response = await mine(other.cookie);

      expect(response.status).toBe(200);
      expect(MySubmissions.parse(response.body)).toEqual({ submissions: [] });
    });

    it('S03.1 AC14 refuses an anonymous visitor with 401', async () => {
      expectError(await mine(undefined), 401, 'UNAUTHENTICATED');
    });

    it('S03.1 AC14 refuses pending and rejected accounts with 403', async () => {
      expectError(await mine(pending.cookie), 403, 'FORBIDDEN');
      expectError(await mine(rejected.cookie), 403, 'FORBIDDEN');
    });
  });
});
