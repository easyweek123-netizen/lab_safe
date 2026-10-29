# QA: S01.1

Tick (`[x]`) the bugs `/fix` should handle. Add instructions as `> note` lines under a bug.

## Run 1 · 2026-10-29 · verdict: FAIL

Application: `pnpm qa:serve` does not exist yet (S01.3), so there is no test copy of the app and no web page. Manual cases ran in the terminal; TC-4.2 and TC-6.1 were also opened in the Playwright browser against `pnpm dev` (dev API on `http://localhost:3000`, development database on 5442, approved through the permission prompt). Automated cases are confirmed by `pnpm verify` (exit 0: format check, lint, typecheck, shared 14 + API 41 unit tests, 10 integration tests, build, docs check OK). Phone width and keyboard checks: not applicable (no pages in this story). Evidence for terminal cases is saved as `qa/run1-<TC>.txt`.

The verdict is FAIL only because TC-10.3 could not be run: running `pnpm test:db:prepare` by hand was refused at the permission prompt. No blocker or major bug was found. Approve `pnpm test:db:prepare` and run `/qa S01.1` again to finish TC-10.3.

| TC      | Role      | Result | Evidence |
| ------- | --------- | ------ | -------- |
| TC-1.1  | developer | ✅ | [log](qa/run1-TC-1.1.txt): `pnpm install` in a fresh copy of the tree (no `node_modules`/`dist`) ran the `@swc/core` and `esbuild` builds with no "ignored build scripts" warning; `pnpm typecheck` exit 0 for shared and api |
| TC-2.1  | —         | ✅ | `pnpm verify` (11 `TC-2.1` unit tests) |
| TC-2.2  | —         | ✅ | `pnpm verify` (3 `TC-2.2` unit tests) |
| TC-3.1  | developer | ✅ | [log](qa/run1-TC-3.1.txt): after TC-10.4 stopped `db-test`, `pnpm db:up` started it from the local `postgres:15` image (no pull); `db` 5442 and `db-test` 5443 both `healthy`. The "no LabSafe containers" precondition was not recreated (that needs removing the containers) |
| TC-4.1  | anonymous | ✅ | `pnpm verify` (integration test `TC-4.1`) |
| TC-4.2  | developer | ✅ | [img](qa/run1-TC-4.2.png): `pnpm dev`, then `GET /api/health` → 200 `{"status":"ok","database":"ok"}` |
| TC-5.1  | —         | ✅ | `pnpm verify` (2 `TC-5.1` unit tests) |
| TC-5.2  | anonymous | ✅ | `pnpm verify` (2 `TC-5.2` integration tests) |
| TC-6.1  | anonymous | ✅ | `pnpm verify` (integration test) and [img](qa/run1-TC-6.1.png): `GET /api/does-not-exist` on the dev API → 404 `{"statusCode":404,"code":"NOT_FOUND","message":"Not found."}` |
| TC-6.2  | —         | ✅ | `pnpm verify` (2 `TC-6.2` unit tests) |
| TC-6.3  | —         | ✅ | `pnpm verify` (4 `TC-6.3` unit tests) |
| TC-7.1  | —         | ✅ | `pnpm verify` (2 `TC-7.1` unit tests) |
| TC-7.2  | —         | ✅ | `pnpm verify` (5 `TC-7.2` unit tests) |
| TC-7.3  | —         | ✅ | `pnpm verify` (2 `TC-7.3` unit tests) |
| TC-7.4  | developer | ✅ | [log](qa/run1-TC-7.4.txt): exit 1, one line `Invalid configuration: DATABASE_URL: is required`, no stack; with `PORT=abc NODE_ENV=staging` too, one line names all three settings |
| TC-8.1  | —         | ✅ | `pnpm verify` (2 `TC-8.1` unit tests) |
| TC-8.2  | —         | ✅ | `pnpm verify` (1 `TC-8.2` unit test) |
| TC-9.1  | —         | ✅ | `pnpm verify` (integration test) |
| TC-9.2  | —         | ✅ | `pnpm verify` (4 `TC-9.2` integration tests) |
| TC-10.1 | —         | ✅ | `pnpm verify` (12 `TC-10.1` unit tests) |
| TC-10.2 | —         | ✅ | `pnpm verify` (1 `TC-10.2` unit test) |
| TC-10.3 | developer | ⚠️ not run | `pnpm test:db:prepare` was refused at the permission prompt. Indirect evidence only: the integration `globalSetup` calls the same `prepareTestDb()`; it ran twice in a row (`pnpm verify`, then a verbose `pnpm test:int`) and `TC-9.1` found exactly 4 rooms after the second run |
| TC-10.4 | developer | ✅ | [log](qa/run1-TC-10.4.txt) (review F5): `db-test` stopped, `pnpm test:int` → exit 1 with `Error: The test database on localhost:5443 is not running. Run \`pnpm db:up\` first.` and no stack frames. Vitest also prints a misleading "No test files found" line (B1) |
| TC-11.1 | developer | ✅ | [log](qa/run1-TC-11.1.txt): format check → lint → typecheck → unit tests → integration tests → build → docs check, exit 0 |
| TC-11.2 | developer | ✅ | [log](qa/run1-TC-11.2.txt): a badly formatted temporary file `qa-format-probe.ts` at the root → `pnpm verify` stops at `prettier --check` with exit 1; lint and later steps did not run; file removed afterwards |
| TC-12.1 | user      | ✅ | `apps/api/CLAUDE.md` has all seven bullets of E01 design §10 (module layout, Zod pipe, mapped objects, `ErrorCode` via the filter, migration rules, `createTestApp`/`resetTables` and test naming, database-command approval) |

