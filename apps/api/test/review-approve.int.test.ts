import { ErrorResponse, ReviewDecision, ReviewSubmission, Submission } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

const UNKNOWN_ID = '5c1f3d2e-8b7a-4c6d-9e0f-1a2b3c4d5e6f';

type SignedIn = { id: string; cookie: string };

/** The publishing and review columns of every instrument and revision, in a fixed order. */
interface Published {
  instruments: Array<Record<string, unknown>>;
  revisions: Array<Record<string, unknown>>;
}

describe('POST /api/admin/submissions/:id/approve', () => {
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

  function approve(cookie: string | undefined, id: string, body: unknown = { version: 1 }) {
    const call = http().post(`/api/admin/submissions/${id}/approve`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  function preview(cookie: string, id: string): request.Test {
    return http().get(`/api/admin/submissions/${id}`).set('Cookie', cookie);
  }

  function save(cookie: string | undefined, id: string, body: unknown): request.Test {
    const call = http().put(`/api/submissions/${id}`);
    return (cookie ? call.set('Cookie', cookie) : call).send(body as object);
  }

  async function published(): Promise<Published> {
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

  async function instrumentOf(revisionId: string): Promise<Record<string, unknown>> {
    const [row] = (await dataSource.query(
      `SELECT i.slug, i.published_revision_id
         FROM instruments i JOIN instrument_revisions r ON r.instrument_id = i.id
        WHERE r.id = $1`,
      [revisionId],
    )) as Array<Record<string, unknown>>;
    return row!;
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  describe('publishing', () => {
    it('S04.2 AC1 publishes the page: 200 ReviewDecision, the revision APPROVED by the admin, the instrument with slug and pointer', async () => {
      const submission = await submitPage(author);
      const before = Date.now();

      const response = await approve(admin.cookie, submission.id, { version: 1 });

      expect(response.status).toBe(200);
      expect(ReviewDecision.parse(response.body)).toEqual({
        id: submission.id,
        status: 'APPROVED',
        slug: 'rotary-evaporator',
      });
      const revision = await revisionRow(submission.id);
      expect(revision).toMatchObject({
        status: 'APPROVED',
        version: 1,
        reviewed_by: admin.id,
        review_note: null,
      });
      const reviewedAt = (revision.reviewed_at as Date).getTime();
      expect(reviewedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(reviewedAt).toBeLessThanOrEqual(Date.now() + 1000);
      expect((revision.submitted_at as Date).toISOString()).toBe(submission.submittedAt);
      expect(await instrumentOf(submission.id)).toEqual({
        slug: 'rotary-evaporator',
        published_revision_id: submission.id,
      });
    });

    it('S04.2 AC1 takes the page out of the review queue and shows it APPROVED in the preview', async () => {
      const submission = await submitPage(author);
      expect((await approve(admin.cookie, submission.id)).status).toBe(200);

      const queue = await http().get('/api/admin/review-queue').set('Cookie', admin.cookie);
      expect(queue.status).toBe(200);
      expect(queue.body).toEqual({ items: [] });

      const reread = await preview(admin.cookie, submission.id);
      expect(reread.status).toBe(200);
      expect(ReviewSubmission.parse(reread.body)).toMatchObject({ status: 'APPROVED', version: 1 });
    });

    it('S04.2 AC1 changes no other page', async () => {
      const submission = await submitPage(author);
      const untouched = await submitPage(other, 'Centrifuge');
      const before = (await published()).revisions.find((row) => row.id === untouched.id);

      expect((await approve(admin.cookie, submission.id)).status).toBe(200);

      const after = await published();
      expect(after.revisions.find((row) => row.id === untouched.id)).toEqual(before);
      expect(await instrumentOf(untouched.id)).toEqual({ slug: null, published_revision_id: null });
    });
  });

  describe('the address', () => {
    it('S04.2 AC2 makes the address from the name in lowercase ASCII with hyphens', async () => {
      const submission = await submitPage(author, 'Büchi R-300 / Rotavapor');

      const response = await approve(admin.cookie, submission.id);

      expect(response.status).toBe(200);
      expect(ReviewDecision.parse(response.body).slug).toBe('buchi-r-300-rotavapor');
      expect((await instrumentOf(submission.id)).slug).toBe('buchi-r-300-rotavapor');
    });

    it('S04.2 AC2 gives a second and a third same-name page -2 and -3', async () => {
      const first = await submitPage(author);
      const second = await submitPage(other);
      const third = await submitPage(author);

      const slugs: Array<string | null> = [];
      for (const submission of [first, second, third]) {
        const response = await approve(admin.cookie, submission.id);
        expect(response.status).toBe(200);
        slugs.push(ReviewDecision.parse(response.body).slug);
      }

      expect(slugs).toEqual(['rotary-evaporator', 'rotary-evaporator-2', 'rotary-evaporator-3']);
    });

    it('S04.2 AC2 answers instrument for a name with no letter or digit, and keeps 80 characters of a long one', async () => {
      const symbols = await submitPage(author, '— / ★ —');
      const long = await submitPage(author, 'Rotary evaporator '.repeat(6));

      const symbolsResponse = await approve(admin.cookie, symbols.id);
      const longResponse = await approve(admin.cookie, long.id);

      expect(ReviewDecision.parse(symbolsResponse.body).slug).toBe('instrument');
      const longSlug = ReviewDecision.parse(longResponse.body).slug!;
      expect(longSlug).toBe(`${'rotary-evaporator-'.repeat(4)}rotary-e`);
      expect(longSlug.length).toBe(80);
      expect(longSlug.endsWith('-')).toBe(false);
      expect(longSlug.startsWith('rotary-evaporator-rotary-evaporator')).toBe(true);
    });

    it('S04.2 AC2 gives two same-name pages approved at the same time two different addresses', async () => {
      const first = await submitPage(author);
      const second = await submitPage(other);

      const responses = await Promise.all([
        approve(admin.cookie, first.id),
        approve(secondAdmin.cookie, second.id),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
      const slugs = responses.map((response) => ReviewDecision.parse(response.body).slug);
      expect([...slugs].sort()).toEqual(['rotary-evaporator', 'rotary-evaporator-2']);
      expect((await instrumentOf(first.id)).slug).toBe(slugs[0]);
      expect((await instrumentOf(second.id)).slug).toBe(slugs[1]);
    });
  });

  describe('reviewed once', () => {
    it('S04.2 AC8 refuses a second approval with 409 ALREADY_REVIEWED and changes nothing', async () => {
      const submission = await submitPage(author);
      expect((await approve(admin.cookie, submission.id)).status).toBe(200);
      const before = await published();

      const again = await approve(secondAdmin.cookie, submission.id);

      expectError(again, 409, 'ALREADY_REVIEWED');
      expect(ErrorResponse.parse(again.body).message).toBe('This page has already been reviewed.');
      expect(await published()).toEqual(before);
      expect((await revisionRow(submission.id)).reviewed_by).toBe(admin.id);
    });

    it('S04.2 AC8 of two admins approving at the same moment, exactly one gets 200 and is the reviewer', async () => {
      const submission = await submitPage(author);

      const responses = await Promise.all([
        approve(admin.cookie, submission.id),
        approve(secondAdmin.cookie, submission.id),
      ]);

      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([200, 409]);
      const loser = responses.find((response) => response.status === 409)!;
      expectError(loser, 409, 'ALREADY_REVIEWED');
      const winner = responses[0]!.status === 200 ? admin : secondAdmin;
      expect((await revisionRow(submission.id)).reviewed_by).toBe(winner.id);
      expect(await instrumentOf(submission.id)).toEqual({
        slug: 'rotary-evaporator',
        published_revision_id: submission.id,
      });
    });

    it('S04.2 AC8 refuses to approve a rejected page with 409 ALREADY_REVIEWED', async () => {
      const submission = await submitPage(author);
      await dataSource.query(
        `UPDATE instrument_revisions
         SET status = 'REJECTED', reviewed_by = $2, reviewed_at = now(), review_note = 'Add the emergency number.'
         WHERE id = $1`,
        [submission.id, admin.id],
      );
      const before = await published();

      expectError(await approve(admin.cookie, submission.id), 409, 'ALREADY_REVIEWED');
      expect(await published()).toEqual(before);
    });
  });

  describe('the version the admin saw (C14)', () => {
    it('S04.2 AC9 refuses an outdated version with 409 SUBMISSION_CHANGED, publishes nothing, then approves the reloaded version', async () => {
      const submission = await submitPage(author);
      const seen = ReviewSubmission.parse((await preview(admin.cookie, submission.id)).body);
      expect(seen.version).toBe(1);

      const correction = await save(author.cookie, submission.id, {
        ...submission.content,
        description: 'Evaporates solvents gently under vacuum.',
      });
      expect(correction.status).toBe(200);
      const before = await published();

      const stale = await approve(admin.cookie, submission.id, { version: seen.version });

      expectError(stale, 409, 'SUBMISSION_CHANGED');
      expect(ErrorResponse.parse(stale.body).message).toBe(
        'This page changed since you opened it. Review it again.',
      );
      expect(await published()).toEqual(before);
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'PENDING',
        reviewed_by: null,
        reviewed_at: null,
      });
      expect(await instrumentOf(submission.id)).toEqual({
        slug: null,
        published_revision_id: null,
      });

      const reloaded = ReviewSubmission.parse((await preview(admin.cookie, submission.id)).body);
      expect(reloaded.version).toBe(2);
      expect(reloaded.page.content.description).toBe('Evaporates solvents gently under vacuum.');

      const response = await approve(admin.cookie, submission.id, { version: reloaded.version });
      expect(response.status).toBe(200);
      expect(ReviewDecision.parse(response.body).slug).toBe('rotary-evaporator');
    });

    it('S04.2 AC9 adds 1 to the version on every save by the author and keeps submittedAt', async () => {
      const submission = await submitPage(author);
      expect((await revisionRow(submission.id)).version).toBe(1);

      for (const [index, description] of ['First fix.', 'Second fix.', 'Second fix.'].entries()) {
        const response = await save(author.cookie, submission.id, {
          ...submission.content,
          description,
        });
        expect(response.status).toBe(200);
        expect(Submission.parse(response.body).submittedAt).toBe(submission.submittedAt);
        expect((await revisionRow(submission.id)).version).toBe(index + 2);
      }
      expect(
        ReviewSubmission.parse((await preview(admin.cookie, submission.id)).body).version,
      ).toBe(4);
    });

    it('S04.2 AC9 refuses a version newer than the stored one with 409 SUBMISSION_CHANGED', async () => {
      const submission = await submitPage(author);
      const before = await published();

      expectError(
        await approve(admin.cookie, submission.id, { version: 2 }),
        409,
        'SUBMISSION_CHANGED',
      );
      expect(await published()).toEqual(before);
    });

    it('S04.2 AC9 does not add to the version when a save is refused', async () => {
      const submission = await submitPage(author);

      expect((await save(other.cookie, submission.id, submission.content)).status).toBe(404);
      expect(
        (await save(author.cookie, submission.id, { ...submission.content, name: '' })).status,
      ).toBe(400);

      expect((await revisionRow(submission.id)).version).toBe(1);
    });
  });

  describe('an approved page for its author', () => {
    it("S04.2 AC10 answers the author's PUT on an approved page 409 ALREADY_REVIEWED and changes nothing", async () => {
      const submission = await submitPage(author);
      expect((await approve(admin.cookie, submission.id)).status).toBe(200);
      const before = await published();
      const hazardsBefore: unknown = await dataSource.query(
        'SELECT revision_id, hazard_type, note FROM revision_hazards ORDER BY hazard_type',
      );

      const response = await save(author.cookie, submission.id, {
        ...submission.content,
        description: 'Too late.',
        hazards: [{ type: 'HOT_SURFACE', note: 'Changed after approval.' }],
      });

      expectError(response, 409, 'ALREADY_REVIEWED');
      expect(ErrorResponse.parse(response.body).message).toBe(
        'This page has already been reviewed.',
      );
      expect(await published()).toEqual(before);
      expect(
        await dataSource.query(
          'SELECT revision_id, hazard_type, note FROM revision_hazards ORDER BY hazard_type',
        ),
      ).toEqual(hazardsBefore);
    });

    it('S04.2 AC10 answers every other caller 404 NOT_FOUND on PUT of an approved page, like an unknown id', async () => {
      const submission = await submitPage(author);
      expect((await approve(admin.cookie, submission.id)).status).toBe(200);
      const before = await published();
      const unknown = await save(author.cookie, UNKNOWN_ID, submission.content);
      expectError(unknown, 404, 'NOT_FOUND');

      for (const cookie of [
        undefined,
        pending.cookie,
        rejected.cookie,
        other.cookie,
        admin.cookie,
        secondAdmin.cookie,
      ]) {
        const response = await save(cookie, submission.id, {
          ...submission.content,
          description: 'Hijacked.',
        });
        expectError(response, 404, 'NOT_FOUND');
        expect(response.body).toEqual(unknown.body);
      }
      expect(await published()).toEqual(before);
    });
  });

  describe('refusals', () => {
    it('S04.2 AC11 answers an anonymous visitor 401 UNAUTHENTICATED and changes nothing', async () => {
      const submission = await submitPage(author);
      const before = await published();

      const response = await approve(undefined, submission.id);

      expectError(response, 401, 'UNAUTHENTICATED');
      expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
      expect(await published()).toEqual(before);
    });

    it('S04.2 AC11 answers a pending account, a rejected account, a contributor and the author 403 FORBIDDEN; nothing changes', async () => {
      const submission = await submitPage(author);
      const before = await published();

      for (const user of [pending, rejected, other, author]) {
        const response = await approve(user.cookie, submission.id);
        expectError(response, 403, 'FORBIDDEN');
        expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
      }
      expect(await published()).toEqual(before);
    });

    it('S04.2 AC11 answers an admin 400 VALIDATION_FAILED for a malformed id', async () => {
      expectError(await approve(admin.cookie, 'not-a-uuid'), 400, 'VALIDATION_FAILED');
    });

    it('S04.2 AC11 answers an admin 404 NOT_FOUND for an unknown id', async () => {
      await submitPage(author);
      const before = await published();

      expectError(await approve(admin.cookie, UNKNOWN_ID), 404, 'NOT_FOUND');
      expect(await published()).toEqual(before);
    });

    const badBodies: Array<[string, unknown]> = [
      ['an empty body', {}],
      ['version 0', { version: 0 }],
      ['a negative version', { version: -1 }],
      ['a fractional version', { version: 1.5 }],
      ['a version as text', { version: '1' }],
      ['a null version', { version: null }],
    ];
    for (const [what, body] of badBodies) {
      it(`S04.2 AC11 answers an admin 400 VALIDATION_FAILED for ${what}; nothing changes`, async () => {
        const submission = await submitPage(author);
        const before = await published();

        const response = await approve(admin.cookie, submission.id, body);

        expectError(response, 400, 'VALIDATION_FAILED');
        expect(ErrorResponse.parse(response.body).fields?.map((field) => field.path)).toContain(
          'version',
        );
        expect(await published()).toEqual(before);
      });
    }

    it('S04.2 AC11 refuses a foreign Origin with 403 FORBIDDEN before any change', async () => {
      const submission = await submitPage(author);
      const before = await published();

      const response = await approve(admin.cookie, submission.id).set(
        'Origin',
        'https://evil.example',
      );

      expectError(response, 403, 'FORBIDDEN');
      expect(await published()).toEqual(before);
    });
  });

  describe("an admin's own page", () => {
    it('S04.2 AC13 lets an admin approve the page they submitted themselves, with themselves as reviewer', async () => {
      const submission = await submitPage(admin);

      const response = await approve(admin.cookie, submission.id);

      expect(response.status).toBe(200);
      expect(ReviewDecision.parse(response.body)).toEqual({
        id: submission.id,
        status: 'APPROVED',
        slug: 'rotary-evaporator',
      });
      expect(await revisionRow(submission.id)).toMatchObject({
        status: 'APPROVED',
        reviewed_by: admin.id,
      });
      expect(await instrumentOf(submission.id)).toEqual({
        slug: 'rotary-evaporator',
        published_revision_id: submission.id,
      });
    });
  });
});
