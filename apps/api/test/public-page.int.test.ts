import {
  ErrorResponse,
  MySubmissions,
  PublishedSafetyPage,
  ReviewSubmission,
  Submission,
} from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createSignedInUser } from './auth-helpers';
import { createTestApp, resetTables } from './helpers';
import { firstLabRoomId, insertPhoto, validPage } from './page-helpers';

type SignedIn = { id: string; cookie: string };

/** Every key anywhere in a JSON value, at any depth. */
function allKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(allKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => [key, ...allKeys(child)]);
  }
  return [];
}

describe('GET /api/instruments/:slug and published photos', () => {
  let app: INestApplication;
  let author: SignedIn;
  let other: SignedIn;
  let admin: SignedIn;
  let labRoomId: string;

  beforeAll(async () => {
    app = await createTestApp({ COOKIE_SECURE: 'false' });
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

  async function approve(id: string): Promise<string> {
    const response = await http()
      .post(`/api/admin/submissions/${id}/approve`)
      .set('Cookie', admin.cookie)
      .send({ version: 1 });
    expect(response.status).toBe(200);
    return (response.body as { slug: string }).slug;
  }

  function expectNotFound(response: request.Response): void {
    expect(response.status).toBe(404);
    expect(ErrorResponse.parse(response.body).code).toBe('NOT_FOUND');
  }

  describe('the public page', () => {
    it('S04.2 AC4 answers an anonymous visitor 200 PublishedSafetyPage with every field and the approval, and no contributor, email, note or version', async () => {
      const submission = await submitPage(author);
      const previewResponse = await http()
        .get(`/api/admin/submissions/${submission.id}`)
        .set('Cookie', admin.cookie);
      const preview = ReviewSubmission.parse(previewResponse.body);
      const before = Date.now();
      await approve(submission.id);

      const response = await http().get('/api/instruments/rotary-evaporator');

      expect(response.status).toBe(200);
      const body = PublishedSafetyPage.parse(response.body);
      expect(body.slug).toBe('rotary-evaporator');
      expect(body.page.content).toEqual(preview.page.content);
      expect(body.page.content).toEqual(submission.content);
      expect(body.page.labRoom).toEqual(preview.page.labRoom);
      expect(body.page.lastApproved.approverName).toBe('Anna Admin');
      const approvedAt = Date.parse(body.page.lastApproved.at);
      expect(approvedAt).toBeGreaterThanOrEqual(before - 1000);
      expect(approvedAt).toBeLessThanOrEqual(Date.now() + 1000);

      // The raw body, not the parsed one: nothing beyond the contract leaks.
      expect(Object.keys(response.body as object).sort()).toEqual(['page', 'slug']);
      expect(Object.keys((response.body as { page: object }).page).sort()).toEqual([
        'content',
        'labRoom',
        'lastApproved',
      ]);
      const keys = allKeys(response.body);
      for (const forbidden of [
        'submittedBy',
        'submitter',
        'email',
        'reviewNote',
        'reviewedBy',
        'version',
        'status',
      ]) {
        expect(keys).not.toContain(forbidden);
      }
      const raw = JSON.stringify(response.body);
      expect(raw).not.toContain('Ada Author');
      expect(raw).not.toContain('author@lab.test');
      expect(raw).not.toContain('admin@lab.test');
      expect(raw).not.toContain(author.id);
    });

    it('S04.2 AC4 serves the published page photo to an anonymous visitor as image/jpeg', async () => {
      const submission = await submitPage(author);
      await approve(submission.id);

      const response = await http().get(`/api/photos/${submission.content.photoId}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/^image\/jpeg/);
      expect(response.headers['cache-control']).toBe('private, no-cache');
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect((response.body as Buffer).equals(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBe(true);
    });

    it('S04.2 AC4 serves the published page and photo to a signed-in contributor who is not the author', async () => {
      const submission = await submitPage(author);
      await approve(submission.id);

      const page = await http()
        .get('/api/instruments/rotary-evaporator')
        .set('Cookie', other.cookie);
      const photo = await http()
        .get(`/api/photos/${submission.content.photoId}`)
        .set('Cookie', other.cookie);

      expect(page.status).toBe(200);
      expect(photo.status).toBe(200);
    });

    it('S04.2 AC6 answers 404 NOT_FOUND for an unknown slug', async () => {
      expectNotFound(await http().get('/api/instruments/no-such-page'));
    });

    it('S04.2 AC6 answers 404 NOT_FOUND for a slug in the wrong form', async () => {
      const submission = await submitPage(author);
      await approve(submission.id);

      expectNotFound(await http().get('/api/instruments/Rotary-Evaporator'));
      expectNotFound(await http().get('/api/instruments/rotary%20evaporator'));
    });

    it('S04.2 AC6 answers 400 VALIDATION_FAILED for a slug longer than 200 characters', async () => {
      const response = await http().get(`/api/instruments/${'a'.repeat(201)}`);

      expect(response.status).toBe(400);
      expect(ErrorResponse.parse(response.body).code).toBe('VALIDATION_FAILED');
    });

    it('S04.2 AC6 answers 404 NOT_FOUND for the slug of a page that is not published, even to its author and an admin', async () => {
      await submitPage(author);

      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));
      expectNotFound(
        await http().get('/api/instruments/rotary-evaporator').set('Cookie', author.cookie),
      );
      expectNotFound(
        await http().get('/api/instruments/rotary-evaporator').set('Cookie', admin.cookie),
      );
    });
  });

  describe('before and after approval', () => {
    it('S04.2 AC12 answers an anonymous visitor not found while pending and the page and photo after approval; another pending page stays not found', async () => {
      const submission = await submitPage(author);
      const stillPending = await submitPage(other, 'Fume hood');

      expectNotFound(await http().get('/api/instruments/rotary-evaporator'));
      expectNotFound(await http().get(`/api/photos/${submission.content.photoId}`));

      await approve(submission.id);

      expect((await http().get('/api/instruments/rotary-evaporator')).status).toBe(200);
      expect((await http().get(`/api/photos/${submission.content.photoId}`)).status).toBe(200);
      expectNotFound(await http().get('/api/instruments/fume-hood'));
      expectNotFound(await http().get(`/api/photos/${stillPending.content.photoId}`));
    });

    it('S04.2 AC12 keeps an unsubmitted photo of the author private after their page is approved', async () => {
      const submission = await submitPage(author);
      const loosePhoto = await insertPhoto(app, author.id);
      await approve(submission.id);

      expectNotFound(await http().get(`/api/photos/${loosePhoto}`));
      expectNotFound(await http().get(`/api/photos/${loosePhoto}`).set('Cookie', other.cookie));
      expect(
        (await http().get(`/api/photos/${loosePhoto}`).set('Cookie', author.cookie)).status,
      ).toBe(200);
    });

    it('S04.2 AC12 keeps the E03 photo rule for a pending page: the owner and an admin get it, another contributor 404', async () => {
      const submission = await submitPage(author);
      const photo = `/api/photos/${submission.content.photoId}`;

      expect((await http().get(photo).set('Cookie', author.cookie)).status).toBe(200);
      expect((await http().get(photo).set('Cookie', admin.cookie)).status).toBe(200);
      expectNotFound(await http().get(photo).set('Cookie', other.cookie));
    });
  });

  describe('the author sees the address', () => {
    it('S04.2 AC10 gives "My submissions" the slug of the approved page only', async () => {
      const approved = await submitPage(author);
      const stillPending = await submitPage(author, 'Fume hood');
      await approve(approved.id);

      const response = await http().get('/api/submissions/mine').set('Cookie', author.cookie);

      expect(response.status).toBe(200);
      const body = MySubmissions.parse(response.body);
      const byId = new Map(body.submissions.map((row) => [row.id, row]));
      expect(byId.get(approved.id)).toMatchObject({
        status: 'APPROVED',
        slug: 'rotary-evaporator',
      });
      expect(byId.get(stillPending.id)).toMatchObject({ status: 'PENDING', slug: null });
      expect(body.submissions).toHaveLength(2);
    });

    it('S04.2 AC10 gives GET /api/submissions/:id the slug for the approved page, to the author and an admin, and null while pending', async () => {
      const submission = await submitPage(author);

      const whilePending = await http()
        .get(`/api/submissions/${submission.id}`)
        .set('Cookie', author.cookie);
      expect(Submission.parse(whilePending.body).slug).toBeNull();

      await approve(submission.id);

      const forAuthor = await http()
        .get(`/api/submissions/${submission.id}`)
        .set('Cookie', author.cookie);
      expect(forAuthor.status).toBe(200);
      expect(Submission.parse(forAuthor.body)).toMatchObject({
        status: 'APPROVED',
        slug: 'rotary-evaporator',
      });
      const forAdmin = await http()
        .get(`/api/submissions/${submission.id}`)
        .set('Cookie', admin.cookie);
      expect(Submission.parse(forAdmin.body).slug).toBe('rotary-evaporator');
    });
  });
});