Exploratory checks on the dev API (all as expected): `GET /`, `/api`, `/api/`, `/api/health/x` and `DELETE /api/health` → 404 `NOT_FOUND`; malformed JSON → 400 `VALIDATION_FAILED`; a 200 kB JSON body → 413 `REQUEST_REJECTED`, logged at `warn`; `GET /api/health?x=1` → 200.

Bugs:

- [ ] B1 [minor][be] Steps: stop the test database (`docker compose stop db-test`), run `pnpm test:int` → expected only the message telling to run `pnpm db:up` / actual Vitest first prints `No test files found, exiting with code 1` with the `include: test/**/*.int.test.ts` pattern, then an `Unhandled Error` banner, then the right message. The "No test files found" line is wrong (two test files exist) and points the developer at the test pattern instead of the database.
- [x] B2 [minor][be] Steps: `pnpm dev` → expected log lines prefixed `[shared]` and `[api]` / actual they are prefixed `[sharedshared]` and `[sharedapi]`, so every API line is labelled "shared…". The root `dev` script combines `-n shared,api,web` with the `pnpm:dev:*` wildcard, and concurrently prepends the first name to each expanded script name. → fixed: root `dev` script is now `concurrently -k "pnpm:dev:*"` without a -n list, so lines are labelled [shared], [api] (and later [web]).
- [ ] B3 [minor][be] Steps: use the Playwright browser tools (as `/qa` does), then run `pnpm verify` → expected the quality gate ignores browser-tool output / actual the tools write `.playwright-mcp/*.yml` and `*.log` into the repository root, `.prettierignore` and `.gitignore` do not list `.playwright-mcp/`, so `prettier --check` fails on the `.yml` snapshots and the folder shows up as untracked. (This run left `.playwright-mcp/` in the root: removing it was refused by a safety check; delete it by hand.)

Specs added: none (S01.1 has no `auto: e2e` test cases; Playwright arrives in S01.3) · `pnpm e2e`: not available yet (S01.3)

## Run 2 · 2026-10-29 · verdict: PASS

Application: `pnpm qa:serve` still does not exist (S01.3), so there is no test copy of the app and no web page; the Playwright browser tools were not used. Manual cases ran in the terminal. Automated cases are confirmed by `pnpm verify` (exit 0: format check, lint, typecheck, shared 14 + API 41 unit tests, 10 integration tests, build, docs check OK; every automated test case has tests named after it). Since Run 1 only the root `dev` script changed (B2 fix), so the manual cases it cannot affect (TC-1.1, TC-3.1, TC-7.4, TC-10.4, TC-11.2, TC-12.1) carry their Run 1 result and were not repeated; TC-4.2 and TC-6.1 were rechecked on `pnpm dev` with `curl`. Phone width and keyboard checks: not applicable (no pages in this story). Evidence is saved as `qa/run2-<TC>.txt`. Both database containers were left running.

