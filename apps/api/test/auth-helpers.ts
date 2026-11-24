import type { AccountStatus, Role } from '@labsafe/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { expect } from 'vitest';
import { SESSION_COOKIE_NAME } from '../src/modules/auth/session-cookie';

/** The password of every user that `insertUser` creates. */
export const TEST_PASSWORD = 'test-password-1';

/**
 * `hashPassword(TEST_PASSWORD)`, computed once, so test users never cost a real scrypt each
 * (BE-03). `verifyPassword` still runs one scrypt per login.
 */
export const TEST_PASSWORD_HASH =
  'scrypt$131072$8$1$G3onT6DHy43kxIS4uy05EA$bwCKg-hXaWGaCefUw_x0YmbYDpN1x8ylrME1D3_t60do1GGV8lq4886RtxKvNfoFmFK99vZuSKgFY1oOu-uOkg';

export interface TestUser {
  name?: string;
  email: string;
  role?: Role;
  status?: AccountStatus;
}

/** Inserts an account with `TEST_PASSWORD` straight into `users` and returns its id. */
export async function insertUser(app: INestApplication, user: TestUser): Promise<string> {
  const rows: { id: string }[] = await app
    .get(DataSource)
    .query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        user.name ?? 'Test User',
        user.email,
        TEST_PASSWORD_HASH,
        user.role ?? 'CONTRIBUTOR',
        user.status ?? 'PENDING',
      ],
    );
  return rows[0]!.id;
}

/** The `Set-Cookie` header of the session cookie in a response, or undefined. */
export function sessionSetCookie(response: request.Response): string | undefined {
  const header: unknown = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  return cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
}

/** `labsafe_session=<token>`, ready for a `Cookie` request header. */
export function sessionCookieOf(response: request.Response): string {
  const setCookie = sessionSetCookie(response);
  expect(setCookie, 'the response sets the session cookie').toBeDefined();
  return setCookie!.split(';')[0]!;
}

/** Logs in through `POST /api/auth/login` and returns the session cookie. */
export async function signIn(
  app: INestApplication,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });
  expect(response.status).toBe(200);
  return sessionCookieOf(response);
}

/** Creates an account with the given role and status, logs it in and returns id and cookie. */
export async function createSignedInUser(
  app: INestApplication,
  user: TestUser,
): Promise<{ id: string; cookie: string }> {
  const id = await insertUser(app, user);
  const cookie = await signIn(app, user.email);
  return { id, cookie };
}
