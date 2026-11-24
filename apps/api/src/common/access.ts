import type { CurrentUser as CurrentUserResponse } from '@labsafe/shared';
import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * Who may call a route (E02 design "Who may do what", decision E02-D2). Every handler, or its
 * controller, declares exactly one level; the global `AccessGuard` refuses a route without one.
 *
 * - `PUBLIC`: everyone, also anonymous callers.
 * - `SIGNED_IN`: any signed-in account, whatever its status.
 * - `CONTRIBUTOR`: an `APPROVED` account (contributor or admin).
 * - `ADMIN`: an `APPROVED` account with role `ADMIN`.
 */
export const ACCESS_LEVELS = ['PUBLIC', 'SIGNED_IN', 'CONTRIBUTOR', 'ADMIN'] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/** Metadata key of the access level. */
export const ACCESS_LEVEL_KEY = 'labsafe:access-level';

/** Everyone may call the route. */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ACCESS_LEVEL_KEY, 'PUBLIC' satisfies AccessLevel);

/** Any signed-in account; anonymous callers get 401 `UNAUTHENTICATED`. */
export const SignedIn = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ACCESS_LEVEL_KEY, 'SIGNED_IN' satisfies AccessLevel);

/** An approved account; anonymous 401, pending or rejected 403 `FORBIDDEN`. */
export const Contributor = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ACCESS_LEVEL_KEY, 'CONTRIBUTOR' satisfies AccessLevel);

/** An approved admin; anonymous 401, everyone else 403 `FORBIDDEN`. */
export const Admin = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ACCESS_LEVEL_KEY, 'ADMIN' satisfies AccessLevel);

/**
 * The parts of the Express request the guards and `@CurrentUser()` use. `cookies` comes from
 * `cookie-parser` (registered in `configureApp`); `user` is set by `AccessGuard` when the session
 * cookie belongs to a live session. It never holds the password hash.
 */
export interface AccessRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, unknown>;
  user?: CurrentUserResponse;
}

/**
 * The signed-in account of the request, or `null` for an anonymous caller (possible only on a
 * `@Public()` route). Loaded fresh on every request, so a role or status change applies at once.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserResponse | null =>
    context.switchToHttp().getRequest<AccessRequest>().user ?? null,
);
