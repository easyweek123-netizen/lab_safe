import { createHash } from 'node:crypto';
import { CurrentUser } from '@labsafe/shared';
import type { INestApplication, Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, Reflector } from '@nestjs/core';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACCESS_LEVEL_KEY, ACCESS_LEVELS } from '../src/common/access';
import { DUMMY_PASSWORD_HASH } from '../src/common/password';
import { SESSION_TTL_MS, SessionsService } from '../src/modules/auth/sessions.service';
import { createTestApp } from './helpers';

describe('access guard and sessions in the real app', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sessions: SessionsService;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    sessions = app.get(SessionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function insertUser(email: string): Promise<string> {
    const rows: { id: string }[] = await dataSource.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
      ['Sara', email, DUMMY_PASSWORD_HASH],
    );
    return rows[0]!.id;
  }

  describe('public routes', () => {
    for (const path of ['/api/health', '/api/meta/lists']) {
      it(`S02.1 AC11 keeps GET ${path} public for an anonymous caller`, async () => {
        const response = await request(app.getHttpServer()).get(path);

        expect(response.status).toBe(200);
        expect(response.headers['set-cookie']).toBeUndefined();
      });

      it(`S02.1 AC11 answers GET ${path} as anonymous when the session cookie is unknown`, async () => {
        const response = await request(app.getHttpServer())
          .get(path)
          .set('Cookie', 'labsafe_session=not-a-real-token');

        expect(response.status).toBe(200);
      });
    }
  });

  describe('every route declares an access level', () => {
    it('S02.1 AC11 finds no controller handler without @Public, @SignedIn, @Contributor or @Admin', () => {
      const reflector = app.get(Reflector);
      const missing: string[] = [];
      let handlers = 0;
      for (const module of app.get(ModulesContainer).values()) {
        for (const wrapper of module.controllers.values()) {
          const controller = wrapper.metatype as Type<object> | null;
          if (!controller) continue;
          for (const name of Object.getOwnPropertyNames(controller.prototype as object)) {
            const handler: unknown = Reflect.get(controller.prototype as object, name);
            if (name === 'constructor' || typeof handler !== 'function') continue;
            if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
            handlers += 1;
            const level: unknown = reflector.getAllAndOverride<unknown>(ACCESS_LEVEL_KEY, [
              handler as () => unknown,
              controller,
            ]);
            if (!ACCESS_LEVELS.includes(level as never)) missing.push(`${controller.name}.${name}`);
          }
        }
      }

      expect(handlers).toBeGreaterThanOrEqual(2);
      expect(missing).toEqual([]);
    });
  });

  describe('SessionsService', () => {
    it('S02.1 AC10 finds the user of a session and sees a status or role change at the next lookup', async () => {
      const userId = await insertUser('ac10@lab.test');
      const { token } = await sessions.create(userId);

      const before = await sessions.findUserByToken(token);
      expect(CurrentUser.strict().parse(before)).toEqual({
        id: userId,
        name: 'Sara',
        email: 'ac10@lab.test',
        role: 'CONTRIBUTOR',
        status: 'PENDING',
      });

      await dataSource.query(`UPDATE users SET status = 'APPROVED' WHERE id = $1`, [userId]);
      expect(await sessions.findUserByToken(token)).toMatchObject({ status: 'APPROVED' });

      await dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [userId]);
      expect(await sessions.findUserByToken(token)).toMatchObject({
        role: 'ADMIN',
        status: 'APPROVED',
      });
    });

    it('S02.1 AC11 stores only the SHA-256 of a 32-byte random token, expiring after 7 days', async () => {
      const userId = await insertUser('hash@lab.test');
      const started = Date.now();
      const { token, expiresAt } = await sessions.create(userId);

      expect(Buffer.from(token, 'base64url')).toHaveLength(32);
      const rows: { token_hash: string; expires_at: Date }[] = await dataSource.query(
        `SELECT token_hash, expires_at FROM sessions WHERE user_id = $1`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
      expect(rows[0]!.token_hash).not.toContain(token);
      expect(rows[0]!.expires_at.getTime()).toBe(expiresAt.getTime());
      expect(expiresAt.getTime() - started).toBeGreaterThanOrEqual(SESSION_TTL_MS - 1000);
      expect(expiresAt.getTime() - started).toBeLessThanOrEqual(SESSION_TTL_MS + 5000);
    });

    it('S02.1 AC11 treats an expired session and an unknown token as anonymous', async () => {
      const userId = await insertUser('expired@lab.test');
      const { token } = await sessions.create(userId);
      await dataSource.query(
        `UPDATE sessions SET expires_at = now() - interval '1 second' WHERE user_id = $1`,
        [userId],
      );

      expect(await sessions.findUserByToken(token)).toBeNull();
      expect(await sessions.findUserByToken('unknown-token')).toBeNull();
    });

    it('S02.1 AC11 deletes a session so its token no longer finds the user', async () => {
      const userId = await insertUser('logout@lab.test');
      const first = await sessions.create(userId);
      const second = await sessions.create(userId);

      await sessions.delete(first.token);

      expect(await sessions.findUserByToken(first.token)).toBeNull();
      expect(await sessions.findUserByToken(second.token)).toMatchObject({ id: userId });
    });

    it('S02.1 AC11 creates a session inside a transaction that is rolled back with it', async () => {
      const userId = await insertUser('tx@lab.test');
      let token = '';
      await dataSource
        .transaction(async (manager) => {
          ({ token } = await sessions.create(userId, manager));
          throw new Error('roll back');
        })
        .catch((error: unknown) => {
          expect((error as Error).message).toBe('roll back');
        });

      expect(token).not.toBe('');
      expect(await sessions.findUserByToken(token)).toBeNull();
    });
  });
});
