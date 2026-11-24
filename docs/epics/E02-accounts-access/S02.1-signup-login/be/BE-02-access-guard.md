---
id: BE-02
story: S02.1
layer: be
status: done
depends_on: [BE-01]
covers: [AC10, AC11, AC12]
updated: 2026-11-24
---

# BE-02 Access guard and request-origin check

**Goal:** every request is checked for its access level and, when it changes data, for its origin; a route without an access level is refused. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/common/access.ts` (the `@Public`, `@SignedIn`, `@Contributor`, `@Admin` decorators and a `@CurrentUser` parameter decorator)
- create `apps/api/src/common/request-origin.guard.ts`
- create `apps/api/src/modules/auth/sessions.service.ts`, `access.guard.ts`, `auth.module.ts`
- change `apps/api/src/app.module.ts`, `apps/api/src/app.setup.ts`, `apps/api/package.json` (`cookie-parser`, `@types/cookie-parser`)
- change `apps/api/src/modules/health/health.controller.ts`, `apps/api/src/modules/meta/meta.controller.ts` (`@Public()`)
- create `apps/api/test/unit/modules/auth/access.guard.test.ts`, `apps/api/test/unit/common/request-origin.guard.test.ts`

## Constraints

- Follow [design.md "Flows"](../../design.md#flows) (first diagram) and "Who may do what". Both guards are global (`APP_GUARD`); the origin guard runs first. `AccessGuard` is registered by `AuthModule`; `src/common/` never imports from `src/modules/`.
- `SessionsService` creates a session (random token, only its SHA-256 hash stored, expiry 7 days), finds the user for a token with one query that joins `users` and ignores expired rows, and deletes a session. The guard uses the lookup on every request, so a status or role change takes effect at once (AC10, I8).
- Levels: `Public` allows everyone; `SignedIn` needs a user (else 401 `UNAUTHENTICATED`); `Contributor` needs status `APPROVED` (else 401 or 403 `FORBIDDEN`); `Admin` needs role `ADMIN` and status `APPROVED`; no level → 403 `FORBIDDEN` for everyone (AC11). Errors are `AppException`s.
- The origin guard does exactly what design.md "Cross-site requests" says; GET requests pass.
- `cookie-parser` is registered in `configureApp`, so the integration tests use it too.
- Unit tests prove each level for anonymous, pending, rejected, contributor and admin callers, the undecorated route, and the origin rules. AC10 and AC12 get their end-to-end proof in BE-03.
- E01's health and meta tests must still pass unchanged.
- Schema change: no.

## Out of scope

The auth endpoints and the cookie itself (BE-03).

## Implementation notes

**Files changed:**

- apps/api/src/common/access.ts
- apps/api/src/common/request-origin.guard.ts
- apps/api/src/modules/auth/sessions.service.ts
- apps/api/src/modules/auth/access.guard.ts
- apps/api/src/modules/auth/auth.module.ts
- apps/api/src/modules/auth/session-cookie.ts
- apps/api/src/modules/auth/current-user.response.ts
- apps/api/src/app.module.ts
- apps/api/src/app.setup.ts
- apps/api/package.json
- pnpm-lock.yaml
- apps/api/src/modules/health/health.controller.ts
- apps/api/src/modules/meta/meta.controller.ts
- apps/api/test/unit/modules/auth/access.guard.test.ts
- apps/api/test/unit/common/request-origin.guard.test.ts
- apps/api/test/access.int.test.ts

**Differences from the ticket:**

- `session-cookie.ts` is created here with only `SESSION_COOKIE_NAME`, because the guard reads the cookie; BE-03 adds the set and clear functions to it.
- `current-user.response.ts` (`toCurrentUserResponse`) is created here: `SessionsService.findUserByToken` selects only id, name, email, role and status in its join and returns a `CurrentUser`, so `request.user` never holds the entity or the hash. BE-03 reuses the mapping.
- `SessionsService.create(userId, manager?)` takes an optional `EntityManager` so BE-03's sign-up transaction can use it; it also exports `SESSION_TTL_MS` (7 days).
- `AccessGuard` always looks up the session when a cookie is present (also on `@Public()` routes, so `GET /auth/me` gets `request.user`); it skips the lookup for an undecorated route (403 straight away) and for a cookie that is missing, empty or not a plain string (`cookie-parser` turns `j:` cookies into objects).
- `@CurrentUser()` returns `CurrentUser | null` (null only on a `@Public()` route).
- `RequestOriginGuard` is registered as `APP_GUARD` in `AppModule` and `AccessGuard` in `AuthModule`; Nest registers the root module's providers first, so the origin check runs first. There is no route yet that can prove this order over HTTP (it needs a non-public POST); BE-03's `POST /auth/logout` with `text/plain` and no session (403, not 401) can prove it.
- Extra integration test `apps/api/test/access.int.test.ts`: health and meta stay public (also with an unknown cookie), every controller handler in the app declares an access level, and the `SessionsService` queries against `labsafe_test` (status or role change seen at the next lookup, only the SHA-256 stored, expiry 7 days, expired and unknown tokens, delete, rollback inside a transaction).
- The origin guard was written before its unit tests, so those tests were not seen failing first; the access guard tests were.
