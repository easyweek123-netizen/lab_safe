---
id: BE-02
story: S01.3
layer: be
status: todo
depends_on: [BE-01]
covers: [AC4]
updated: 2026-10-29
---

# BE-02 Test settings and the QA server command

**Goal:** add the shared test settings and `pnpm qa:serve`, which builds, prepares `labsafe_test` and keeps the built app running on :4100 for browser testing. **Automates:** none (TC-4.1 and TC-4.2 are checked by hand). **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `e2e/test-env.ts`
- create `e2e/qa-serve.ts`
- change `package.json` (root: `qa:serve` script, devDependency `tsx` 4)
- change `apps/api/CLAUDE.md` (a short "Test server" section), `apps/api/scripts/test-db-guard.ts` (a comment only)

## Approach

1. **`e2e/test-env.ts`** (design §6): export `TEST_PORT = 4100`, `TEST_BASE_URL = 'http://localhost:4100'` and `TEST_ENV`:
   `{ DATABASE_URL: 'postgres://labsafe:labsafe@localhost:5443/labsafe_test', PORT: '4100', NODE_ENV: 'test', WEB_DIST_DIR: 'apps/web/dist' }`.
   These are not secrets. `DATABASE_URL` must equal `TEST_DATABASE_URL` in `apps/api/scripts/test-db-guard.ts`; say so in a comment there and here. FE-01's Playwright config imports this file too.
2. **`e2e/qa-serve.ts`** (run with `tsx` from the repository root):
   - spawn `node apps/api/dist/main.js` with `{ ...process.env, ...TEST_ENV }` (the test values always win) and inherited output;
   - poll `GET ${TEST_BASE_URL}/api/health` every 250 ms for up to 30 s. When it answers 200, print exactly `QA server: http://localhost:4100`;
   - if the child exits before it is ready, print `The QA server did not start. Is port 4100 already in use?` and exit 1;
   - forward `SIGINT` and `SIGTERM` to the child, and exit with the child's exit code, so Ctrl+C frees the port.
3. **Root script** (design §5): `"qa:serve": "pnpm build && pnpm test:db:prepare && tsx e2e/qa-serve.ts"`. `test:db:prepare` already refuses any database except `labsafe_test` on 5443, and prints "run `pnpm db:up`" when it is not running (S01.1 BE-04), which gives TC-4.2.
4. **`apps/api/CLAUDE.md`:** add three bullets:
   - `pnpm qa:serve` and `pnpm e2e` run the built app on :4100 against `labsafe_test`, with the settings in `e2e/test-env.ts`;
   - they reset that database every time;
   - never run them while `pnpm verify` is running, because both use `labsafe_test`.
5. **Proof of work:** `pnpm verify`. Then, because `qa:serve` resets only `labsafe_test` (an allowed exception): run `pnpm qa:serve`, open `http://localhost:4100`, and stop it with Ctrl+C (TC-4.1). Ask the user before stopping the test database for TC-4.2.

## Out of scope

Playwright, `pnpm e2e` and the `e2e` package's `package.json` and `tsconfig.json` (FE-01). E2e seed data (later epics).

## Implementation notes

<!-- Filled in by the dev: what was done, deviations from this ticket or the design and why, migration names. -->
