---
id: S02.3
epic: E02
title: Share the admin role
type: feature
status: done
covers: [US14, NFR4]
updated: 2026-11-24
---

# S02.3 Share the admin role

**As an** admin **I want** to make an approved contributor an admin, or an admin a contributor again, **so that** the lab can share the admin work and never lose its last admin · Delivers: C7, C8, C10 (role actions), C13 (its page), C14 · Design: [design.md](../design.md) · Depends on: [S02.2](../S02.2-approve-signups/story.md)

**Try it:** `pnpm qa:serve`; sign up a person and approve them as the setup admin; open "Accounts", press "Make admin"; reload the person's window and open "Sign-ups"; then "Remove admin" and reload again.

## Acceptance criteria

- **AC1** Given approved contributors, admins, and pending and rejected accounts, When an admin opens `/admin/accounts`, Then only the approved accounts are listed, sorted by name then email, each with name, email, the role in words ("Admin" or "Contributor") and a "Make admin" button for a contributor or a "Remove admin" button for an admin; `GET /api/admin/users?status=APPROVED` returns them as `AdminUserList` in the same order.
- **AC2** Given the list request has not answered, Then `status` "Loading…" is shown; Given it fails, Then `alert` "Couldn't load, try again." with "Retry" is shown, and Retry loads it again.
- **AC3** Given an approved contributor, When an admin presses "Make admin", Then the server answers 200 `AdminUser` with role `ADMIN`, the row shows "Admin" and "Remove admin", `status` "<name> is now an admin." is shown, and that person's next page load shows "Sign-ups" and "Accounts" in the header and reaches `/admin/sign-ups` without a new login.
- **AC4** Given another admin, When an admin presses "Remove admin" on them, Then the server answers 200 `AdminUser` with role `CONTRIBUTOR`, `status` "<name> is now a contributor." is shown, and on that person's next page load `/admin/sign-ups` shows "No access" while `/contribute` still shows the contributor area.
- **AC5** Given exactly one admin, When that admin presses "Remove admin" on themselves, Then the server answers 409 `LAST_ADMIN`, `alert` "There must be at least one admin." is shown, and they are still an admin.
- **AC6** Given exactly two admins, When each sends a request to demote the other at the same moment, Then exactly one request succeeds, the other gets 409 `LAST_ADMIN`, and exactly one admin remains; an automated test proves this deterministically and fails if the lock on the admin rows is removed.
- **AC7** Given two admins, When an admin removes their own admin role, Then it succeeds, and the page they are on then shows "No access" and the header no longer shows "Sign-ups" or "Accounts".
- **AC8** Given a pending or rejected account, When an admin sends `PUT /api/admin/users/:id/role` with `ADMIN` directly, Then the server answers 409 `USER_NOT_APPROVED` and the account is unchanged. An unknown id gives 404 `NOT_FOUND`; an id that is not a UUID, a role other than `ADMIN` or `CONTRIBUTOR`, or a missing role gives 400 `VALIDATION_FAILED`; setting the role an account already has answers 200 and changes nothing.
- **AC9** Given an anonymous visitor, a pending account, a rejected account and an approved contributor, When each calls `GET /api/admin/users?status=APPROVED` and `PUT /api/admin/users/:id/role` directly (including a contributor promoting themselves), Then the anonymous visitor gets 401 `UNAUTHENTICATED`, the others get 403 `FORBIDDEN`, and no role changes.
- **AC10** Given `/admin/accounts` is opened by link or typed URL, Then an anonymous visitor is sent to `/login?next=/admin/accounts`, a pending or rejected account sees its notice, an approved contributor sees "No access", and only admins see the "Accounts" link in the header.
- **AC11** Given a role change is being sent, Then that row's button is disabled; When it fails with 500 or a network error, Then `alert` "Couldn't save, try again." is shown and the row is unchanged; When it fails with 401 or 403, Then the page shows the matching gate notice.
- **AC12** Given a 375 px and a 1280 px wide window, When `/admin/accounts` is shown, Then nothing scrolls sideways, and `pnpm e2e` runs at both widths: the setup admin makes a newly approved person an admin → that person reloads and reaches `/admin/sign-ups` → the admin removes the role → the person reloads and sees "No access" on `/admin/sign-ups` and the contributor area on `/contribute`.

## API contract

Changes to `packages/shared/src/schemas/admin-users.ts`:

- `AdminUsersQuery { status: "PENDING" | "APPROVED" }`: PENDING oldest first (S02.2), APPROVED by name, then email
- `ChangeRoleRequest { role: Role }`

