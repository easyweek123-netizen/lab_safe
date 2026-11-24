---
id: BE-02
story: S02.2
layer: be
status: done
depends_on: [BE-01]
covers: [AC4, AC6, AC7, AC8, AC9]
updated: 2026-11-24
---

# BE-02 Sign-up review endpoints

**Goal:** an admin can list pending sign-ups and approve or reject each one; everyone else is refused. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `packages/shared/src/schemas/admin-users.ts`, `admin-users.test.ts`
- change `packages/shared/src/errors.ts`, `packages/shared/src/index.ts`
- create `apps/api/src/modules/users/admin-users.controller.ts`
- change `apps/api/src/modules/users/users.service.ts`, `users.module.ts`
- change `apps/api/test/auth-helpers.ts` (if a helper is missing for a status)
- create `apps/api/test/admin-sign-ups.int.test.ts`

## Constraints

- Endpoints, statuses and messages exactly as in the story's "API contract"; `@Admin()` on the controller class, so no handler can forget it.
- Approve and reject are one conditional update each, as in [design.md "Data"](../../design.md#data): no read-then-write. A missing id is 404, an existing non-pending one is 409 `USER_NOT_PENDING`.
- The list is one query, ordered by `created_at` then `id`. Responses use a `toAdminUserResponse` mapping with `createdAt` as an ISO string and no hash.
- The integration tests prove each AC in `covers`, including: the AC9 matrix (four refused callers × three endpoints, and the target unchanged after each refusal), the 409 for an approved and for a rejected target, AC7's later sign-up with the same email, and AC6 by calling `GET /api/auth/me` with the approved person's existing cookie. Titles start with `S02.2 AC<n>`.
- Schema change: no.

## Out of scope

`status=APPROVED` and role changes (S02.3).

## Implementation notes

**Files changed:**

- packages/shared/src/schemas/admin-users.ts
- packages/shared/src/schemas/admin-users.test.ts
- packages/shared/src/errors.ts
- packages/shared/src/index.ts
- apps/api/src/modules/users/admin-user.response.ts
- apps/api/src/modules/users/admin-users.controller.ts
- apps/api/src/modules/users/users.service.ts
- apps/api/src/modules/users/users.module.ts
- apps/api/test/admin-sign-ups.int.test.ts

**Differences from the ticket:**

- `toAdminUserResponse` lives in its own file `users/admin-user.response.ts`, like `auth/current-user.response.ts`.
- `apps/api/test/auth-helpers.ts` is unchanged: `insertUser` and `createSignedInUser` already take any role and status.
- `UsersService` gains `listByStatus(status)` and `decideSignUp(id, 'APPROVED' | 'REJECTED')`. `decideSignUp` is one `UPDATE … SET status, updated_at WHERE id = $1 AND status = 'PENDING' RETURNING …`; only when no row was updated does it look up whether the id exists, to pick 404 or 409. That lookup never decides the write.
- The 404 message is "This account does not exist." (the contract names no message).
- Approve and reject do not read the body (as for logout); the global origin guard still requires `application/json`.
- No index on `users.status`, although `WHERE status` is used: the ticket says no schema change, and the table holds about 100 rows (PRD). If an index is wanted, a later ticket can add it.
- Extra tests beyond the ticket: ties on `created_at` ordered by id, an empty list, an admin target gives 409, two simultaneous calls give one 200 and one 409, `updated_at` moves forward, and no response holds the hash.
