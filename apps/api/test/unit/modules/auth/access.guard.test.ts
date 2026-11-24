import type { AccountStatus, CurrentUser, Role } from '@labsafe/shared';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import {
  type AccessRequest,
  Admin,
  Contributor,
  Public,
  SignedIn,
} from '../../../../src/common/access';
import { AppException } from '../../../../src/common/app.exception';
import { AccessGuard } from '../../../../src/modules/auth/access.guard';
import type { SessionsService } from '../../../../src/modules/auth/sessions.service';

class Routes {
  @Public()
  open(): void {}

  @SignedIn()
  signedIn(): void {}

  @Contributor()
  contributor(): void {}

  @Admin()
  admin(): void {}

  undecorated(): void {}
}

@Admin()
class AdminRoutes {
  inherited(): void {}

  @Public()
  overridden(): void {}
}

type RouteName = Exclude<keyof Routes, 'constructor'>;

function user(role: Role, status: AccountStatus): CurrentUser {
  return {
    id: '6f1c2a4e-1b2c-4d5e-8f90-123456789abc',
    name: 'Sara',
    email: 'sara@lab.test',
    role,
    status,
  };
}

type Caller = 'anonymous' | 'pending' | 'rejected' | 'contributor' | 'admin';

const CALLERS: Record<Caller, CurrentUser | null> = {
  anonymous: null,
  pending: user('CONTRIBUTOR', 'PENDING'),
  rejected: user('CONTRIBUTOR', 'REJECTED'),
  contributor: user('CONTRIBUTOR', 'APPROVED'),
  admin: user('ADMIN', 'APPROVED'),
};

function contextFor(
  target: object,
  handler: (...args: never[]) => unknown,
  request: AccessRequest,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => target,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function setUp(caller: Caller) {
  const findUserByToken = vi.fn().mockResolvedValue(CALLERS[caller]);
  const guard = new AccessGuard(new Reflector(), { findUserByToken } as unknown as SessionsService);
  const request: AccessRequest = {
    method: 'GET',
    headers: {},
    cookies: caller === 'anonymous' ? {} : { labsafe_session: 'token-of-' + caller },
  };
  return { guard, request, findUserByToken };
}

/** `'allow'`, or the status and code of the `AppException` the guard throws. */
async function outcome(caller: Caller, route: RouteName): Promise<string> {
  const { guard, request } = setUp(caller);
  const context = contextFor(Routes, Routes.prototype[route], request);
  try {
    return (await guard.canActivate(context)) ? 'allow' : 'deny';
  } catch (error) {
    if (error instanceof AppException) return `${error.status} ${error.code}`;
    throw error;
  }
}

const EXPECTED: Record<RouteName, Record<Caller, string>> = {
  open: {
    anonymous: 'allow',
    pending: 'allow',
    rejected: 'allow',
    contributor: 'allow',
    admin: 'allow',
  },
  signedIn: {
    anonymous: '401 UNAUTHENTICATED',
    pending: 'allow',
    rejected: 'allow',
    contributor: 'allow',
    admin: 'allow',
  },
  contributor: {
    anonymous: '401 UNAUTHENTICATED',
    pending: '403 FORBIDDEN',
    rejected: '403 FORBIDDEN',
    contributor: 'allow',
    admin: 'allow',
  },
  admin: {
    anonymous: '401 UNAUTHENTICATED',
    pending: '403 FORBIDDEN',
    rejected: '403 FORBIDDEN',
    contributor: '403 FORBIDDEN',
    admin: 'allow',
  },
  undecorated: {
    anonymous: '403 FORBIDDEN',
    pending: '403 FORBIDDEN',
    rejected: '403 FORBIDDEN',
    contributor: '403 FORBIDDEN',
    admin: '403 FORBIDDEN',
  },
};

describe('AccessGuard', () => {
  for (const [route, byCaller] of Object.entries(EXPECTED) as [
    RouteName,
    Record<Caller, string>,
  ][]) {
    for (const [caller, expected] of Object.entries(byCaller) as [Caller, string][]) {
      const label = route === 'undecorated' ? 'a route without an access level' : `@${route}`;
      const ac = route === 'undecorated' ? 'AC11' : 'AC10';
      it(`S02.1 ${ac} ${label}: ${caller} → ${expected}`, async () => {
        expect(await outcome(caller, route)).toBe(expected);
      });
    }
  }

  it('S02.1 AC11 refuses a route without an access level before looking up the session', async () => {
    const { guard, request, findUserByToken } = setUp('admin');

    await expect(
      guard.canActivate(contextFor(Routes, Routes.prototype.undecorated, request)),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(findUserByToken).not.toHaveBeenCalled();
  });

  it('S02.1 AC10 looks up the session on every request and sets request.user from it', async () => {
    const { guard, request, findUserByToken } = setUp('pending');
    const context = contextFor(Routes, Routes.prototype.contributor, request);

    await expect(guard.canActivate(context)).rejects.toMatchObject({ status: 403 });
    findUserByToken.mockResolvedValue(CALLERS.contributor);
    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(findUserByToken).toHaveBeenCalledTimes(2);
    expect(findUserByToken).toHaveBeenCalledWith('token-of-pending');
    expect(request.user).toEqual(CALLERS.contributor);
  });

  it('S02.1 AC11 treats an unknown or expired session cookie as anonymous', async () => {
    const { guard, request, findUserByToken } = setUp('pending');
    findUserByToken.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor(Routes, Routes.prototype.open, request)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    await expect(
      guard.canActivate(contextFor(Routes, Routes.prototype.signedIn, request)),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('S02.1 AC11 ignores a session cookie that is not a plain string and does not look it up', async () => {
    const { guard, request, findUserByToken } = setUp('anonymous');
    request.cookies = { labsafe_session: { injected: true } };

    await expect(
      guard.canActivate(contextFor(Routes, Routes.prototype.signedIn, request)),
    ).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    expect(findUserByToken).not.toHaveBeenCalled();
  });

  it('S02.1 AC11 does not look up a session for an anonymous caller without a cookie', async () => {
    const { guard, request, findUserByToken } = setUp('anonymous');

    await expect(
      guard.canActivate(contextFor(Routes, Routes.prototype.open, request)),
    ).resolves.toBe(true);
    expect(findUserByToken).not.toHaveBeenCalled();
  });

  it('S02.1 AC11 takes the level from the controller when the handler has none', async () => {
    const { guard, request } = setUp('contributor');

    await expect(
      guard.canActivate(contextFor(AdminRoutes, AdminRoutes.prototype.inherited, request)),
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it("S02.1 AC11 lets a handler's level override its controller's", async () => {
    const { guard, request } = setUp('anonymous');

    await expect(
      guard.canActivate(contextFor(AdminRoutes, AdminRoutes.prototype.overridden, request)),
    ).resolves.toBe(true);
  });
});
