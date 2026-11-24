---
id: S02.1
epic: E02
title: Sign up, log in and log out
type: feature
status: done
covers: [US6, NFR4, NFR5]
updated: 2026-11-24
---

# S02.1 Sign up, log in and log out

**As a** lab member **I want** to sign up, log in and log out, and see whether my account is approved, **so that** I can reach the contributor area once an admin lets me in · Delivers: C1 (contributor area), C2, C5, C9 (contributor area), C11, C12, C13 (its pages), C14 · Design: [design.md](../design.md)

**Try it:** `pnpm qa:serve`, open `http://localhost:4100/signup`, sign up, then log out and log in again. Admin actions arrive in S02.2; until then a test changes an account's status in the test database directly.

## Acceptance criteria

- **AC1** Given an anonymous visitor on `/signup`, When they submit a valid name, email and password, Then the server answers 201 `CurrentUser` with role `CONTRIBUTOR` and status `PENDING`, sets the session cookie, and the browser shows `/contribute` with "Your account is waiting for approval."
- **AC2** Given the sign-up form, When the name is empty or longer than 100 characters, the email is not a valid address, or the password has fewer than 8 or more than 128 characters, Then no account is created, the server answers 400 `VALIDATION_FAILED` with one `fields` entry per problem, and the form shows each message next to its input ("Enter your name", "Enter a valid email address", "Password must be at least 8 characters").
- **AC3** Given an account with the email `sara@lab.test`, When someone signs up with `Sara@Lab.TEST`, Then the server answers 409 `EMAIL_TAKEN` with a `fields` entry for `email`, no second account exists, and the form shows "An account with this email already exists" next to the email input.
- **AC4** Given a sign-up request sent straight to the server that also contains `"role": "ADMIN"` and `"status": "APPROVED"`, When it is processed, Then the new account is still a `PENDING` `CONTRIBUTOR`.
- **AC5** Given an account, When its owner logs in on `/login` with the right password and the email in any letter case, Then the server answers 200 `CurrentUser` and sets the session cookie, and the header shows the user's name and "Log out" instead of "Log in".
- **AC6** Given a wrong password, or an email that has no account, When someone logs in, Then the server answers 401 `INVALID_CREDENTIALS` with the same message in both cases, sets no cookie, and the form shows "Email or password is wrong".
- **AC7** Given a signed-in user, When they press "Log out", Then their session row is deleted, the cookie is cleared, the header shows "Log in", and a request that replays the old cookie is treated as anonymous (`GET /auth/me` answers `{user: null}`).
- **AC8** Given a signed-in user, When they open `/contribute` by link, by typed URL or by reloading, Then a `PENDING` account sees h1 "Waiting for approval" and "Your account is waiting for approval.", a `REJECTED` account sees h1 "Sign-up not approved" and "Your sign-up was not approved.", and an `APPROVED` contributor or an admin sees the empty contributor area (h1 "Contributor area").
- **AC9** Given an anonymous visitor, When they open `/contribute`, Then they are sent to `/login?next=/contribute`, and after logging in they land on `/contribute`; a `next` value that is not a local path (for example `//evil.example` or `https://evil.example`) is ignored and they land on `/contribute`.
- **AC10** Given a signed-in user whose status or role is changed in the database, When they make their next request, Then `GET /auth/me` returns the new status or role without a new login.
- **AC11** Given the access guard, When a route declares no access level, Then every caller, including an admin, gets 403 `FORBIDDEN`; `GET /api/health` and `GET /api/meta/lists` stay public; `POST /auth/logout` without a session answers 401 `UNAUTHENTICATED`; an expired or unknown session cookie is treated as anonymous, and `GET /auth/me` then clears it.
- **AC12** Given a POST to `/api/auth/signup` or `/api/auth/login`, When its `Origin` header names another host, or its `Content-Type` is not `application/json`, Then the server answers 403 `FORBIDDEN` and creates no account and no session.
- **AC13** Given two accounts created with the same password, When the `users` table is read, Then each `password_hash` is an scrypt hash in the `scrypt$N$r$p$salt$hash` format, differs from the other and does not contain the password; and no response of sign-up, login or `GET /auth/me` contains the password or the hash.
- **AC14** Given the built app, When an anonymous visitor opens `/`, `/login` and `/signup`, Then the browser holds no cookie and every request goes to the app's own origin; after login it holds exactly one cookie, `labsafe_session`, with `HttpOnly`, `SameSite=Lax` and `Path=/`; and the `users` table has only the columns id, name, email, password_hash, role, status, created_at and updated_at.
- **AC15** Given `GET /auth/me` has not answered yet, When a protected page is opened, Then it shows `status` "Loading…"; When it fails, Then it shows `alert` "Couldn't load, try again." with a Retry button that loads it again. While sign-up or login is being sent, the submit button is disabled and reads "Signing up…" or "Logging in…"; a 500 or network error shows `alert` "Something went wrong, try again." and keeps the typed values.
- **AC16** Given a signed-in user, When they open `/login` or `/signup`, Then they are sent to `/contribute`.
- **AC17** Given a 375 px and a 1280 px wide window, When `/signup`, `/login`, the waiting notice and the contributor area are shown, Then nothing scrolls sideways, and `pnpm e2e` runs sign-up → waiting notice → log out → log in at both widths.

