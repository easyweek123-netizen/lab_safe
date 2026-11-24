---
id: S02.2
epic: E02
title: Approve or reject sign-ups
type: feature
status: done
covers: [US10, NFR4]
updated: 2026-11-24
---

# S02.2 Approve or reject sign-ups

**As an** admin **I want** to see who is waiting and approve or reject each sign-up, **so that** only trusted lab members reach the contributor area · Delivers: C1 (admin pages), C3, C4, C6, C9 (admin pages), C10 (sign-up actions), C13 (its pages), C14 · Design: [design.md](../design.md) · Depends on: [S02.1](../S02.1-signup-login/story.md)

**Try it:** `pnpm qa:serve`; in one browser sign up as a new person; in a private window log in as the setup admin (`e2e/test-env.ts`), open "Sign-ups" and approve or reject; reload the first window.

## Acceptance criteria

- **AC1** Given an empty `users` table and all three `BOOTSTRAP_ADMIN_*` settings, When the app starts, Then exactly one `APPROVED` `ADMIN` account with that name and email exists and logs in with that password; a second start adds nothing; When an admin already exists, Then start-up changes nothing; When no admin exists but the email already has an account, Then that account becomes an `APPROVED` `ADMIN` and keeps its password.
- **AC2** Given only some of the three `BOOTSTRAP_ADMIN_*` settings, When the app starts, Then start-up fails with one line that names the missing settings; Given none of them and no admin, Then the app starts and logs one warning.
- **AC3** Given the fresh `pnpm qa:serve` copy, When the setup admin logs in, Then the header shows "Sign-ups" and they reach `/admin/sign-ups`.
- **AC4** Given pending, approved and rejected accounts, When an admin opens `/admin/sign-ups`, Then only the pending ones are listed, oldest first, each with name, email, sign-up date (for example "24 Nov 2026"), an "Approve" and a "Reject" button; `GET /api/admin/users?status=PENDING` returns them as `AdminUserList` in the same order.
- **AC5** Given the list request has not answered, Then `status` "Loading…" is shown; Given no pending sign-ups, Then "No pending sign-ups" is shown; Given the list request fails, Then `alert` "Couldn't load, try again." with "Retry" is shown, and Retry loads it again.
- **AC6** Given a pending sign-up, When the admin presses "Approve", Then the server answers 200 `AdminUser` with status `APPROVED`, the row disappears, `status` "Approved <name>." is shown, and that person's next load of `/contribute` shows the contributor area without a new login.
- **AC7** Given a pending sign-up, When the admin presses "Reject", Then "Reject this sign-up? This can't be undone." appears with "Yes, reject" and "Cancel"; "Cancel" changes nothing; "Yes, reject" makes the server answer 200 `AdminUser` with status `REJECTED`, removes the row and shows "Rejected <name>."; that person's next page load shows "Your sign-up was not approved.", and signing up again with the same email shows "An account with this email already exists".
- **AC8** Given an account that is no longer pending (approved, rejected, or handled by another admin a moment earlier), When an admin approves or rejects it, Then the server answers 409 `USER_NOT_PENDING`, its status is unchanged, and the page shows `alert` "This sign-up was already handled." and reloads the list. An unknown id gives 404 `NOT_FOUND`; an id that is not a UUID, or a `status` other than `PENDING` (S02.3 also allows `APPROVED`), gives 400 `VALIDATION_FAILED`.
- **AC9** Given an anonymous visitor, a pending account, a rejected account and an approved contributor, When each calls `GET /api/admin/users?status=PENDING`, `POST /api/admin/users/:id/approve` and `POST /api/admin/users/:id/reject` directly, Then the anonymous visitor gets 401 `UNAUTHENTICATED`, the others get 403 `FORBIDDEN`, and the target account is unchanged.
- **AC10** Given `/admin/sign-ups` is opened by link or typed URL, Then an anonymous visitor is sent to `/login?next=/admin/sign-ups`, a pending account sees the waiting notice, a rejected account sees the not-approved notice, an approved contributor sees h1 "No access" and "You don't have access to this page.", and only admins see the "Sign-ups" link in the header.
- **AC11** Given an action is being sent, Then that row's buttons are disabled; When it fails with 500 or a network error, Then `alert` "Couldn't save, try again." is shown and the row stays; When it fails with 401 or 403 (the admin lost their rights meanwhile), Then the page shows the matching gate notice.
- **AC12** Given a 375 px and a 1280 px wide window, When `/admin/sign-ups` and the "No access" notice are shown, Then nothing scrolls sideways, and `pnpm e2e` runs at both widths: sign up → admin approves → reload → contributor area, and sign up → admin rejects → reload → not-approved notice.

