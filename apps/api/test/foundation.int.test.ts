import { ErrorResponse } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, QueryFailedError } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers';

describe('Foundation', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Runs one statement in a transaction that is always rolled back, so `lab_rooms` never changes. */
  async function queryAndRollBack(sql: string, parameters: unknown[]): Promise<unknown> {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      return await runner.query(sql, parameters);
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

  describe('unknown /api path', () => {
    it('TC-6.1 answers GET /api/does-not-exist with 404 NOT_FOUND in the shared error format', async () => {
      const response = await request(app.getHttpServer()).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      const body = ErrorResponse.parse(response.body);
      expect(body).toEqual({ statusCode: 404, code: 'NOT_FOUND', message: 'Not found.' });
    });
  });

  describe('oversized request body', () => {
    it('F2 answers a JSON body over the 100 kB parser limit with 413 in the shared error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/does-not-exist')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ padding: 'x'.repeat(200 * 1024) }));

      expect(response.status).toBe(413);
      const body = ErrorResponse.parse(response.body);
      expect(body).toEqual({
        statusCode: 413,
        code: 'REQUEST_REJECTED',
        message: 'The request was rejected.',
      });
    });
  });

  describe('lab_rooms', () => {
    it('TC-9.1 contains exactly the four placeholder rooms after the migrations', async () => {
      const rows: unknown = await dataSource.query(
        'SELECT code, name FROM lab_rooms ORDER BY code',
      );

      expect(rows).toEqual([
        { code: 'LAB-101', name: 'Teaching lab 1' },
        { code: 'LAB-102', name: 'Teaching lab 2' },
        { code: 'LAB-201', name: 'Research lab' },
        { code: 'LAB-202', name: 'Instrument room' },
      ]);
    });

    it('TC-9.2 rejects a second room with code LAB-101 (unique violation 23505)', async () => {
      const state = await sqlStateOf(
        queryAndRollBack('INSERT INTO lab_rooms (code, name) VALUES ($1, $2)', [
          'LAB-101',
          'Duplicate lab',
        ]),
      );

      expect(state).toBe('23505');
    });

    it("TC-9.2 rejects a room with code '' (check violation 23514)", async () => {
      const state = await sqlStateOf(
        queryAndRollBack('INSERT INTO lab_rooms (code, name) VALUES ($1, $2)', [
          '',
          'Nameless lab',
        ]),
      );

      expect(state).toBe('23514');
    });

    it("TC-9.2 rejects a room with name '' (check violation 23514)", async () => {
      const state = await sqlStateOf(
        queryAndRollBack('INSERT INTO lab_rooms (code, name) VALUES ($1, $2)', ['LAB-999', '']),
      );

      expect(state).toBe('23514');
    });

    it('TC-9.2 leaves the four rooms unchanged', async () => {
      const rows: unknown = await dataSource.query('SELECT count(*)::int AS count FROM lab_rooms');

      expect(rows).toEqual([{ count: 4 }]);
    });
  });
});