## API contract

Shared schemas in `packages/shared/src/schemas/auth.ts` (schema and type share a name, exported from `src/index.ts`):

- `ROLES` = `CONTRIBUTOR`, `ADMIN` → `Role`; `ACCOUNT_STATUSES` = `PENDING`, `APPROVED`, `REJECTED` → `AccountStatus`
- `Email`: trimmed, lower-cased, a valid address, at most 254 characters ("Enter a valid email address")
- `SignUpRequest { name: trimmed 1–100 ("Enter your name" / "Name must be at most 100 characters"), email: Email, password: 8–128 ("Password must be at least 8 characters" / "Password must be at most 128 characters") }`
- `LoginRequest { email: Email, password: 1–128 ("Enter your password") }`
- `CurrentUser { id: uuid, name, email, role: Role, status: AccountStatus }`
- `SessionResponse { user: CurrentUser | null }`

New `ErrorCode` values: `UNAUTHENTICATED`, `FORBIDDEN`, `INVALID_CREDENTIALS`, `EMAIL_TAKEN`.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| POST | /api/auth/signup | Public | `SignUpRequest` → 201 `CurrentUser`; `Set-Cookie: labsafe_session` | 400 `VALIDATION_FAILED`; 403 `FORBIDDEN` (origin); 409 `EMAIL_TAKEN` "An account with this email already exists" |
| POST | /api/auth/login | Public | `LoginRequest` → 200 `CurrentUser`; `Set-Cookie: labsafe_session` | 400; 401 `INVALID_CREDENTIALS` "Email or password is wrong"; 403 (origin) |
| POST | /api/auth/logout | Signed-in | `{}` → 204; cookie cleared | 401 `UNAUTHENTICATED`; 403 (origin) |
| GET | /api/auth/me | Public | none → 200 `SessionResponse` | none |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| header | no account links yet | anonymous: link "Log in" | `me` failed: link "Log in" | the user's name, link "Contributor area", button "Log out" |
| `/signup` | submit "Signing up…", disabled | — | field messages; `alert` "Something went wrong, try again." | → `/contribute`. Link "Already have an account? Log in" |
| `/login` | submit "Logging in…", disabled | — | field messages; `alert` "Email or password is wrong"; `alert` "Something went wrong, try again." | → `next` or `/contribute`. Link "Create an account" |
| `/contribute` | `status` "Loading…" | the area itself is empty: h1 "Contributor area", "Here you will write and update safety pages." | `alert` "Couldn't load, try again." + "Retry" | contributor area; or the waiting / not-approved notice (AC8) |

## Approach

- **API:** a new `users` module (`User` entity, `UsersService`) and a new `auth` module (`Session` entity, `SessionsService`, `AccessGuard`, `AuthService`, `AuthController`). The access decorators live in `src/common/access.ts`, the `RequestOriginGuard` in `src/common/`, password hashing in `src/common/password.ts`. Follow the `meta` module (thin controller, service, `to…Response` mapping) and `ZodValidationPipe`. `health` and `meta` get `@Public()`.
- **Web:** `src/api/client.ts` gains a sender for POST/PUT next to `apiGet`; `src/api/auth.ts` holds `useMe`, `useSignUp`, `useLogIn`, `useLogOut`. `AppShell` gets the account part of the header. `RequireAccount` (in `src/components/`) is the layout route of design "Screens". Follow `HomePage` for the loading and error states and `src/test/msw.ts` for fixtures.
- **e2e:** a new `e2e/tests/accounts.spec.ts`, following `smoke.spec.ts`.

## Tickets

1. [BE-01 Accounts contract, tables and password hashing](be/BE-01-accounts-contract-tables.md)
2. [BE-02 Access guard and request-origin check](be/BE-02-access-guard.md)
3. [BE-03 Sign-up, login, logout and me endpoints](be/BE-03-auth-endpoints.md)
4. [FE-01 Session in the web app and the header](fe/FE-01-session-header.md)
5. [FE-02 Sign-up and login pages](fe/FE-02-signup-login-pages.md)
6. [FE-03 Account gate, contributor area and journey test](fe/FE-03-account-gate-contributor-area.md)

## Out of scope

