---
id: BE-03
story: S02.1
layer: be
status: done
depends_on: [BE-01, BE-02]
covers: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC10, AC11, AC12, AC13, AC14]
updated: 2026-11-24
---

# BE-03 Sign-up, login, logout and me endpoints

**Goal:** the four `/api/auth` endpoints with the session cookie, proven against the real app. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/users/users.service.ts`, `users.module.ts`
- create `apps/api/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `session-cookie.ts`
- change `apps/api/src/modules/auth/auth.module.ts`, `apps/api/src/app.module.ts`
- change `apps/api/src/common/config.ts` (`COOKIE_SECURE`), `.env.example`
- create `apps/api/test/auth-helpers.ts` (create a user with a given role and status, sign in and return the cookie)
- create `apps/api/test/auth.int.test.ts`

## Constraints

- Endpoints, statuses and messages exactly as in the story's "API contract"; the cookie exactly as in [design.md "Endpoints"](../../design.md#endpoints).
- Sign-up inserts the user and the session in one transaction and maps the `users` email unique violation to 409 `EMAIL_TAKEN` with a `fields` entry for `email`.
- Login: an unknown email verifies against the dummy hash from `password.ts`, so both failures take about the same time and give the same 401. On success, the user's expired sessions are deleted and a request's old session, if any, is replaced.
- Logout deletes the session row and clears the cookie with the same attributes. `GET /auth/me` clears an unknown or expired cookie and sets no cookie for an anonymous caller.
- Responses use a `toCurrentUserResponse` mapping; no entity and no hash ever leaves the service.
- `COOKIE_SECURE` follows the config pattern in `config.ts`: a boolean, default true only when `NODE_ENV` is `production`.
- `auth.int.test.ts` titles start with `S02.1 AC<n>`. It proves every AC in `covers` through HTTP, including: the response-body scan of AC13, the cookie attributes and the `users` column list of AC14 (from `information_schema`), AC10 by changing a status in the database between two requests, AC12 with a foreign `Origin` and with `text/plain`, and the schema-builder check for both entities (follow `meta.int.test.ts`).
- Test users are created with one precomputed hash, never with a real scrypt per test.
- The tests never rely on the developer's `.env`.
- Schema change: no.

## Out of scope

The first admin, admin endpoints (S02.2, S02.3). Rate limiting.

## Implementation notes

**Files changed:**

- apps/api/src/modules/users/users.service.ts
- apps/api/src/modules/users/users.module.ts
- apps/api/src/modules/auth/auth.service.ts
- apps/api/src/modules/auth/auth.controller.ts
- apps/api/src/modules/auth/auth.module.ts
- apps/api/src/modules/auth/session-cookie.ts
- apps/api/src/modules/auth/sessions.service.ts
- apps/api/src/modules/auth/access.guard.ts
- apps/api/src/common/config.ts
- .env.example
- apps/api/test/helpers.ts
- apps/api/test/auth-helpers.ts
- apps/api/test/auth.int.test.ts
- apps/api/test/unit/common/config.test.ts

**Differences from the ticket:**

- `app.module.ts` is unchanged: `AuthModule` imports the new `UsersModule`, and `AuthModule` no longer registers `User` itself (`UsersModule` owns it).
- `SessionsService` gains `deleteExpired(userId, manager?)` and an optional `manager` on `delete`, for the login transaction. `session-cookie.ts` also holds `sessionTokenOf` and `hasSessionCookie`; `AccessGuard` now reads the token through `sessionTokenOf` (same behaviour).
- `COOKIE_SECURE` accepts only `true` or `false` ("must be true or false"); unset, it is `NODE_ENV === 'production'`. Because `AppConfig` now always has `COOKIE_SECURE`, the two E01 tests `TC-7.3` that compare the whole config with `toEqual` gained `COOKIE_SECURE: false` in their expected object (stricter, not looser). New unit tests cover the default per `NODE_ENV`, both overrides and invalid values.
- `createTestApp(env, extraControllers)` gained an optional list of test-only controllers, so AC11's "a route without an access level is refused for every caller, including an admin" is proven over HTTP with a test controller behind the real global guards.
- The guard order noted by BE-02 is proven over HTTP: `POST /auth/logout` with `text/plain` and no session answers 403, not 401.
- `GET /auth/me` clears the cookie in the controller when the request has a session cookie but `AccessGuard` found no live session; there is no service call, since the guard already loaded the user. Logout takes no body (`@Body` is not read), so no schema parses `{}`.
- Sign-up does not delete a session the caller may already hold; only login replaces the request's old session, as the ticket says.
- `TEST_PASSWORD_HASH` in `auth-helpers.ts` is one precomputed `hashPassword('test-password-1')`. Each login through the helper still runs one real scrypt verification.