New `ErrorCode` values: `USER_NOT_APPROVED`, `LAST_ADMIN`.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| GET | /api/admin/users?status=APPROVED | Admin | `AdminUsersQuery` → 200 `AdminUserList` | 400; 401; 403 |
| PUT | /api/admin/users/:id/role | Admin | `UserIdParam`, `ChangeRoleRequest` → 200 `AdminUser` | 400; 401; 403; 404; 409 `USER_NOT_APPROVED` "Only approved accounts can change role."; 409 `LAST_ADMIN` "There must be at least one admin." |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/admin/accounts` | `status` "Loading…"; a row being saved has a disabled button | none: there is always at least one admin | `alert` "Couldn't load, try again." + "Retry"; `alert` "Couldn't save, try again."; `alert` "There must be at least one admin." | h1 "Accounts"; rows with name, email, role in words, "Make admin" or "Remove admin"; `status` "<name> is now an admin." / "<name> is now a contributor." |

## Approach

- **API:** `UsersService.changeRole` runs the transaction of design "Flows" (second diagram); the `PUT …/role` handler joins `AdminUsersController` from S02.2.
- **Web:** `src/api/admin-users.ts` gains the APPROVED list and the role mutation; `src/pages/admin-accounts/`; `AccountMenu` gains "Accounts". Follow `SignUpsPage` from S02.2.
- **e2e:** reuse the helpers of S02.2 FE-02.

## Tickets

1. [BE-01 Role change endpoint and the last-admin rule](be/BE-01-role-change-endpoint.md)
2. [FE-01 Accounts page](fe/FE-01-accounts-page.md)
3. [FE-02 Role sharing journey test](fe/FE-02-role-journey.md)

## Out of scope

- Changing a pending or rejected account in any way; deactivating or deleting accounts (epic "Out of scope").
- A confirm step for role changes (design open question 4).

## Known gaps

- F1 (minor, review round 1): the admin-row lock in `changeRole` (`users.service.ts:171-177`) only sees rows that were admins when it started; a promotion and a self-demotion at the same moment can wrongly refuse the demotion with `LAST_ADMIN` (fails safe, a retry works). Recorded as an accepted risk under design.md "Risks" at `/complete-epic`.
- ~~F2~~ fixed at `/complete-epic`: S02.2 AC8 and its contract now say S02.3 also allows `APPROVED`.
- B1 (minor, QA run 1): after an admin removes their own admin role, the page reloads `GET /api/admin/users?status=APPROVED`, which is refused with 403 and logged in the console; the page itself correctly shows "No access".

## Verification

**GREEN** · 2026-11-24

Review [round 1](review.md) is APPROVE. `pnpm verify` exit 0 (main session); `pnpm e2e` 52 of 52 passed (FE-02).

- **Acceptance criteria**, each built as written and each with tests titled `S02.3 AC<n>`:
  - AC1: `apps/api/src/modules/users/users.service.ts:42-45,127-134` (one query, name, email, id); `packages/shared/src/schemas/admin-users.ts`. Tests `apps/api/test/admin-roles.int.test.ts:105,149`, `apps/web/src/pages/admin-accounts/AccountsPage.test.tsx:89,118`.
  - AC2: `AccountsPage.tsx` (loading, error + Retry). Tests `AccountsPage.test.tsx:130,144`.
  - AC3, AC4: `users.service.ts:169-200`; `apps/web/src/api/admin-users.ts:48-88`. Tests `admin-roles.int.test.ts:179,198` (the target's existing cookie through `GET /api/auth/me`), `AccountsPage.test.tsx:166,184`, `apps/web/src/components/AccountMenu.test.tsx:160`, `e2e/tests/admin-roles.spec.ts:28`.
  - AC5, AC6: `users.service.ts:171-177,192-194` (admin rows `FOR UPDATE` before counting). Tests `admin-roles.int.test.ts:214,225` (lock held from a separate connection; fails without the lock, as BE-01's notes record), `:268` (an HTTP race), `AccountsPage.test.tsx:204`.
  - AC7: `admin-users.ts:61-88` (`me` reloaded when the target is the signed-in admin). Tests `admin-roles.int.test.ts:283`, `AccountsPage.test.tsx:223`.
  - AC8: `users.service.ts:183-191`; `ChangeRoleRequest`, `UserIdParam`. Tests `admin-roles.int.test.ts:163,295-372`, `packages/shared/src/schemas/admin-users.test.ts`.
  - AC9: `apps/api/src/modules/users/admin-users.controller.ts:17` (`@Admin()` on the class), `:48`. Tests `admin-roles.int.test.ts:389` (4 callers × 2 endpoints, rows unchanged), `:418` (self-promotion), `:435` (foreign `Origin`).
  - AC10: `apps/web/src/App.tsx` (under `RequireAccount level="admin"`), `AccountMenu.tsx`. Tests `AccountsPage.test.tsx:349,357`, `AccountMenu.test.tsx:160-194`, `admin-roles.spec.ts:80,92,104`.
  - AC11: `AccountRow.tsx` (the row's own mutation, button disabled while it is pending), `AccountsPage.tsx` (`messageFor`). Tests `AccountsPage.test.tsx:244,265,285,305,326`.
  - AC12: `admin-roles.spec.ts:28,104,120` at 375 px and 1280 px.
- **Refused callers:** anonymous (401), and pending, rejected and approved contributor (403), on both endpoints over HTTP, with no role changed. On the page, an anonymous visitor goes to log in, pending and rejected accounts see their notices, and a contributor sees "No access".
- **Data rules** sit where [design.md](../design.md) "Data" and "Flows" put them. The role change is one transaction with the admin rows locked, and only `APPROVED` targets may change role. No schema change. No hash or personal data in any response or log line.
- **Contract change:** BE-01 removed the S02.2 cases that refused `status=APPROVED`. This is the change S02.2's contract announced, not a weakened test (review round 1, point 1).
- **Left open:** review F1 and F2 (minor), to be listed under "Known gaps".

## Changes

- 2026-11-24 · `/complete-epic`: Known gaps F1 (recorded as an accepted risk in design.md) and F2 (closed: S02.2's story updated).
