import { createHash, randomBytes } from 'node:crypto';
import type { CurrentUser } from '@labsafe/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { toCurrentUserResponse } from './current-user.response';
import { Session } from './session.entity';

/** A session lasts 7 days from login, absolute, not sliding (E02 design "Endpoints"). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const TOKEN_BYTES = 32;

/** What the cookie must hold for a new session. The token is never stored or logged. */
export interface NewSession {
  token: string;
  expiresAt: Date;
}

/** SHA-256 of a cookie token, hex: the only form in which a token is stored. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Sessions (table `sessions`, E02 design "Data" and "Flows"). The cookie holds a random token;
 * the table holds only its SHA-256. Nothing about the user's role or status is cached, so a change
 * applies at the next request (I8).
 */
@Injectable()
export class SessionsService {
  constructor(@InjectRepository(Session) private readonly sessions: Repository<Session>) {}

  /**
   * Creates a session for the user and returns its token. Pass the `manager` of a running
   * transaction to create it inside that transaction (sign-up, BE-03).
   */
  async create(userId: string, manager?: EntityManager): Promise<NewSession> {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.repository(manager).insert({ tokenHash: hashToken(token), userId, expiresAt });
    return { token, expiresAt };
  }

  /**
   * The account of a live session, or null for an unknown or expired token. One query that joins
   * `users`; the password hash is never loaded.
   */
  async findUserByToken(token: string): Promise<CurrentUser | null> {
    const session = await this.sessions
      .createQueryBuilder('session')
      .innerJoin('session.user', 'user')
      .select(['session.id', 'user.id', 'user.name', 'user.email', 'user.role', 'user.status'])
      .where('session.tokenHash = :tokenHash', { tokenHash: hashToken(token) })
      .andWhere('session.expiresAt > now()')
      .getOne();
    return session ? toCurrentUserResponse(session.user) : null;
  }

  /** Deletes the session of the token, if there is one. Pass `manager` to run in a transaction. */
  async delete(token: string, manager?: EntityManager): Promise<void> {
    await this.repository(manager).delete({ tokenHash: hashToken(token) });
  }

  /** Deletes the user's expired sessions (at login, BE-03). Uses the `sessions.user_id` index. */
  async deleteExpired(userId: string, manager?: EntityManager): Promise<void> {
    await this.repository(manager)
      .createQueryBuilder()
      .delete()
      .where('user_id = :userId', { userId })
      .andWhere('expires_at <= now()')
      .execute();
  }

  private repository(manager?: EntityManager): Repository<Session> {
    return manager ? manager.getRepository(Session) : this.sessions;
  }
}