## API contract

Shared schemas in `packages/shared/src/schemas/admin-users.ts`:

- `AdminUsersQuery { status: "PENDING" | "APPROVED" }` (`APPROVED` added by S02.3)
- `UserIdParam { id: uuid }`
- `AdminUser { id: uuid, name, email, role: Role, status: AccountStatus, createdAt: ISO date-time string }`
- `AdminUserList { users: AdminUser[] }`

New `ErrorCode`: `USER_NOT_PENDING`. New settings: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` (all or none).

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| GET | /api/admin/users?status=PENDING | Admin | `AdminUsersQuery` → 200 `AdminUserList`, oldest first (`status=APPROVED` is S02.3's accounts list) | 400 for any other `status`; 401; 403 |
| POST | /api/admin/users/:id/approve | Admin | `UserIdParam`, body `{}` → 200 `AdminUser` | 400; 401; 403; 404; 409 `USER_NOT_PENDING` "This sign-up was already handled." |
| POST | /api/admin/users/:id/reject | Admin | `UserIdParam`, body `{}` → 200 `AdminUser` | 400; 401; 403; 404; 409 `USER_NOT_PENDING` |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/admin/sign-ups` | `status` "Loading…"; a row being saved has disabled buttons | "No pending sign-ups" | `alert` "Couldn't load, try again." + "Retry"; `alert` "Couldn't save, try again."; `alert` "This sign-up was already handled." | h1 "Sign-ups"; rows with name, email, sign-up date, "Approve", "Reject" (with confirm step); `status` "Approved <name>." / "Rejected <name>." |
| gate, admin level | as S02.1 | — | as S02.1 | anonymous → log in; pending → waiting; rejected → not approved; contributor → "No access" |

## Approach

- **API:** `BootstrapAdminService` in the `users` module, run once at application start-up; an `AdminUsersController` (`@Admin()` on the class) in the `users` module calling `UsersService`. The single-row conditional update of design "Data". Follow `AuthController` from S02.1 and `config.ts` for the settings.
- **Web:** `src/api/admin-users.ts` hooks; `src/pages/admin-sign-ups/`; `RequireAccount` gains the `admin` level and the "No access" notice; `AccountMenu` gains the "Sign-ups" link for admins.
- **e2e:** two browser contexts (the person and the admin) in one test; the setup admin's credentials come from `e2e/test-env.ts`.

## Tickets

1. [BE-01 First admin from the setup configuration](be/BE-01-bootstrap-admin.md)
2. [BE-02 Sign-up review endpoints](be/BE-02-signup-review-endpoints.md)
3. [FE-01 Sign-ups page and the admin gate](fe/FE-01-signups-page-admin-gate.md)
4. [FE-02 Sign-up review journey test](fe/FE-02-signup-review-journey.md)

## Out of scope

- Undoing a rejection; deactivating an approved account; email notifications (epic "Out of scope").
- The accounts list and role changes (S02.3).

## Known gaps

- ~~F1~~ recorded at `/complete-epic`: design.md "Data" now says `users.role` / `users.status` are deliberately not indexed.
- F2 (minor, review round 1): `.env.example` lines 11–13 have the `BOOTSTRAP_ADMIN_*` settings active with an example password, so a server set up by copying the file starts with an admin whose password is public.
- F3 (minor, review round 1): if no admin exists yet, whoever first signs up with the configured `BOOTSTRAP_ADMIN_EMAIL` becomes admin on the next start, keeping their own password (even a rejected account). The behaviour stays; the risk is now listed under design.md "Risks" and design doc §11.
- F4 (minor, review round 1): after a failed "Yes, reject" or "Approve", keyboard focus falls to the page body (`SignUpRow.tsx`).
- ~~F5~~ fixed at `/complete-epic`: S02.1's Verification references point at the current `accounts.spec.ts` lines.
- QA run 1 observation (minor): a rejected account still sees the "Contributor area" link in the header; it leads to the not-approved notice.

