import {
  ErrorResponse,
  MySubmissions,
  PublishedSafetyPage,
  ReviewQueue,
  ReviewSubmission,
  Submission,
} from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const NOTE = 'The photo is blurry;\nadd the waste step to Safe operation.';
const NEW_SAFE_OPERATION = 'Start the rotation before the vacuum. Collect the waste solvent.';

type SignedIn = { id: string; cookie: string };

describe('Rejected pages: read the note, fix and resubmit (S04.3)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let author: SignedIn;
  let other: SignedIn;
  let admin: SignedIn;
  let pending: SignedIn;
  let rejected: SignedIn;
  let labRoomId: string;

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
  });

  const http = () => request(app.getHttpServer());

  function page(photoId: string, overrides: Record<string, unknown> = {}) {
    return { ...validPage({ photoId, labRoomId }), ...overrides };
  }

  async function submitPage(user: SignedIn, name = 'Rotary evaporator'): Promise<Submission> {
    const photoId = await insertPhoto(app, user.id);
    const response = await http()
      .post('/api/submissions')
      .set('Cookie', user.cookie)
      .send(page(photoId, { name }));
    expect(response.status).toBe(201);
    return Submission.parse(response.body);
  }

  async function rejectPage(id: string, note = NOTE): Promise<void> {
    const response = await http()
      .post(`/api/admin/submissions/${id}/reject`)
      .set('Cookie', admin.cookie)
      .send({ note });
    expect(response.status).toBe(200);
  }

  async function approvePage(id: string): Promise<string> {
    const preview = await http().get(`/api/admin/submissions/${id}`).set('Cookie', admin.cookie);
    const { version } = ReviewSubmission.parse(preview.body);
    const response = await http()
      .post(`/api/admin/submissions/${id}/approve`)
      .set('Cookie', admin.cookie)
      .send({ version });
    expect(response.status).toBe(200);
    return (response.body as { slug: string }).slug;
  }

  /** Submits "Rotary evaporator" as the author and rejects it with `NOTE`. */
  async function rejectedPage(): Promise<Submission> {
    const submission = await submitPage(author);
    await rejectPage(submission.id);
    return submission;
  }

  function readOne(cookie: string | undefined, id: string) {
    const call = http().get(`/api/submissions/${id}`);
    return cookie ? call.set('Cookie', cookie) : call;
  }

  function save(cookie: string | undefined, id: string, body: unknown) {
    const call = http().put(`/api/submissions/${id}`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  async function mine(user: SignedIn): Promise<MySubmissions> {
    const response = await http().get('/api/submissions/mine').set('Cookie', user.cookie);
    expect(response.status).toBe(200);
    return MySubmissions.parse(response.body);
  }

  async function revisionRow(id: string): Promise<Record<string, unknown>> {
    const [row] = (await dataSource.query(
      `SELECT status, version, reviewed_by, reviewed_at, review_note, submitted_at, updated_at,
              photo_id, safe_operation, description
         FROM instrument_revisions WHERE id = $1`,
      [id],
    )) as Array<Record<string, unknown>>;
    return row!;
  }

  /** Every revision row with its child rows, to show that nothing changed. */
  async function stored(): Promise<unknown> {
    return {
      revisions: (await dataSource.query(
        'SELECT * FROM instrument_revisions ORDER BY id',
      )) as unknown[],
      hazards: (await dataSource.query(
        'SELECT * FROM revision_hazards ORDER BY revision_id, hazard_type',
      )) as unknown[],
      ppe: (await dataSource.query(
        'SELECT * FROM revision_protective_equipment ORDER BY revision_id, equipment_item',
      )) as unknown[],
      instruments: (await dataSource.query('SELECT * FROM instruments ORDER BY id')) as unknown[],
    };
  }

  function expectNotFound(response: request.Response): void {
    expect(response.status).toBe(404);
    expect(ErrorResponse.parse(response.body).code).toBe('NOT_FOUND');
  }

  describe('the note', () => {
    it('S04.3 AC4 GET /api/submissions/mine carries the note of a rejected page word for word, line breaks kept', async () => {
      const submission = await rejectedPage();

      const { submissions } = await mine(author);

      expect(submissions).toEqual([
        {
          id: submission.id,
          name: 'Rotary evaporator',
          status: 'REJECTED',
          submittedAt: submission.submittedAt,
          slug: null,
          reviewNote: NOTE,
        },
      ]);
    });

    it('S04.3 AC4 GET /api/submissions/:id carries the note for the author and an admin', async () => {
      const submission = await rejectedPage();

      for (const cookie of [author.cookie, admin.cookie]) {
        const response = await readOne(cookie, submission.id);
        expect(response.status).toBe(200);
        const body = Submission.parse(response.body);
        expect(body.status).toBe('REJECTED');
        expect(body.reviewNote).toBe(NOTE);
        expect(body.content).toEqual(submission.content);
      }
    });

    it('S04.3 AC4 a pending and an approved page carry reviewNote null in both reads', async () => {
      const stillPending = await submitPage(author, 'Fume hood');
      const approved = await submitPage(author, 'Centrifuge');
      await approvePage(approved.id);

      const { submissions } = await mine(author);
      expect(submissions.map((row) => [row.name, row.status, row.reviewNote])).toEqual([
        ['Centrifuge', 'APPROVED', null],
        ['Fume hood', 'PENDING', null],
      ]);
      for (const id of [stillPending.id, approved.id]) {
        const response = await readOne(author.cookie, id);
        expect(Submission.parse(response.body).reviewNote).toBeNull();
      }
    });

    it('S04.3 AC4 a rejected page shows its note only in the lists of its own author', async () => {
      await rejectedPage();
      await submitPage(other, 'Fume hood');

      expect((await mine(other)).submissions.map((row) => row.reviewNote)).toEqual([null]);
    });

    it('S04.3 AC4 no public response carries the note', async () => {
      const submission = await rejectedPage();
      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));

      const photo = await insertPhoto(app, author.id);
      expect(
        (
          await save(
            author.cookie,
            submission.id,
            page(photo, { safeOperation: NEW_SAFE_OPERATION }),
          )
        ).status,
      ).toBe(200);
      const slug = await approvePage(submission.id);

      const response = await http().get(`/api/instruments/${slug}`);
      expect(response.status).toBe(200);
      PublishedSafetyPage.parse(response.body);
      expect(JSON.stringify(response.body)).not.toContain('waste step');
      expect(JSON.stringify(response.body)).not.toContain('reviewNote');
    });
  });

  describe('resubmitting', () => {
    it('S04.3 AC6 resubmits a rejected page: 200 Submission PENDING, a new submittedAt, reviewNote null, the review columns cleared, version + 1', async () => {
      const submission = await rejectedPage();
      const before = await revisionRow(submission.id);
      const newPhoto = await insertPhoto(app, author.id);
      const sentAt = Date.now();

      const response = await save(
        author.cookie,
        submission.id,
        page(newPhoto, { safeOperation: NEW_SAFE_OPERATION }),
      );

      expect(response.status).toBe(200);
      const body = Submission.parse(response.body);
      expect(body).toMatchObject({
        id: submission.id,
        kind: 'NEW',
        status: 'PENDING',
        reviewNote: null,
        slug: null,
        submittedBy: { id: author.id, name: 'Ada Author' },
      });
      expect(body.content).toEqual(page(newPhoto, { safeOperation: NEW_SAFE_OPERATION }));
      expect(new Date(body.submittedAt).getTime()).toBeGreaterThanOrEqual(sentAt - 1000);
      expect(body.submittedAt).not.toBe(submission.submittedAt);

      const after = await revisionRow(submission.id);
      expect(after).toMatchObject({
        status: 'PENDING',
        version: (before.version as number) + 1,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        photo_id: newPhoto,
        safe_operation: NEW_SAFE_OPERATION,
      });
      expect((after.submitted_at as Date).getTime()).toBeGreaterThan(
        (before.submitted_at as Date).getTime(),
      );
      expect((after.submitted_at as Date).toISOString()).toBe(body.submittedAt);

      const { submissions } = await mine(author);
      expect(submissions).toEqual([
        {
          id: submission.id,
          name: 'Rotary evaporator',
          status: 'PENDING',
          submittedAt: body.submittedAt,
          slug: null,
          reviewNote: null,
        },
      ]);
    });

    it('S04.3 AC6 a pending correction still keeps its submittedAt', async () => {
      const submission = await submitPage(author);
      const photo = submission.content.photoId;

      const response = await save(
        author.cookie,
        submission.id,
        page(photo, { safeOperation: NEW_SAFE_OPERATION }),
      );

      expect(response.status).toBe(200);
      expect(Submission.parse(response.body).submittedAt).toBe(submission.submittedAt);
    });

    it('S04.3 AC6 the resubmitted page is back in "Pages to review" with the new date, after the pages submitted before it', async () => {
      const submission = await rejectedPage();
      const earlier = await submitPage(other, 'Fume hood');

      const response = await save(
        author.cookie,
        submission.id,
        page(submission.content.photoId, { safeOperation: NEW_SAFE_OPERATION }),
      );
      const resubmitted = Submission.parse(response.body);

      const queue = await http().get('/api/admin/review-queue').set('Cookie', admin.cookie);
      expect(queue.status).toBe(200);
      const { items } = ReviewQueue.parse(queue.body);
      expect(items.map((item) => [item.id, item.submittedAt])).toEqual([
        [earlier.id, earlier.submittedAt],
        [submission.id, resubmitted.submittedAt],
      ]);
    });

    it('S04.3 AC6 the resubmitted page can be approved with its new version', async () => {
      const submission = await rejectedPage();
      await save(author.cookie, submission.id, page(submission.content.photoId));

      const slug = await approvePage(submission.id);

      expect(slug).toBe('rotary-evaporator');
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'APPROVED',
        reviewed_by: admin.id,
        review_note: null,
      });
    });

    it('S04.3 AC7 an incomplete body answers 400 VALIDATION_FAILED naming the field; the page stays rejected with its note', async () => {
      const submission = await rejectedPage();
      const before = await stored();

      const response = await save(
        author.cookie,
        submission.id,
        page(submission.content.photoId, { safeOperation: '   ' }),
      );

      expect(response.status).toBe(400);
      const error = ErrorResponse.parse(response.body);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.fields?.map((field) => field.path)).toContain('safeOperation');
      expect(await stored()).toEqual(before);
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'REJECTED',
        review_note: NOTE,
      });
    });

    it("S04.3 AC7 an unknown lab room or someone else's photo answers 400 naming both; the page stays rejected", async () => {
      const submission = await rejectedPage();
      const othersPhoto = await insertPhoto(app, other.id);
      const before = await stored();

      const response = await save(
        author.cookie,
        submission.id,
        page(othersPhoto, { labRoomId: UNKNOWN_ID }),
      );

      expect(response.status).toBe(400);
      const error = ErrorResponse.parse(response.body);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.fields?.map((field) => field.path).sort()).toEqual(['labRoomId', 'photoId']);
      expect(await stored()).toEqual(before);
    });
  });

  describe("someone else's rejected page", () => {
    it('S04.3 AC8 GET /api/submissions/:id: the author and an admin 200; everyone else 404 with the body of an unknown id', async () => {
      const submission = await rejectedPage();
      const unknown = await readOne(author.cookie, UNKNOWN_ID);
      expectNotFound(unknown);

      for (const cookie of [author.cookie, admin.cookie]) {
        expect((await readOne(cookie, submission.id)).status).toBe(200);
      }
      for (const cookie of [undefined, pending.cookie, rejected.cookie, other.cookie]) {
        const response = await readOne(cookie, submission.id);
        expectNotFound(response);
        expect(response.body).toEqual(unknown.body);
      }
    });

    it('S04.3 AC8 PUT /api/submissions/:id with a valid body: an admin and everyone else 404, the page unchanged; the author 200', async () => {
      const submission = await rejectedPage();
      const unknown = await save(author.cookie, UNKNOWN_ID, page(submission.content.photoId));
      expectNotFound(unknown);
      const before = await stored();

      for (const user of [admin, pending, rejected, other]) {
        const ownPhoto = await insertPhoto(app, user.id);
        for (const photo of [submission.content.photoId, ownPhoto]) {
          const response = await save(
            user.cookie,
            submission.id,
            page(photo, { description: 'Hijacked.' }),
          );
          expectNotFound(response);
          expect(response.body).toEqual(unknown.body);
        }
      }
      const anonymous = await save(undefined, submission.id, page(submission.content.photoId));
      expectNotFound(anonymous);
      expect(anonymous.body).toEqual(unknown.body);
      // The extra photo rows are not part of the revision; compare the page itself.
      expect(await stored()).toEqual(before);

      const own = await save(author.cookie, submission.id, page(submission.content.photoId));
      expect(own.status).toBe(200);
    });

    it('S04.3 AC8 GET /api/photos/:id of its photo: the author and an admin 200; everyone else 404', async () => {
      const submission = await rejectedPage();
      const url = `/api/photos/${submission.content.photoId}`;

      for (const cookie of [author.cookie, admin.cookie]) {
        expect((await http().get(url).set('Cookie', cookie)).status).toBe(200);
      }
      expectNotFound(await http().get(url));
      for (const cookie of [pending.cookie, rejected.cookie, other.cookie]) {
        expectNotFound(await http().get(url).set('Cookie', cookie));
      }
    });
  });

  describe('nothing of it is public', () => {
    it('S04.3 AC9 while rejected, the public page and its photo answer 404 to an anonymous visitor', async () => {
      const submission = await rejectedPage();

      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));
      expectNotFound(await http().get(`/api/photos/${submission.content.photoId}`));
    });

    it('S04.3 AC9 after resubmitting with a new photo and approving, the new photo is public and the replaced photo answers 404 except to its owner', async () => {
      const submission = await rejectedPage();
      const replaced = submission.content.photoId;
      const newPhoto = await insertPhoto(app, author.id);

      const resubmitted = await save(
        author.cookie,
        submission.id,
        page(newPhoto, { safeOperation: NEW_SAFE_OPERATION }),
      );
      expect(resubmitted.status).toBe(200);
      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));
      expectNotFound(await http().get(`/api/photos/${newPhoto}`));

      const slug = await approvePage(submission.id);

      const publicPage = await http().get(`/api/instruments/${slug}`);
      expect(publicPage.status).toBe(200);
      const published = PublishedSafetyPage.parse(publicPage.body);
      expect(published.page.content.photoId).toBe(newPhoto);
      expect(published.page.content.safeOperation).toBe(NEW_SAFE_OPERATION);
      expect((await http().get(`/api/photos/${newPhoto}`)).status).toBe(200);

      expectNotFound(await http().get(`/api/photos/${replaced}`));
      expectNotFound(await http().get(`/api/photos/${replaced}`).set('Cookie', other.cookie));
      expect(
        (await http().get(`/api/photos/${replaced}`).set('Cookie', author.cookie)).status,
      ).toBe(200);
    });
  });
});