- The first admin from the setup configuration, approving and rejecting (S02.2); roles (S02.3).
- Admin pages and the "no access" notice (S02.2).
- Password reset, changing name, email or password, login rate limiting (epic "Out of scope", design "Risks").

## Known gaps

- F2 (minor, review round 1): a logout that fails with a 500 or a network error shows no message (`apps/web/src/components/AccountMenu.tsx`).
- ~~F3~~ fixed in S02.2 FE-02: the 375 px contributor-area check now uses a real account approved by the setup admin.
- F4 (minor, review round 1): if a background refresh of "me" fails while a user is cached, the gate shows "Couldn't load, try again." and the header shows "Log in" (`RequireAccount.tsx`, `AccountMenu.tsx`).

## Verification

**GREEN** · 2026-11-24

Review [round 2](review.md) is APPROVE. `pnpm verify` exit 0 (shared 46, web 67, API unit 125, API integration 82, docs-check OK); `pnpm e2e` 28 passed (FE-03).

- **Acceptance criteria**, each built as written and each with tests titled `S02.1 AC<n>`:
  - AC1, AC4: `apps/api/src/modules/auth/auth.service.ts:34` (user and session in one transaction); `apps/api/src/modules/users/users.service.ts:86` sets `CONTRIBUTOR` / `PENDING` on the server. Tests `apps/api/test/auth.int.test.ts:68,163`, `SignUpPage.test.tsx:24,51`, `e2e/tests/accounts.spec.ts:20`.
  - AC2, AC3: shared schemas plus `users.service.ts:89-92` (409 `EMAIL_TAKEN` with an `email` field, the unique key decides). Tests `auth.int.test.ts:95,122,134,143`, `accounts-tables.int.test.ts:129`, `SignUpPage.test.tsx:64,88,99,129`, `packages/shared/src/schemas/auth.test.ts`.
  - AC5, AC6, AC7: `auth.service.ts:55,57`; `apps/api/src/modules/auth/auth.controller.ts:58`. Tests `auth.int.test.ts:183,203,215,245,268,281,306`, `AccountMenu.test.tsx:29-125`, `LoginPage.test.tsx:41-95`.
  - AC8, AC9, AC15, AC16: `RequireAccount.test.tsx:40-192`, `LoginPage.test.tsx:104-177`, `safe-next.test.ts:5-23`, `SignUpPage.test.tsx:157-210`, `accounts.spec.ts:20,51,67`.
  - AC10, AC11: `apps/api/src/modules/auth/access.guard.ts:28` (no access level → 403), `:37` (401). Tests `access.int.test.ts:39-149`, `auth.int.test.ts:317-407`, `unit/modules/auth/access.guard.test.ts:149-211`.
  - AC12: `apps/api/src/common/request-origin.guard.ts:40-56`, global at `apps/api/src/app.module.ts:45`. Tests `auth.int.test.ts:334,437,456,475`, `unit/common/request-origin.guard.test.ts:23-80`.
  - AC13, AC14: `apps/api/src/common/password.ts`; `apps/api/src/modules/auth/session-cookie.ts:23` (`HttpOnly`, `SameSite=Lax`, `Path=/`). Tests `auth.int.test.ts:487-593`, `unit/common/password.test.ts:9-48`, `accounts-tables.int.test.ts:62,140,163`, `accounts.spec.ts:80`.
  - AC17: `accounts.spec.ts:30` (the journey) and `:122-155` (no sideways scroll on `/signup`, `/login`, the waiting notice and, since S02.2 FE-02, a real approved account's contributor area at `:143-155`) at 375 px and 1280 px.
- **Refused callers:** anonymous on logout (401); anonymous, pending, contributor and admin on a route with no access level (403 over HTTP); rejected in the guard unit tests; a foreign `Origin` or a non-JSON body on sign-up and login (403, no account, no session).
- **Data rules** sit where [design.md](../design.md) "Data" puts them; sign-up and login each use one transaction; the migration `apps/api/src/db/migrations/1795521437455-CreateUsersAndSessions.ts` matches the entities (schema builder check). No hash, password or token leaves the server.
- **Review F1** (dev proxy) fixed at `apps/web/vite.config.ts:15-17`, test `apps/web/src/devProxy.test.ts:6`.
- **Left open:** review F2 and F4 (minor), listed under "Known gaps"; F3 was closed by S02.2 FE-02.

## Changes

- 2026-11-24 · `/complete-epic` (S02.2 review F5): Verification references updated to the current lines: `e2e/tests/accounts.spec.ts` (changed by S02.2 FE-02), `users.service.ts`, `RequireAccount.test.tsx` and `AccountMenu.test.tsx` (moved by S02.2 and S02.3); "Left open" notes that F3 is closed.
