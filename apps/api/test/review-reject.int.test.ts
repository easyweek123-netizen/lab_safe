import { ErrorResponse, ReviewDecision, ReviewSubmission, Submission } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';
const NOTE = 'The photo is blurry; add the waste step to Safe operation.';

type SignedIn = { id: string; cookie: string };

/** The publishing and review columns of every instrument and revision, in a fixed order. */
interface Stored {
  instruments: Array<Record<string, unknown>>;
  revisions: Array<Record<string, unknown>>;
}

describe('POST /api/admin/submissions/:id/reject', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let author: SignedIn;
  let other: SignedIn;
  let admin: SignedIn;
  let secondAdmin: SignedIn;
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
    secondAdmin = await createSignedInUser(app, {
      name: 'Bert Admin',
      email: 'admin2@lab.test',
      role: 'ADMIN',
      status: 'APPROVED',
    });
    pending = await createSignedInUser(app, { email: 'pending@lab.test', status: 'PENDING' });
    rejected = await createSignedInUser(app, { email: 'rejected@lab.test', status: 'REJECTED' });
    labRoomId = await firstLabRoomId(app);
  });

  const http = () => request(app.getHttpServer());

  /** Submits a valid page named `name` as `user` (with a photo of their own) and returns it. */
  async function submitPage(user: SignedIn, name = 'Rotary evaporator'): Promise<Submission> {
    const photoId = await insertPhoto(app, user.id);
    const response = await http()
      .post('/api/submissions')
      .set('Cookie', user.cookie)
      .send({ ...validPage({ photoId, labRoomId }), name });
    expect(response.status).toBe(201);
    return Submission.parse(response.body);
  }

  function reject(cookie: string | undefined, id: string, body: unknown = { note: NOTE }) {
    const call = http().post(`/api/admin/submissions/${id}/reject`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  function approve(cookie: string, id: string) {
    return http()
      .post(`/api/admin/submissions/${id}/approve`)
      .set('Cookie', cookie)
      .send({ version: 1 });
  }

  async function stored(): Promise<Stored> {
    return {
      instruments: (await dataSource.query(
        'SELECT id, slug, published_revision_id, updated_at FROM instruments ORDER BY id',
      )) as Array<Record<string, unknown>>,
      revisions: (await dataSource.query(
        `SELECT id, status, version, reviewed_by, reviewed_at, review_note, name, description,
                submitted_at, updated_at
           FROM instrument_revisions ORDER BY id`,
      )) as Array<Record<string, unknown>>,
    };
  }

  async function revisionRow(id: string): Promise<Record<string, unknown>> {
    const [row] = (await dataSource.query(
      `SELECT status, version, reviewed_by, reviewed_at, review_note, submitted_at
         FROM instrument_revisions WHERE id = $1`,
      [id],
    )) as Array<Record<string, unknown>>;
    return row!;
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  describe('rejecting', () => {
    it('S04.3 AC1 rejects the page: 200 ReviewDecision REJECTED, the trimmed note, the admin as reviewer and the current time', async () => {
      const submission = await submitPage(author);
      const before = Date.now();

      const response = await reject(admin.cookie, submission.id, { note: `  ${NOTE}\n ` });

      expect(response.status).toBe(200);
      expect(ReviewDecision.parse(response.body)).toEqual({
        id: submission.id,
        status: 'REJECTED',
        slug: null,
      });
      const revision = await revisionRow(submission.id);
      expect(revision).toMatchObject({
        status: 'REJECTED',
        version: 1,
        reviewed_by: admin.id,
        review_note: NOTE,
      });
      const reviewedAt = (revision.reviewed_at as Date).getTime();
      expect(reviewedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(reviewedAt).toBeLessThanOrEqual(Date.now() + 1000);
      expect((revision.submitted_at as Date).toISOString()).toBe(submission.submittedAt);
    });

    it('S04.3 AC1 keeps the line breaks inside the note word for word', async () => {
      const submission = await submitPage(author);
      const note = 'The photo is blurry.\n\nAdd the waste step to Safe operation.';

      expect((await reject(admin.cookie, submission.id, { note })).status).toBe(200);

      expect((await revisionRow(submission.id)).review_note).toBe(note);
    });

    it('S04.3 AC1 takes the page out of the review queue, shows it REJECTED in the preview and publishes nothing', async () => {
      const submission = await submitPage(author);
      expect((await reject(admin.cookie, submission.id)).status).toBe(200);

      const queue = await http().get('/api/admin/review-queue').set('Cookie', admin.cookie);
      expect(queue.status).toBe(200);
      expect(queue.body).toEqual({ items: [] });

      const reread = await http()
        .get(`/api/admin/submissions/${submission.id}`)
        .set('Cookie', admin.cookie);
      expect(reread.status).toBe(200);
      expect(ReviewSubmission.parse(reread.body).status).toBe('REJECTED');

      const [instrument] = (await dataSource.query(
        `SELECT i.slug, i.published_revision_id
           FROM instruments i JOIN instrument_revisions r ON r.instrument_id = i.id
          WHERE r.id = $1`,
        [submission.id],
      )) as Array<Record<string, unknown>>;
      expect(instrument).toEqual({ slug: null, published_revision_id: null });
    });

    it('S04.3 AC1 changes no other page', async () => {
      const submission = await submitPage(author);
      const untouched = await submitPage(other, 'Centrifuge');
      const before = (await stored()).revisions.find((row) => row.id === untouched.id);

      expect((await reject(admin.cookie, submission.id)).status).toBe(200);

      expect((await stored()).revisions.find((row) => row.id === untouched.id)).toEqual(before);
    });

    it('S04.3 AC1 lets an admin reject the page they submitted themselves', async () => {
      const submission = await submitPage(admin);

      expect((await reject(admin.cookie, submission.id)).status).toBe(200);

      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'REJECTED',
        reviewed_by: admin.id,
        review_note: NOTE,
      });
    });
  });

  describe('the note', () => {
    const missing: Array<[string, unknown]> = [
      ['no note', {}],
      ['an empty note', { note: '' }],
      ['a note of only spaces', { note: '   ' }],
      ['a note of only line breaks', { note: '\n \n' }],
      ['a null note', { note: null }],
      ['a note that is not text', { note: 42 }],
    ];
    for (const [what, body] of missing) {
      it(`S04.3 AC2 answers 400 VALIDATION_FAILED naming note for ${what}; the page stays pending`, async () => {
        const submission = await submitPage(author);
        const before = await stored();

        const response = await reject(admin.cookie, submission.id, body);

        expectError(response, 400, 'VALIDATION_FAILED');
        expect(ErrorResponse.parse(response.body).fields?.map((field) => field.path)).toEqual([
          'note',
        ]);
        expect(await stored()).toEqual(before);
        expect((await revisionRow(submission.id)).status).toBe('PENDING');
      });
    }

    it('S04.3 AC2 says "Enter a note for the contributor" for a note of only spaces and for no note', async () => {
      const submission = await submitPage(author);

      for (const body of [{ note: '   ' }, {}]) {
        const response = await reject(admin.cookie, submission.id, body);
        expectError(response, 400, 'VALIDATION_FAILED');
        expect(ErrorResponse.parse(response.body).fields).toEqual([
          { path: 'note', message: 'Enter a note for the contributor' },
        ]);
      }
    });

    it('S04.3 AC2 answers a note over 1000 characters 400 "The note must be at most 1000 characters"; nothing changes', async () => {
      const submission = await submitPage(author);
      const before = await stored();

      const response = await reject(admin.cookie, submission.id, { note: 'a'.repeat(1001) });

      expectError(response, 400, 'VALIDATION_FAILED');
      expect(ErrorResponse.parse(response.body).fields).toEqual([
        { path: 'note', message: 'The note must be at most 1000 characters' },
      ]);
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC2 accepts a note of exactly 1000 characters', async () => {
      const submission = await submitPage(author);
      const note = 'a'.repeat(1000);

      expect((await reject(admin.cookie, submission.id, { note })).status).toBe(200);
      expect((await revisionRow(submission.id)).review_note).toBe(note);
    });
  });

  describe('refusals', () => {
    it('S04.3 AC3 answers an anonymous visitor 401 UNAUTHENTICATED and changes nothing', async () => {
      const submission = await submitPage(author);
      const before = await stored();

      const response = await reject(undefined, submission.id);

      expectError(response, 401, 'UNAUTHENTICATED');
      expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC3 answers a pending account, a rejected account, a contributor and the author 403 FORBIDDEN; nothing changes', async () => {
      const submission = await submitPage(author);
      const before = await stored();

      for (const user of [pending, rejected, other, author]) {
        const response = await reject(user.cookie, submission.id);
        expectError(response, 403, 'FORBIDDEN');
        expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
      }
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC3 refuses to reject an approved page with 409 ALREADY_REVIEWED and changes nothing', async () => {
      const submission = await submitPage(author);
      expect((await approve(admin.cookie, submission.id)).status).toBe(200);
      const before = await stored();

      const response = await reject(secondAdmin.cookie, submission.id);

      expectError(response, 409, 'ALREADY_REVIEWED');
      expect(ErrorResponse.parse(response.body).message).toBe(
        'This page has already been reviewed.',
      );
      expect(await stored()).toEqual(before);
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'APPROVED',
        reviewed_by: admin.id,
        review_note: null,
      });
    });

    it('S04.3 AC3 refuses to reject a rejected page again with 409 ALREADY_REVIEWED and keeps the first note', async () => {
      const submission = await submitPage(author);
      expect((await reject(admin.cookie, submission.id)).status).toBe(200);
      const before = await stored();

      const response = await reject(secondAdmin.cookie, submission.id, { note: 'Another note.' });

      expectError(response, 409, 'ALREADY_REVIEWED');
      expect(await stored()).toEqual(before);
      expect(await revisionRow(submission.id)).toMatchObject({
        reviewed_by: admin.id,
        review_note: NOTE,
      });
    });

    it('S04.3 AC3 of two admins rejecting at the same moment, exactly one gets 200 and is the reviewer', async () => {
      const submission = await submitPage(author);

      const responses = await Promise.all([
        reject(admin.cookie, submission.id, { note: 'First note.' }),
        reject(secondAdmin.cookie, submission.id, { note: 'Second note.' }),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expectError(
        responses.find((response) => response.status === 409)!,
        409,
        'ALREADY_REVIEWED',
      );
      const adminWon = responses[0]!.status === 200;
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'REJECTED',
        reviewed_by: adminWon ? admin.id : secondAdmin.id,
        review_note: adminWon ? 'First note.' : 'Second note.',
      });
    });

    it('S04.3 AC3 refuses to approve a page that was just rejected with 409 ALREADY_REVIEWED', async () => {
      const submission = await submitPage(author);
      expect((await reject(admin.cookie, submission.id)).status).toBe(200);
      const before = await stored();

      expectError(await approve(secondAdmin.cookie, submission.id), 409, 'ALREADY_REVIEWED');
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC3 answers an admin 400 VALIDATION_FAILED for a malformed id', async () => {
      await submitPage(author);
      const before = await stored();

      expectError(await reject(admin.cookie, 'not-a-uuid'), 400, 'VALIDATION_FAILED');
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC3 answers an admin 404 NOT_FOUND for an unknown id', async () => {
      await submitPage(author);
      const before = await stored();

      expectError(await reject(admin.cookie, UNKNOWN_ID), 404, 'NOT_FOUND');
      expect(await stored()).toEqual(before);
    });

    it('S04.3 AC3 refuses a foreign Origin with 403 FORBIDDEN before any change', async () => {
      const submission = await submitPage(author);
      const before = await stored();

      const response = await reject(admin.cookie, submission.id).set(
        'Origin',
        'https://evil.example',
      );

      expectError(response, 403, 'FORBIDDEN');
      expect(await stored()).toEqual(before);
    });
  });
});