## Verification

**GREEN** · 2026-11-24

Review [round 1](review.md) is APPROVE. `pnpm verify` exit 0 (main session); `pnpm e2e` 42 of 42 passed (FE-02).

- **Acceptance criteria**, each built as written and each with tests titled `S02.2 AC<n>`:
  - AC1, AC2: `apps/api/src/common/config.ts:62-92` (all-or-none, sign-up rules, one-line error); `apps/api/src/modules/users/bootstrap-admin.service.ts:44-61` (one transaction; create or promote, password kept). Tests `apps/api/test/bootstrap-admin.int.test.ts:82-222`, `apps/api/test/unit/common/config.test.ts` (`loadConfig BOOTSTRAP_ADMIN_*`).
  - AC3: `e2e/test-env.ts` (`TEST_ADMIN` in `TEST_ENV`, shared by `pnpm e2e` and `pnpm qa:serve`). Tests `e2e/tests/sign-up-review.spec.ts:23`, `apps/web/src/components/AccountMenu.test.tsx:126`.
  - AC4, AC8: `apps/api/src/modules/users/users.service.ts:127-159` (one ordered query; one conditional `UPDATE`, then 404 or 409); `packages/shared/src/schemas/admin-users.ts`. Tests `apps/api/test/admin-sign-ups.int.test.ts:82-163,244-307`, `packages/shared/src/schemas/admin-users.test.ts`, `apps/web/src/pages/admin-sign-ups/SignUpsPage.test.tsx:71,205`.
  - AC5, AC11: `SignUpsPage.tsx:28-67`, `SignUpRow.tsx:58`, `apps/web/src/api/admin-users.ts:25-43`. Tests `SignUpsPage.test.tsx:91-133,240-344`.
  - AC6, AC7: tests `admin-sign-ups.int.test.ts:168-241` (the person's existing cookie; the later sign-up gives `EMAIL_TAKEN`), `SignUpsPage.test.tsx:135-203`, `sign-up-review.spec.ts:31,58`.
  - AC9: `apps/api/src/modules/users/admin-users.controller.ts:17` (`@Admin()` on the class), `apps/api/src/modules/auth/access.guard.ts:41-45`. Tests `admin-sign-ups.int.test.ts:309-352` (4 callers × 3 endpoints, target unchanged).
  - AC10: `apps/web/src/components/RequireAccount.tsx:57-70`, `AccountMenu.tsx:34`. Tests `RequireAccount.test.tsx:195-249`, `AccountMenu.test.tsx:126-158`, `sign-up-review.spec.ts:96,108,120`.
  - AC12: `sign-up-review.spec.ts:31,58,120,137` at 375 px and 1280 px.
- **Refused callers:** anonymous (401), pending, rejected and approved contributor (403) on all three endpoints, over HTTP; on the page, anonymous goes to log in, pending and rejected see their notices, a contributor sees "No access".
- **Data rules** sit where [design.md](../design.md) "Data" puts them: one conditional update per decision (two calls at once give one 200 and one 409), and bootstrap runs in one transaction. No schema change. No hash or password in any response or log line.
- **S02.1 F3** closed: `e2e/tests/accounts.spec.ts:143-155` uses a real account approved by the setup admin.
- **Left open:** review F1–F5 (minor), to be listed under "Known gaps".

## Changes

- 2026-11-24 · `/complete-epic` (S02.3 review F2): AC8 and the API contract now say that S02.3 also allows `status=APPROVED`; the S02.2 behaviour is unchanged. Verification line references updated after S02.3 moved code (`users.service.ts`, `admin-users.controller.ts`, `admin-sign-ups.int.test.ts`, `AccountMenu.test.tsx`). Known gaps F1 and F5 closed by documentation, F3's risk recorded in the designs.
