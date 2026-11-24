---
id: BE-01
story: S02.1
layer: be
status: done
depends_on: []
covers: [AC2, AC4, AC13, AC14]
updated: 2026-11-24
---

# BE-01 Accounts contract, tables and password hashing

**Goal:** create the story's shared contract, the `users` and `sessions` tables with their entities, and the scrypt password hashing. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `packages/shared/src/schemas/auth.ts`, `packages/shared/src/schemas/auth.test.ts`
- change `packages/shared/src/errors.ts`, `packages/shared/src/index.ts`
- create `apps/api/src/modules/users/user.entity.ts`, `apps/api/src/modules/auth/session.entity.ts`
- create `apps/api/src/db/migrations/<timestamp>-CreateUsersAndSessions.ts`; change `apps/api/src/db/migrations/index.ts`
- create `apps/api/src/common/password.ts`, `apps/api/test/unit/common/password.test.ts`

## Constraints

- The contract is exactly the story's "API contract", with the messages written there; follow `schemas/meta.ts` (schema and type share a name). The schema unit tests prove AC2's limits and messages, the lower-casing of the email, and that `role` and `status` keys are stripped from a sign-up body (AC4).
- Add the four error codes of the story to the shared `ErrorCode` enum only.
- Tables, columns, defaults and constraints as in [design.md "Data"](../../design.md#data), including `CHECK (email = lower(email))`, `CHECK (role <> 'ADMIN' OR status = 'APPROVED')`, the value CHECKs built from the shared `ROLES` and `ACCOUNT_STATUSES`, the unique `token_hash`, the index on `sessions.user_id` and `ON DELETE CASCADE`.
- Follow `apps/api/src/modules/meta/lab-room.entity.ts`: the entities mirror the migration exactly, including constraint names, so a later `db:generate` produces no change.
- `password.ts` exports a hash function and a verify function, both async (`crypto.scrypt`, never the sync version), with the parameters of design decision E02-D6 and a comparison in constant time. Verify returns false, never throws, for a malformed stored value. It also exports one fixed dummy hash for the unknown-email path (used by BE-03).
- The unit tests prove AC13's hash part: the format, two hashes of one password differ, neither contains the password, verify accepts the right and refuses a wrong password.
- No password, hash or token is ever logged.
- Schema change: yes, migration `CreateUsersAndSessions`. Running `db:generate` needs the development database and the user's approval; writing the migration by hand, like `CreateLabRooms`, is fine. The user approves the file before `pnpm db:migrate` runs.

## Out of scope

Endpoints, guards and cookies (BE-02, BE-03). The first admin (S02.2).

## Implementation notes

**Files changed:**

- packages/shared/src/schemas/auth.ts
- packages/shared/src/schemas/auth.test.ts
- packages/shared/src/errors.ts
- packages/shared/src/index.ts
- apps/api/src/modules/users/user.entity.ts
- apps/api/src/modules/auth/session.entity.ts
- apps/api/src/db/migrations/1795521437455-CreateUsersAndSessions.ts
- apps/api/src/db/migrations/index.ts
- apps/api/src/common/password.ts
- apps/api/test/unit/common/password.test.ts
- apps/api/test/accounts-tables.int.test.ts

**Differences from the ticket:**

- The migration was generated with `db:generate` from the entities, so its role and status CHECKs hold the values as literals; the entity builds them from `ROLES` and `ACCOUNT_STATUSES`, and `accounts-tables.int.test.ts` proves the database lists equal the shared constants.
- Added `users_name_check` (`name = btrim(name) AND char_length(name) BETWEEN 1 AND 100`) from design "Data" ("CHECK trimmed, 1-100 chars").
- Extra test file `apps/api/test/accounts-tables.int.test.ts` (AC14 columns, defaults, CHECKs, unique keys, index, cascade).
- Hash encoding: salt and key in base64url without padding. Verify accepts only N a power of two up to 2^20, r up to 32, p up to 16, so a malformed stored value returns false before scrypt runs.
