import {
  ErrorResponse,
  ReviewQueue,
  ReviewQueueItem,
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

type SignedIn = { id: string; cookie: string };

describe('/api/admin/review-queue and /api/admin/submissions/:id', () => {
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

  /** Marks a revision as rejected by the admin, as the review CHECK requires (S04.2 BE-02). */
  async function markRejected(id: string): Promise<void> {
    await dataSource.query(
      `UPDATE instrument_revisions
       SET status = 'REJECTED', reviewed_by = $2, reviewed_at = now(), review_note = 'Add the emergency number.'
       WHERE id = $1`,
      [id, admin.id],
    );
  }

  function queue(cookie: string | undefined): request.Test {
    const call = http().get('/api/admin/review-queue');
    return cookie ? call.set('Cookie', cookie) : call;
  }

  function preview(cookie: string | undefined, id: string): request.Test {
    const call = http().get(`/api/admin/submissions/${id}`);
    return cookie ? call.set('Cookie', cookie) : call;
  }

  /** Submits a valid page named `name` as `user` (with a photo of their own) and returns it. */
  async function submitPage(user: SignedIn, name: string): Promise<Submission> {
    const photoId = await insertPhoto(app, user.id);
    const response = await http()
      .post('/api/submissions')
      .set('Cookie', user.cookie)
      .send({ ...validPage({ photoId, labRoomId }), name });
    expect(response.status).toBe(201);
    return Submission.parse(response.body);
  }

  async function setSubmittedAt(id: string, at: string): Promise<void> {
    await dataSource.query('UPDATE instrument_revisions SET submitted_at = $2 WHERE id = $1', [
      id,
      at,
    ]);
  }

  function expectError(response: request.Response, status: number, code: string): void {
    expect(response.status).toBe(status);
    expect(ErrorResponse.parse(response.body).code).toBe(code);
  }

  describe('GET /api/admin/review-queue', () => {
    it("S04.1 AC1 lists every pending page, the admin's own too, oldest submission first", async () => {
      const newest = await submitPage(author, 'Rotary evaporator');
      const oldest = await submitPage(other, 'Centrifuge');
      const middle = await submitPage(admin, 'Fume hood');
      await setSubmittedAt(newest.id, '2026-11-25T10:00:00.000Z');
      await setSubmittedAt(oldest.id, '2026-11-23T10:00:00.000Z');
      await setSubmittedAt(middle.id, '2026-11-24T10:00:00.000Z');

      const response = await queue(admin.cookie);

      expect(response.status).toBe(200);
      const body = ReviewQueue.parse(response.body);
      expect(body.items).toEqual([
        {
          id: oldest.id,
          name: 'Centrifuge',
          kind: 'NEW',
          submittedBy: { id: other.id, name: 'Otto Other' },
          submittedAt: '2026-11-23T10:00:00.000Z',
        },
        {
          id: middle.id,
          name: 'Fume hood',
          kind: 'NEW',
          submittedBy: { id: admin.id, name: 'Anna Admin' },
          submittedAt: '2026-11-24T10:00:00.000Z',
        },
        {
          id: newest.id,
          name: 'Rotary evaporator',
          kind: 'NEW',
          submittedBy: { id: author.id, name: 'Ada Author' },
          submittedAt: '2026-11-25T10:00:00.000Z',
        },
      ]);
    });

    it('S04.1 AC1 holds no content and no email in the items', async () => {
      await submitPage(author, 'Rotary evaporator');

      const response = await queue(admin.cookie);

      expect(response.status).toBe(200);
      const items = (response.body as { items: Array<Record<string, unknown>> }).items;
      expect(items).toHaveLength(1);
      expect(Object.keys(items[0]!).sort()).toEqual(
        ['id', 'kind', 'name', 'submittedAt', 'submittedBy'].sort(),
      );
      expect(Object.keys(items[0]!.submittedBy as object).sort()).toEqual(['id', 'name']);
      expect(ReviewQueueItem.parse(items[0])).toEqual(items[0]);
      const text = JSON.stringify(response.body);
      expect(text).not.toContain('author@lab.test');
      expect(text).not.toContain('Removes solvents');
    });

    it('S04.1 AC1 lists only PENDING revisions and orders equal dates by id', async () => {
      const first = await submitPage(author, 'Rotary evaporator');
      const second = await submitPage(other, 'Centrifuge');
      const done = await submitPage(other, 'Fume hood');
      const at = '2026-11-24T10:00:00.000Z';
      await setSubmittedAt(first.id, at);
      await setSubmittedAt(second.id, at);
      await markRejected(done.id);

      const response = await queue(admin.cookie);

      expect(response.status).toBe(200);
      const ids = ReviewQueue.parse(response.body).items.map((item) => item.id);
      expect(ids).toEqual([first.id, second.id].sort());
    });

    it('S04.1 AC1 keeps the date and place of a pending page after its author corrects it', async () => {
      const corrected = await submitPage(author, 'Rotary evaporator');
      const later = await submitPage(other, 'Centrifuge');
      await setSubmittedAt(corrected.id, '2026-11-23T10:00:00.000Z');
      await setSubmittedAt(later.id, '2026-11-24T10:00:00.000Z');

      const save = await http()
        .put(`/api/submissions/${corrected.id}`)
        .set('Cookie', author.cookie)
        .send({ ...corrected.content, name: 'Rotary evaporator (Büchi R-300)' });
      expect(save.status).toBe(200);

      const response = await queue(admin.cookie);

      expect(response.status).toBe(200);
      const items = ReviewQueue.parse(response.body).items;
      expect(items.map((item) => item.id)).toEqual([corrected.id, later.id]);
      expect(items[0]).toMatchObject({
        name: 'Rotary evaporator (Büchi R-300)',
        submittedAt: '2026-11-23T10:00:00.000Z',
      });
    });

    it('S04.1 AC1 answers an empty list when no page is pending', async () => {
      const response = await queue(admin.cookie);

      expect(response.status).toBe(200);
      expect(ReviewQueue.parse(response.body)).toEqual({ items: [] });
    });
  });

  describe('GET /api/admin/submissions/:id', () => {
    it('S04.1 AC4 gives the admin the page as SafetyPageDisplay with labRoom and lastApproved null', async () => {
      const submission = await submitPage(author, 'Rotary evaporator');
      const [room] = (await dataSource.query('SELECT id, code, name FROM lab_rooms WHERE id = $1', [
        labRoomId,
      ])) as Array<{ id: string; code: string; name: string }>;

      const response = await preview(admin.cookie, submission.id);

      expect(response.status).toBe(200);
      const body = ReviewSubmission.parse(response.body);
      expect(body).toEqual({
        id: submission.id,
        kind: 'NEW',
        status: 'PENDING',
        submittedAt: submission.submittedAt,
        submittedBy: { id: author.id, name: 'Ada Author' },
        version: 1,
        page: {
          content: submission.content,
          labRoom: { id: room!.id, code: room!.code, name: room!.name },
          lastApproved: null,
        },
      });
      expect(body.page.content).toEqual({
        ...validPage({ photoId: submission.content.photoId, labRoomId }),
        name: 'Rotary evaporator',
      });
      expect(JSON.stringify(response.body)).not.toContain('author@lab.test');
    });

    it('S04.1 AC4 keeps hazards and protective equipment in PRD list order', async () => {
      const photoId = await insertPhoto(app, author.id);
      const page = validPage({ photoId, labRoomId });
      const created = await http()
        .post('/api/submissions')
        .set('Cookie', author.cookie)
        .send({
          ...page,
          hazards: [...page.hazards].reverse(),
          protectiveEquipment: [...page.protectiveEquipment].reverse(),
        });
      expect(created.status).toBe(201);
      const id = Submission.parse(created.body).id;

      const response = await preview(admin.cookie, id);

      expect(response.status).toBe(200);
      const content = ReviewSubmission.parse(response.body).page.content;
      expect(content.hazards).toEqual(page.hazards);
      expect(content.protectiveEquipment).toEqual(page.protectiveEquipment);
    });

    it('S04.1 AC4 gives the admin their own page and a page of any status', async () => {
      const own = await submitPage(admin, 'Fume hood');
      const done = await submitPage(author, 'Centrifuge');
      await markRejected(done.id);

      const ownResponse = await preview(admin.cookie, own.id);
      expect(ownResponse.status).toBe(200);
      expect(ReviewSubmission.parse(ownResponse.body).submittedBy).toEqual({
        id: admin.id,
        name: 'Anna Admin',
      });

      const doneResponse = await preview(admin.cookie, done.id);
      expect(doneResponse.status).toBe(200);
      expect(ReviewSubmission.parse(doneResponse.body).status).toBe('REJECTED');
    });
  });

  describe('refusals', () => {
    it('S04.1 AC7 answers an anonymous visitor 401 UNAUTHENTICATED on both routes, with no page name', async () => {
      const submission = await submitPage(author, 'Rotary evaporator');

      for (const response of [await queue(undefined), await preview(undefined, submission.id)]) {
        expectError(response, 401, 'UNAUTHENTICATED');
        expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
      }
    });

    it("S04.1 AC7 answers pending, rejected, a contributor and the page's author 403 FORBIDDEN, with no page name", async () => {
      const submission = await submitPage(author, 'Rotary evaporator');

      for (const user of [pending, rejected, other, author]) {
        for (const response of [
          await queue(user.cookie),
          await preview(user.cookie, submission.id),
        ]) {
          expectError(response, 403, 'FORBIDDEN');
          expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
        }
      }
    });

    it('S04.1 AC7 answers an admin 404 NOT_FOUND for an unknown id', async () => {
      await submitPage(author, 'Rotary evaporator');

      const response = await preview(admin.cookie, UNKNOWN_ID);

      expectError(response, 404, 'NOT_FOUND');
      expect(JSON.stringify(response.body)).not.toContain('Rotary evaporator');
    });

    it('S04.1 AC7 answers an admin 400 VALIDATION_FAILED for a malformed id', async () => {
      const response = await preview(admin.cookie, 'not-a-uuid');

      expectError(response, 400, 'VALIDATION_FAILED');
    });
  });
});
