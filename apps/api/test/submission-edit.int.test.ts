import { ErrorResponse, Submission } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';

type SignedIn = { id: string; cookie: string };

/** Everything stored about the submissions: revision rows and their child rows, in a fixed order. */
interface StoredPages {
  revisions: Array<Record<string, unknown>>;
  hazards: Array<Record<string, unknown>>;
  ppe: Array<Record<string, unknown>>;
}

describe('/api/submissions/:id', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let author: SignedIn;
  let other: SignedIn;
  let admin: SignedIn;
  let pending: SignedIn;
  let rejected: SignedIn;
  let labRoomId: string;
  let photoId: string;
  let submission: Submission;

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'false' });
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  const page = (overrides: Record<string, unknown> = {}) => ({
    ...validPage({ photoId, labRoomId }),
    ...overrides,
  });

  function read(cookie: string | undefined, id: string): request.Test {
    const call = http().get(`/api/submissions/${id}`);
    return cookie ? call.set('Cookie', cookie) : call;
  }

  function save(cookie: string | undefined, id: string, body: unknown): request.Test {
    const call = http().put(`/api/submissions/${id}`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  async function stored(): Promise<StoredPages> {
    return {
      revisions: (await dataSource.query(
        `SELECT id, kind, status, submitted_by, submitted_at, updated_at, name, description,
                photo_id, lab_room_id, hazard_level, training_required, training_given_by,
                no_significant_hazards, standard_lab_attire_only, hazard_pictograms,
                emergency_equipment
           FROM instrument_revisions ORDER BY id`,
      )) as Array<Record<string, unknown>>,
      hazards: (await dataSource.query(
        'SELECT revision_id, hazard_type, note FROM revision_hazards ORDER BY revision_id, hazard_type',
      )) as Array<Record<string, unknown>>,
      ppe: (await dataSource.query(
        `SELECT revision_id, equipment_item, note FROM revision_protective_equipment
          ORDER BY revision_id, equipment_item`,
      )) as Array<Record<string, unknown>>,
    };
  }

  function expectNotFound(response: request.Response): void {
    expect(response.status).toBe(404);
    expect(ErrorResponse.parse(response.body).code).toBe('NOT_FOUND');
  }

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
    const response = await http()
      .post('/api/submissions')
      .set('Cookie', author.cookie)
      .send(page());
    expect(response.status).toBe(201);
    submission = Submission.parse(response.body);
  });

  describe('GET /api/submissions/:id', () => {
    it('S03.2 AC4 gives the author the submission exactly as submitted, with submittedBy', async () => {
      const response = await read(author.cookie, submission.id);

      expect(response.status).toBe(200);
      const body = Submission.parse(response.body);
      expect(body).toEqual(submission);
      expect(body.submittedBy).toEqual({ id: author.id, name: 'Ada Author' });
      expect(body.content).toEqual(page());
    });

    it("S03.2 AC4 gives an approved admin someone else's pending submission", async () => {
      const response = await read(admin.cookie, submission.id);

      expect(response.status).toBe(200);
      expect(Submission.parse(response.body)).toEqual(submission);
    });

    it('S03.2 AC4 answers anonymous, pending, rejected and another contributor 404 like an unknown id', async () => {
      const unknown = await read(author.cookie, UNKNOWN_ID);
      expectNotFound(unknown);

      for (const cookie of [undefined, pending.cookie, rejected.cookie, other.cookie]) {
        const response = await read(cookie, submission.id);
        expectNotFound(response);
        expect(response.body).toEqual(unknown.body);
      }
    });

    it('S03.2 AC4 answers 404 to the author once their account is no longer approved', async () => {
      await dataSource.query(`UPDATE users SET status = 'REJECTED' WHERE id = $1`, [author.id]);

      expectNotFound(await read(author.cookie, submission.id));
    });

    it('S03.2 AC4 answers a malformed id with 400 VALIDATION_FAILED', async () => {
      const response = await read(author.cookie, 'not-a-uuid');

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).code).toBe('VALIDATION_FAILED');
    });

    it('S03.2 AC4 keeps GET /api/submissions/mine working next to :id', async () => {
      const response = await http().get('/api/submissions/mine').set('Cookie', author.cookie);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        submissions: [
          {
            id: submission.id,
            name: 'Rotary evaporator',
            status: 'PENDING',
            submittedAt: submission.submittedAt,
            slug: null,
            reviewNote: null,
          },
        ],
      });
    });
  });

  describe('PUT /api/submissions/:id', () => {
    it('S03.2 AC2 replaces the content and the child rows; still a pending NEW submission', async () => {
      const newPhoto = await insertPhoto(app, author.id);
      const changed = page({
        description: 'Evaporates solvents gently under vacuum.',
        photoId: newPhoto,
        hazards: [{ type: 'HOT_SURFACE', note: 'The bath now reaches 60 °C.' }],
        protectiveEquipment: [],
        standardLabAttireOnly: true,
        trainingRequired: false,
        trainingGivenBy: null,
        hazardLevel: 'LOW',
        pictograms: [],
      });
      const [before] = (await stored()).revisions;

      const response = await save(author.cookie, submission.id, changed);

      expect(response.status).toBe(200);
      const body = Submission.parse(response.body);
      expect(body.id).toBe(submission.id);
      expect(body.kind).toBe('NEW');
      expect(body.status).toBe('PENDING');
      expect(body.submittedAt).toBe(submission.submittedAt);
      expect(Date.parse(body.updatedAt)).toBeGreaterThan(Date.parse(submission.updatedAt));
      expect(body.submittedBy).toEqual({ id: author.id, name: 'Ada Author' });
      expect(body.content).toEqual(changed);

      const after = await stored();
      expect(after.revisions).toHaveLength(1);
      expect(after.revisions[0]).toMatchObject({
        id: submission.id,
        kind: 'NEW',
        status: 'PENDING',
        submitted_by: author.id,
        submitted_at: before!.submitted_at,
        description: 'Evaporates solvents gently under vacuum.',
        photo_id: newPhoto,
        hazard_level: 'LOW',
        training_required: false,
        training_given_by: null,
        standard_lab_attire_only: true,
        hazard_pictograms: [],
      });
      // The removed hazard (CHEMICAL_EXPOSURE) and both PPE rows are gone.
      expect(after.hazards).toEqual([
        {
          revision_id: submission.id,
          hazard_type: 'HOT_SURFACE',
          note: 'The bath now reaches 60 °C.',
        },
      ]);
      expect(after.ppe).toEqual([]);

      const reread = await read(author.cookie, submission.id);
      expect(Submission.parse(reread.body)).toEqual(body);
    });

    it('S03.2 AC2 stores trimmed texts and ignores kind, status and submittedBy in the body', async () => {
      const response = await save(
        author.cookie,
        submission.id,
        page({
          description: '  A new description.  ',
          status: 'APPROVED',
          kind: 'UPDATE',
          submittedBy: other.id,
          submittedAt: '2020-01-01T00:00:00.000Z',
        }),
      );

      expect(response.status).toBe(200);
      const body = Submission.parse(response.body);
      expect(body).toMatchObject({
        kind: 'NEW',
        status: 'PENDING',
        submittedAt: submission.submittedAt,
        submittedBy: { id: author.id },
      });
      expect(body.content.description).toBe('A new description.');
      const [row] = (await stored()).revisions;
      expect(row).toMatchObject({
        kind: 'NEW',
        status: 'PENDING',
        submitted_by: author.id,
        description: 'A new description.',
      });
    });

    it('S03.2 AC2 lets the author save the same page twice', async () => {
      const first = await save(author.cookie, submission.id, page({ description: 'One.' }));
      const second = await save(author.cookie, submission.id, page({ description: 'Two.' }));

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(Submission.parse(second.body).content.description).toBe('Two.');
      expect((await stored()).hazards).toHaveLength(2);
    });

    describe('S03.2 AC3 refuses an invalid body with 400 and leaves the stored page unchanged', () => {
      const cases: Array<[string, () => unknown, string[]]> = [
        ['a cleared required field', () => page({ description: '   ' }), ['description']],
        [
          'a hazard type without its note',
          () => page({ hazards: [{ type: 'HOT_SURFACE', note: '' }] }),
          ['hazards.0.note'],
        ],
        [
          "a hazard type together with 'No significant hazards'",
          () => page({ noSignificantHazards: true }),
          ['noSignificantHazards'],
        ],
        [
          'training required with hazard level Low',
          () => page({ hazardLevel: 'LOW' }),
          ['hazardLevel'],
        ],
        ['a category outside PRD §4.2', () => page({ category: 'KITCHEN' }), ['category']],
        [
          'a hazard type outside PRD §4.2',
          () => page({ hazards: [{ type: 'DRAGONS', note: 'Fire.' }] }),
          ['hazards.0.type'],
        ],
        [
          'a PPE item outside PRD §4.2',
          () => page({ protectiveEquipment: [{ item: 'CAPE', note: null }] }),
          ['protectiveEquipment.0.item'],
        ],
        ['a pictogram outside PRD §4.2', () => page({ pictograms: ['SKULL'] }), ['pictograms.0']],
        [
          'a pictogram listed twice',
          () => page({ pictograms: ['FLAMMABLE', 'FLAMMABLE'] }),
          ['pictograms'],
        ],
        ['a text longer than its limit', () => page({ name: 'x'.repeat(121) }), ['name']],
        [
          'a lab room id that is not in lab_rooms',
          () => page({ labRoomId: UNKNOWN_ID }),
          ['labRoomId'],
        ],
        ['a photo id that does not exist', () => page({ photoId: UNKNOWN_ID }), ['photoId']],
      ];

      for (const [what, body, paths] of cases) {
        it(`S03.2 AC3 ${what}`, async () => {
          const before = await stored();

          const response = await save(author.cookie, submission.id, body());

          expect(response.status).toBe(400);
          const error = ErrorResponse.parse(response.body);
          expect(error.code).toBe('VALIDATION_FAILED');
          expect((error.fields ?? []).map(({ path }) => path)).toEqual(paths);
          expect(await stored()).toEqual(before);
        });
      }
    });

    it('S03.2 AC3 refuses an empty body naming every required field', async () => {
      const before = await stored();

      const response = await save(author.cookie, submission.id, {});

      expect(response.status).toBe(400);
      const paths = (ErrorResponse.parse(response.body).fields ?? []).map(({ path }) => path);
      expect(paths).toEqual(
        expect.arrayContaining(['name', 'photoId', 'description', 'labRoomId']),
      );
      expect(await stored()).toEqual(before);
    });

    it("S03.2 AC3 refuses someone else's photo and an unknown room together", async () => {
      const othersPhoto = await insertPhoto(app, other.id);
      const before = await stored();

      const response = await save(
        author.cookie,
        submission.id,
        page({ photoId: othersPhoto, labRoomId: UNKNOWN_ID }),
      );

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'labRoomId', message: 'Choose a lab room' },
        { path: 'photoId', message: 'Upload a photo' },
      ]);
      expect(await stored()).toEqual(before);
    });

    it('S03.2 AC3 answers a malformed id with 400', async () => {
      const response = await save(author.cookie, 'not-a-uuid', page());

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).code).toBe('VALIDATION_FAILED');
    });

    it('S03.2 AC5 answers anonymous, pending, rejected, another contributor and an admin 404; nothing changes', async () => {
      const before = await stored();
      const unknown = await save(author.cookie, UNKNOWN_ID, page());
      expectNotFound(unknown);

      const callers = [undefined, pending.cookie, rejected.cookie, other.cookie, admin.cookie];
      for (const cookie of callers) {
        const response = await save(cookie, submission.id, page({ description: 'Hijacked.' }));
        expectNotFound(response);
        expect(response.body).toEqual(unknown.body);
      }
      expect(await stored()).toEqual(before);
    });

    it("S03.2 AC5 answers 404 to a contributor using their own photo on someone else's page", async () => {
      const othersPhoto = await insertPhoto(app, other.id);
      const before = await stored();

      expectNotFound(await save(other.cookie, submission.id, page({ photoId: othersPhoto })));
      expect(await stored()).toEqual(before);
    });

    it('S03.2 AC5 answers 404 to everyone but the author for a revision that is no longer pending; the author resubmits it (S04.3 AC6)', async () => {
      // A valid rejected row, as the review CHECK requires (S04.2 BE-02).
      await dataSource.query(
        `UPDATE instrument_revisions
         SET status = 'REJECTED', reviewed_by = $2, reviewed_at = now(), review_note = 'Add the emergency number.'
         WHERE id = $1`,
        [submission.id, admin.id],
      );
      const before = await stored();

      for (const cookie of [
        undefined,
        pending.cookie,
        rejected.cookie,
        other.cookie,
        admin.cookie,
      ]) {
        expectNotFound(await save(cookie, submission.id, page({ description: 'Late.' })));
      }
      expect(await stored()).toEqual(before);

      // Since S04.3 the author's save of a rejected revision is a resubmission, not a 404.
      const response = await save(author.cookie, submission.id, page({ description: 'Late.' }));
      expect(response.status).toBe(200);
      expect(Submission.parse(response.body)).toMatchObject({
        status: 'PENDING',
        reviewNote: null,
      });
    });

    it('S03.2 AC5 refuses a foreign Origin with 403 FORBIDDEN before any change', async () => {
      const before = await stored();

      const response = await save(author.cookie, submission.id, page({ description: 'X.' })).set(
        'Origin',
        'https://evil.example',
      );

      expect(response.status).toBe(403);
      expect(ErrorResponse.parse(response.body).code).toBe('FORBIDDEN');
      expect(await stored()).toEqual(before);
    });

    it('S03.2 AC7 after an edit, the public page and the photo still answer 404 to an anonymous visitor', async () => {
      const response = await save(author.cookie, submission.id, page({ description: 'Edited.' }));
      expect(response.status).toBe(200);

      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));
      expectNotFound(await http().get(`/api/photos/${photoId}`));
    });
  });
});
