---
id: BE-01
story: S02.2
layer: be
status: done
depends_on: []
covers: [AC1, AC2, AC3]
updated: 2026-11-24
---

# BE-01 First admin from the setup configuration

**Goal:** the app creates the first admin from `BOOTSTRAP_ADMIN_*` at start-up when no admin exists, and the test copies start with one. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/api/src/common/config.ts`, `apps/api/test/unit/common/config.test.ts`
- create `apps/api/src/modules/users/bootstrap-admin.service.ts`
- change `apps/api/src/modules/users/users.module.ts`, `users.service.ts`
- change `.env.example`, `e2e/test-env.ts`
- create `apps/api/test/bootstrap-admin.int.test.ts`

## Constraints

- Behaviour exactly as in [design.md "Flows"](../../design.md#flows) ("First admin") and AC1, AC2. It runs once per start, after the database connection is ready, and writes in one transaction.
- The three settings are validated in the existing `ConfigSchema`: the email with the shared `Email` schema, the password with the sign-up password rule, the name with the sign-up name rule; a partial set fails with the existing one-line `ConfigError` format.
- The password is hashed with `common/password.ts` and never logged; the warning in AC2 names no secret.
- `e2e/test-env.ts` gets test-only values (not secrets) that the e2e helpers of FE-02 import; `.env.example` lists the three settings with placeholder values.
- Integration test titles start with `S02.2 AC<n>`; they start the app with explicit settings through `createTestApp(env)` and never depend on `.env`. AC3 is proven by FE-02 in the browser; here, prove the admin can log in through `POST /api/auth/login`.
- Schema change: no.

## Out of scope

The admin endpoints (BE-02). Changing the bootstrap admin's password later.

## Implementation notes

**Files changed:**

- apps/api/src/common/config.ts
- apps/api/test/unit/common/config.test.ts
- apps/api/src/modules/users/bootstrap-admin.service.ts
- apps/api/src/modules/users/users.module.ts
- apps/api/src/modules/users/users.service.ts
- .env.example
- e2e/test-env.ts
- apps/api/test/bootstrap-admin.int.test.ts

**Differences from the ticket:**

- `AppConfig` gets one `BOOTSTRAP_ADMIN: { email, password, name } | undefined` field instead of the three flat settings, so the service cannot see a partial set. A partial set gives one issue per missing setting, `BOOTSTRAP_ADMIN_<X>: is required when any BOOTSTRAP_ADMIN_* setting is set`. This check also runs when another setting is bad (Zod `when`), so one line names every problem.
- An empty value (for example `BOOTSTRAP_ADMIN_NAME=`) counts as set, and the sign-up rule then refuses it. The same goes for `COOKIE_SECURE=`.
- `BootstrapAdminService` runs in `onApplicationBootstrap`. When it promotes an existing account, the account keeps its name as well as its password; only the role and status change, in one `UPDATE`, because `users_admin_approved_check` requires both. It promotes PENDING, REJECTED and APPROVED accounts alike (AC1 says "that account").
- `UsersService` gains `adminExists`, `createApprovedAdmin`, `makeApprovedAdmin`, and an optional `manager` on `findByEmail`.
- The start-up log lines say what happened and name no email or password. The warning is "No admin account exists and BOOTSTRAP_ADMIN_* are not set: nobody can approve sign-ups." Integration tests that start without the settings now log this warning too; they still pass.
- `e2e/test-env.ts` exports `TEST_ADMIN` (`setup.admin@labsafe.test` / `setup-admin-password` / "Setup Admin") for FE-02, and `TEST_ENV` passes it as the three settings. `pnpm e2e` passes with it.
- `.env.example` lists the three settings uncommented with placeholder values, so a developer who copies it gets an admin in the development database.
- No index on `users.role`: the admin check is `WHERE role = 'ADMIN'` on a small table, and the ticket says no schema change. If S02.3's admin count needs one, that ticket can add it.