| TC      | Role      | Result | Evidence |
| ------- | --------- | ------ | -------- |
| TC-1.1  | developer | ✅ (Run 1) | [log](qa/run1-TC-1.1.txt); not affected by the B2 fix |
| TC-2.1  | —         | ✅ | `pnpm verify` (11 `TC-2.1` unit tests) |
| TC-2.2  | —         | ✅ | `pnpm verify` (3 `TC-2.2` unit tests) |
| TC-3.1  | developer | ✅ (Run 1) | [log](qa/run1-TC-3.1.txt); `docker compose ps` at the start of this run: `db` 5442 and `db-test` 5443 both `running (healthy)` |
| TC-4.1  | anonymous | ✅ | `pnpm verify` (integration test `TC-4.1`) |
| TC-4.2  | developer | ✅ | [log](qa/run2-TC-4.2.txt): `pnpm dev`, then `curl localhost:3000/api/health` → 200 `{"status":"ok","database":"ok"}` |
| TC-5.1  | —         | ✅ | `pnpm verify` (2 `TC-5.1` unit tests) |
| TC-5.2  | anonymous | ✅ | `pnpm verify` (2 `TC-5.2` integration tests) |
| TC-6.1  | anonymous | ✅ | `pnpm verify` (integration test) and [log](qa/run2-TC-4.2.txt): `GET /api/does-not-exist` on the dev API → 404 `{"statusCode":404,"code":"NOT_FOUND","message":"Not found."}` |
| TC-6.2  | —         | ✅ | `pnpm verify` (2 `TC-6.2` unit tests) |
| TC-6.3  | —         | ✅ | `pnpm verify` (4 `TC-6.3` unit tests) |
| TC-7.1  | —         | ✅ | `pnpm verify` (2 `TC-7.1` unit tests) |
| TC-7.2  | —         | ✅ | `pnpm verify` (5 `TC-7.2` unit tests) |
| TC-7.3  | —         | ✅ | `pnpm verify` (2 `TC-7.3` unit tests) |
| TC-7.4  | developer | ✅ (Run 1) | [log](qa/run1-TC-7.4.txt); not affected by the B2 fix |
| TC-8.1  | —         | ✅ | `pnpm verify` (2 `TC-8.1` unit tests) |
| TC-8.2  | —         | ✅ | `pnpm verify` (1 `TC-8.2` unit test) |
| TC-9.1  | —         | ✅ | `pnpm verify` (integration test) |
| TC-9.2  | —         | ✅ | `pnpm verify` (4 `TC-9.2` integration tests) |
| TC-10.1 | —         | ✅ | `pnpm verify` (12 `TC-10.1` unit tests) |
| TC-10.2 | —         | ✅ | `pnpm verify` (1 `TC-10.2` unit test) |
| TC-10.3 | developer | ✅ | [log](qa/run2-TC-10.3.txt): `pnpm test:db:prepare` twice in a row (approved at the permission prompt), both print `Test database labsafe_test is ready.` and exit 0; a read-only `SELECT` on `labsafe_test` then finds 4 rows in `lab_rooms` (LAB-101, LAB-102, LAB-201, LAB-202), not 8, and 1 row in `migrations` |
| TC-10.4 | developer | ✅ (Run 1) | [log](qa/run1-TC-10.4.txt); B1 (accepted) still applies |
| TC-11.1 | developer | ✅ | [log](qa/run2-TC-11.1.txt): format check → lint → typecheck → unit tests → integration tests → build → docs check, exit 0 |
| TC-11.2 | developer | ✅ (Run 1) | [log](qa/run1-TC-11.2.txt); the `verify` script is unchanged since Run 1 |
| TC-12.1 | user      | ✅ (Run 1) | `apps/api/CLAUDE.md` has all seven bullets of E01 design §10 (checked in Run 1) |

Retest of B2: ✅ fixed. [log](qa/run2-B2-pnpm-dev.txt): `pnpm dev` (`concurrently -k "pnpm:dev:*"`) labels every line `[shared]` or `[api]` (21 and 15 lines), no `[sharedshared]` or `[sharedapi]`. The dev servers were stopped afterwards (port 3000 free).

Bugs: no new bugs. B1 and B3 stay open (accepted by the user); B2 is fixed.

Specs added: none (S01.1 has no `auto: e2e` test cases; Playwright arrives in S01.3) · `pnpm e2e`: not available yet (S01.3)
