import type { CurrentUser, LoginRequest, SignUpRequest } from '@labsafe/shared';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../../common/password';
import { UsersService } from '../users/users.service';
import { toCurrentUserResponse } from './current-user.response';
import { type NewSession, SessionsService } from './sessions.service';

/** What sign-up and login give the controller: the account to return and the cookie's token. */
export interface SignedIn {
  user: CurrentUser;
  session: NewSession;
}

/**
 * Sign-up, login and logout (S02.1, E02 design "Endpoints"). No entity and no hash leaves this
 * service; no password, hash or token is ever logged.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  /**
   * Creates a `PENDING` `CONTRIBUTOR` and its first session in one transaction (AC1, AC4,
   * E02-D4). 409 `EMAIL_TAKEN` if the email has an account (AC3).
   */
  async signUp(input: SignUpRequest): Promise<SignedIn> {
    const passwordHash = await hashPassword(input.password);
    return this.dataSource.transaction(async (manager) => {
      const user = await this.usersService.createPending(manager, {
        name: input.name,
        email: input.email,
        passwordHash,
      });
      const session = await this.sessionsService.create(user.id, manager);
      return { user: toCurrentUserResponse(user), session };
    });
  }

  /**
   * Checks the password (AC5, AC6). An unknown email is checked against the dummy hash, so both
   * failures cost one scrypt and give the same 401. On success, in one transaction, the user's
   * expired sessions and the request's old session (`currentToken`) are deleted and a new one is
   * created.
   */
  async logIn(input: LoginRequest, currentToken?: string): Promise<SignedIn> {
    const user = await this.usersService.findByEmail(input.email);
    const matches = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !matches) {
      throw new AppException(401, 'INVALID_CREDENTIALS', 'Email or password is wrong');
    }
    const session = await this.dataSource.transaction(async (manager) => {
      await this.sessionsService.deleteExpired(user.id, manager);
      if (currentToken !== undefined) await this.sessionsService.delete(currentToken, manager);
      return this.sessionsService.create(user.id, manager);
    });
    return { user: toCurrentUserResponse(user), session };
  }

  /** Deletes the session of the token (AC7). */
  async logOut(token: string): Promise<void> {
    await this.sessionsService.delete(token);
  }
}
