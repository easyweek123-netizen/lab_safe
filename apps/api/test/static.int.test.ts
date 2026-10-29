import { ErrorResponse, HealthResponse } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers';

/** The fixture "built web app": an `index.html` whose marker text the tests look for. */
const FIXTURE_DIR = join(__dirname, 'fixtures', 'web-dist');
const MARKER = 'LabSafe fixture page';

describe('serving the web app when WEB_DIST_DIR is set', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ WEB_DIST_DIR: FIXTURE_DIR });
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-1.1 answers / with the web app index.html', async () => {
    const response = await request(app.getHttpServer()).get('/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.text).toContain(MARKER);
  });

  it('TC-1.2 answers a deep link with the same index.html', async () => {
    const response = await request(app.getHttpServer()).get('/some/deep/link');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.text).toContain(MARKER);
  });

  it('TC-1.3 still answers /api/health with JSON', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(HealthResponse.parse(response.body)).toEqual({ status: 'ok', database: 'ok' });
  });

  it.each(['/api/nope', '/api', '/api/nope/deeper?x=1'])(
    'TC-1.3 answers the unknown API path %s with the JSON 404, not the HTML page',
    async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.text).not.toContain(MARKER);
      expect(ErrorResponse.parse(response.body)).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Not found.',
      });
    },
  );
});

describe('no web app when WEB_DIST_DIR is not set', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-2.1 answers / with the JSON 404', async () => {
    const response = await request(app.getHttpServer()).get('/');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(ErrorResponse.parse(response.body)).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Not found.',
    });
  });
});
