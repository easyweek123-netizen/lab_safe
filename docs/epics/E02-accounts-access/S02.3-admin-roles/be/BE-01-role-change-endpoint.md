---
id: BE-01
story: S02.3
layer: be
status: done
depends_on: []
covers: [AC1, AC3, AC4, AC5, AC6, AC7, AC8, AC9]
updated: 2026-11-24
---

# BE-01 Role change endpoint and the last-admin rule

**Goal:** an admin lists approved accounts and changes their role; the last admin can never be removed, even under concurrency. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `packages/shared/src/schemas/admin-users.ts`, `admin-users.test.ts`
- change `packages/shared/src/errors.ts`
- change `apps/api/src/modules/users/admin-users.controller.ts`, `users.service.ts`
- create `apps/api/test/admin-roles.int.test.ts`

## Constraints

- Contract, statuses and messages exactly as in the story's "API contract".
- `changeRole` follows invariant I7 and [design.md "Flows"](../../design.md#flows) (second diagram): one transaction, the admin rows locked with `FOR UPDATE` before counting, every query through the transaction's `manager`. Only `APPROVED` targets may change role (the `CHECK (role <> 'ADMIN' OR status = 'APPROVED')` constraint is the safety net, not the check).
- The APPROVED list is one query ordered by name, then email, then id.
- AC6's test is deterministic: from a separate connection, the test holds the lock on the admin rows, starts the second demotion through HTTP, demotes the other admin and commits, then expects 409 `LAST_ADMIN` and one admin left. Check once that it fails with the lock removed, and say so in the notes.
- The integration tests prove each AC in `covers`, including the AC9 matrix (four refused callers × two endpoints, roles unchanged after each refusal) and AC3, AC4 by calling `GET /api/auth/me` with the target's existing cookie. Titles start with `S02.3 AC<n>`.
- Schema change: no.

## Out of scope

The web page (FE-01).

## Implementation notes

**Files changed:**

- packages/shared/src/schemas/admin-users.ts
- packages/shared/src/schemas/admin-users.test.ts
- packages/shared/src/errors.ts
- apps/api/src/modules/users/admin-users.controller.ts
- apps/api/src/modules/users/users.service.ts
- apps/api/test/admin-roles.int.test.ts
- apps/api/test/admin-sign-ups.int.test.ts

**Differences from the ticket:**

- Two S02.2 tests refused `status=APPROVED` because the contract did not have it yet: the case `'status APPROVED (S02.3)'` in `admin-users.test.ts` and `'status APPROVED'` in `admin-sign-ups.int.test.ts`. S02.3 adds `APPROVED` to the contract, so I removed those two cases. The other refused values (missing, `REJECTED`, lower case, repeated) are still tested in both files, and new S02.3 tests accept `APPROVED`. `admin-sign-ups.int.test.ts` is not in the ticket's file list.
- `UsersService` now injects `DataSource` and has a `Logger`. `changeRole(id, role)` runs one `dataSource.transaction`, with every query going through the transaction's repository. In order, it: (1) locks the admin rows with `SELECT id … WHERE role = 'ADMIN' ORDER BY id FOR UPDATE`; (2) locks the target row with `FOR UPDATE`; (3) answers 404 if the target does not exist; (4) answers 409 `USER_NOT_APPROVED` if it is not `APPROVED`, whatever the role asked for; (5) answers 200 with no write if it already has that role, so `updated_at` stays the same; (6) answers 409 `LAST_ADMIN` if this is a demotion and the target is the only locked admin; (7) otherwise runs one `UPDATE`. The log line names the account id and the new role, and no personal data.
- `listByStatus` picks its order from a `LIST_ORDER` map: `PENDING` by `created_at`, then id; `APPROVED` by name, then email, then id. It is still one query.
- The 404 message is "This account does not exist." (the same as in S02.2).
- AC6 lock check: I removed `lock` from the admin-row query once and ran the AC6 tests. Both failed: the deterministic one got 200 instead of 409, and the HTTP race got `[200, 200]`. Then I put the lock back. The deterministic test waits until `pg_blocking_pids` shows the request blocked by the test's own connection (polling every 25 ms, at most 200 times). If the request answers first, which only happens without the lock, the test goes on and fails on the 409 check.
- Extra tests beyond the ticket: the approved list ordered by email when names are equal, extra keys in the body stripped (a `status` in the body does not approve anyone), a PENDING, REJECTED or APPROVED contributor promoting themselves, an HTTP race of two demotions, and the role already held for both roles.
- A test that a foreign `Origin` on `PUT` is refused, added before the route existed, now proves the origin guard covers this route.
- The design.md "Endpoints" line `AdminUsersQuery { status: "PENDING" } (S02.3 adds "APPROVED")` is now out of date. This ticket may not edit design.md, so it is left for the owner of the design.
- No index on `users.role`: the ticket says there is no schema change, and the table is small (about 100 rows).
