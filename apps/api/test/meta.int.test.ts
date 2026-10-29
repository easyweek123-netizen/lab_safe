import {
  CATEGORIES,
  ErrorResponse,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  MetaListsResponse,
  PROTECTIVE_EQUIPMENT,
} from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource, type Repository } from 'typeorm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { LabRoom } from '../src/modules/meta/lab-room.entity';
import { createTestApp, resetTables } from './helpers';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('GET /api/meta/lists', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await resetTables();
    app = await createTestApp();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('TC-1.1 returns the five fixed lists exactly as shared, for an anonymous visitor', async () => {
    const response = await request(app.getHttpServer()).get('/api/meta/lists');

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeUndefined();
    const body = MetaListsResponse.parse(response.body);
    expect(body.hazardTypes).toEqual(HAZARD_TYPES);
    expect(body.protectiveEquipment).toEqual(PROTECTIVE_EQUIPMENT);
    expect(body.hazardPictograms).toEqual(HAZARD_PICTOGRAMS);
    expect(body.categories).toEqual(CATEGORIES);
    expect(body.hazardLevels).toEqual(HAZARD_LEVELS);
    expect(
      [
        body.hazardTypes,
        body.protectiveEquipment,
        body.hazardPictograms,
        body.categories,
        body.hazardLevels,
      ].map((list) => list.length),
    ).toEqual([15, 14, 9, 8, 3]);
  });

  it('TC-1.1 takes no input: a query string changes nothing', async () => {
    const plain = await request(app.getHttpServer()).get('/api/meta/lists').expect(200);

    const withQuery = await request(app.getHttpServer())
      .get('/api/meta/lists')
      .query({ hazardTypes: 'oops', limit: '-1' });

    expect(withQuery.status).toBe(200);
    expect(withQuery.body).toEqual(plain.body);
  });

  it('TC-1.2 returns the four placeholder rooms sorted by code, each with a UUID id', async () => {
    const response = await request(app.getHttpServer()).get('/api/meta/lists');

    expect(response.status).toBe(200);
    const { labRooms } = MetaListsResponse.parse(response.body);
    expect(labRooms.map(({ code, name }) => ({ code, name }))).toEqual([
      { code: 'LAB-101', name: 'Teaching lab 1' },
      { code: 'LAB-102', name: 'Teaching lab 2' },
      { code: 'LAB-201', name: 'Research lab' },
      { code: 'LAB-202', name: 'Instrument room' },
    ]);
    for (const room of labRooms) {
      expect(Object.keys(room).sort()).toEqual(['code', 'id', 'name']);
      expect(room.id).toMatch(UUID);
    }
  });

  it('TC-1.2 the LabRoom entity matches the migrated lab_rooms table (no pending schema change)', async () => {
    const pending = await app.get(DataSource).driver.createSchemaBuilder().log();

    expect(pending.upQueries.map(({ query }) => query)).toEqual([]);
  });

  it('TC-2.1 returns 500 INTERNAL_ERROR without internal detail when reading the rooms fails', async () => {
    const repository = app.get<Repository<LabRoom>>(getRepositoryToken(LabRoom));
    vi.spyOn(repository, 'find').mockRejectedValueOnce(new Error('relation secret'));

    const response = await request(app.getHttpServer()).get('/api/meta/lists');

    expect(response.status).toBe(500);
    const body = ErrorResponse.parse(response.body);
    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
    expect(response.text).not.toContain('relation secret');
  });
});
