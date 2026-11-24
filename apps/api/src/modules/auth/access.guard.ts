import type { CurrentUser } from '@labsafe/shared';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_LEVEL_KEY, type AccessLevel, type AccessRequest } from '../../common/access';
import { AppException } from '../../common/app.exception';
import { sessionTokenOf } from './session-cookie';
import { SessionsService } from './sessions.service';

/**
 * Deny by default (E02 design "Flows" and "Who may do what", decision E02-D2). Global; runs after
 * `RequestOriginGuard`. A route without an access level is refused with 403 for everyone. For the
 * others it loads the session's user in one query on every request, sets `request.user`, and
 * refuses with 401 `UNAUTHENTICATED` (no live session) or 403 `FORBIDDEN` (wrong role or status).
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const level = this.reflector.getAllAndOverride<AccessLevel | undefined>(ACCESS_LEVEL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (level === undefined) {
      throw new AppException(403, 'FORBIDDEN', 'You may not do this.');
    }

    const request = context.switchToHttp().getRequest<AccessRequest>();
    const user = await this.findUser(request);
    if (user) request.user = user;

    if (level === 'PUBLIC') return true;
    if (!user) {
      throw new AppException(401, 'UNAUTHENTICATED', 'Please log in.');
    }
    if (level === 'SIGNED_IN') return true;

    const approved = user.status === 'APPROVED';
    const allowed = level === 'CONTRIBUTOR' ? approved : approved && user.role === 'ADMIN';
    if (!allowed) {
      throw new AppException(403, 'FORBIDDEN', 'You may not do this.');
    }
    return true;
  }

  /** The user of the session cookie; null when there is none or it is unknown or expired. */
  private async findUser(request: AccessRequest): Promise<CurrentUser | null> {
    const token = sessionTokenOf(request);
    return token === undefined ? null : this.sessionsService.findUserByToken(token);
  }
}
