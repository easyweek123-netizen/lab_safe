import { ErrorResponse, HealthResponse } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from './helpers';

describe('GET /api/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-4.1 returns ok for an anonymous visitor', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(HealthResponse.parse(response.body)).toEqual({ status: 'ok', database: 'ok' });
  });

  it('TC-5.2 returns 503 SERVICE_UNAVAILABLE when the database query fails', async () => {
    vi.spyOn(app.get(DataSource), 'query').mockRejectedValueOnce(new Error('connection refused'));

    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(503);
    const body = ErrorResponse.parse(response.body);
    expect(body).toEqual({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The database is unreachable.',
    });
    expect(JSON.stringify(body)).not.toContain('connection refused');
  });

  it('TC-5.2 answers ok again once the database answers', async () => {
    vi.spyOn(app.get(DataSource), 'query').mockRejectedValueOnce(new Error('connection refused'));
    await request(app.getHttpServer()).get('/api/health').expect(503);

    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.status).toBe(200);
    expect(HealthResponse.parse(response.body)).toEqual({ status: 'ok', database: 'ok' });
  });
});
