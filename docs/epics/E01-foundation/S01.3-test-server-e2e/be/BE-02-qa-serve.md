---
id: BE-02
story: S01.3
layer: be
status: done
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

**Done (2026-10-29).** No migrations.

- `e2e/test-env.ts`: `TEST_PORT`, `TEST_BASE_URL` and `TEST_ENV` exactly as in step 1 (`as const`). Its comment, and a new comment in `apps/api/scripts/test-db-guard.ts`, say that `TEST_ENV.DATABASE_URL` must equal `TEST_DATABASE_URL`.
- `e2e/qa-serve.ts`: starts `apps/api/dist/main.js` with `{ ...process.env, ...TEST_ENV }` and inherited output. It checks `GET /api/health` every 250 ms for up to 30 s and prints `QA server: http://localhost:4100` on the first 200. If the child exits first, it prints `The QA server did not start. Is port 4100 already in use?` and exits 1. It passes `SIGINT`/`SIGTERM` on to the child and exits with the child's exit code.
- Root `package.json`: `"qa:serve": "pnpm build && pnpm test:db:prepare && tsx e2e/qa-serve.ts"`, and devDependency `tsx` `^4.23.15` (the same version as the API). `pnpm-lock.yaml` is updated.
- `apps/api/CLAUDE.md`: a new "Test server" section with the three bullets.

**Checked by hand:**

- TC-4.1: `pnpm qa:serve` ran build, then `Test database labsafe_test is ready.`, then the Nest start-up, then `QA server: http://localhost:4100`. `/api/health` answered `{"status":"ok","database":"ok"}`; `/` answered 200 `text/html`; `/does-not-exist` returned the web app (`<title>LabSafe</title>`); `/api/meta/lists` answered. `SIGINT` sent to the process group (as Ctrl+C does) stopped it, and nothing was listening on 4100 afterwards.
- Port 4100 taken by a plain TCP listener: Nest logs `EADDRINUSE`, then the message above, exit 1.
- Port 4100 taken by a second QA server: the message above, exit 1.
- TC-4.2 was **not** run. It needs the test database stopped, and that needs the user's approval. The behaviour comes from `test:db:prepare` (S01.1 BE-04): the `&&` chain stops before `tsx` when it fails.

**Differences from the ticket (all inside `qa-serve.ts`; none changes the design):**

1. **Check before start.** If something already answers `/api/health` on :4100, the script prints the "did not start" message and exits 1 without starting. Without this check, the polling could reach the other server before the child failed with `EADDRINUSE`, and the script would announce a server that isn't ours.
2. **30 s timeout.** The ticket didn't say what happens when the app never answers. The script prints `The QA server did not answer http://localhost:4100/api/health within 30 s.`, stops the child, and exits 1.
3. **Exit code after Ctrl+C.** When a signal stops the child, it has no exit code, so the script exits with 128 + the signal number (130 for Ctrl+C, 143 for SIGTERM), as shells do. As a result, pnpm prints `ELIFECYCLE Command failed with exit code 130` after Ctrl+C. This follows "exit with the child's exit code" literally; exiting 0 after a requested stop would be a one-line change.
4. **Which Node.** The child is started with `process.execPath`, the Node that runs `tsx`, not `node` from `PATH`. The working directory is inherited, and pnpm runs root scripts from the repository root, so `WEB_DIST_DIR=apps/web/dist` resolves correctly.
5. **Type checking.** `e2e/*.ts` is linted and format-checked by `pnpm verify`, but `pnpm typecheck` doesn't cover it until FE-01 adds `e2e/package.json` and `tsconfig.json`. A one-off strict `tsc --noEmit` of both files passed.

**Proof:** `pnpm verify` passes. That covers format, lint, typecheck, unit tests (shared 18, api 46, web 9), integration tests (22), build and docs check (OK).
