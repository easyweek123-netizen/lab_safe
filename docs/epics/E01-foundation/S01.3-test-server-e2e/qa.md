# QA: S01.3

Tick (`[x]`) the bugs `/fix` should handle. Add instructions as `> note` lines under a bug.

## Run 1 · 2026-10-29 · verdict: FAIL

Application: `pnpm qa:serve` (fresh test database `labsafe_test` on 5443) · Address: `http://localhost:4100` · Browser: Playwright Chromium at 1280 × 800 and 375 × 812.

The verdict is FAIL only because TC-4.2 was **not run**: it needs the test database stopped, and stopping a database container needs the user's approval, which was not given. No test case that was run failed, and no bugs were found. To finish: with the user's approval, run `pnpm db:down` → `pnpm qa:serve` (expect "run `pnpm db:up`", no stack trace, non-zero exit) → `pnpm db:up`.

| TC     | Role      | Result | Screenshot |
| ------ | --------- | ------ | ---------- |
| TC-1.1 | anonymous | ✅ (`auto: api`; also checked on the QA server: `GET /` → 200 `text/html`, the built `index.html`) | — |
| TC-1.2 | anonymous | ✅ (QA server: `GET /some/deep/link` → 200 `text/html`; in the browser it shows "Page not found", assets load from `/assets/…`) | — |
| TC-1.3 | anonymous | ✅ (QA server: `/api/health` → 200 JSON; `/api/nope` and `/api` → 404 `application/json`, code `NOT_FOUND`; `POST /foo` → 404 JSON) | [img](qa/run1-TC-1.3.png) |
| TC-2.1 | anonymous | ✅ (`auto: api`, run in `pnpm verify` by the reviewer; not observable on the QA server, which always sets `WEB_DIST_DIR`) | — |
| TC-3.1 | —         | ✅ (`auto: unit`, `apps/api/src/common/config.test.ts`; rerun in this run: api unit tests 46 passed) | — |
| TC-3.2 | —         | ✅ (`auto: unit`, same file; 46 passed) | — |
| TC-4.1 | developer | ✅ `QA server: http://localhost:4100` printed after Nest logged "successfully started"; home page loads with the four rooms; SIGINT stopped the server, no process left, port 4100 free | [img](qa/run1-TC-6.1-desktop.png) |
| TC-4.2 | developer | ⏸ not run: needs the user's approval to stop the test database | — |
| TC-5.1 | developer | ✅ `pnpm e2e`: 10 passed (5 specs × `desktop` and `mobile`), exit 0, port 4100 free afterwards | — |
| TC-5.2 | developer | ✅ title expectation in TC-9.1 changed to `'LabSafe WRONG'`: exit 1; report names `[desktop]` and `[mobile]` › `TC-9.1 …` with expected/received; spec restored byte for byte | — |
| TC-6.1 | anonymous | ✅ banner link "LabSafe", h1 "LabSafe", LAB-101, LAB-102, LAB-201, LAB-202, 15 hazard types incl. "Electrical" and "Biological", at 1280 and 375 px | [desktop](qa/run1-TC-6.1-desktop.png) · [375](qa/run1-TC-7.3-home-375.png) |
| TC-7.1 | anonymous | ✅ `scrollWidth` 1280 = `clientWidth` 1280; at 375 px 375 = 375 after the rooms loaded, no element past the right edge | [img](qa/run1-TC-7.3-home-375.png) |
| TC-7.2 | anonymous | ✅ `/does-not-exist`: 1280 = 1280; 375 = 375 | [img](qa/run1-TC-7.3-notfound-375.png) |
| TC-7.3 | anonymous | ✅ 375 × 812: readable 16 px text, nothing clipped (the long "Chemical exposure (toxic, corrosive, irritant)" wraps inside its card), even spacing | [home](qa/run1-TC-7.3-home-375.png) · [not found](qa/run1-TC-7.3-notfound-375.png) |
| TC-8.1 | anonymous | ✅ `/does-not-exist` typed directly → h1 "Page not found"; "Go to the home page" → `/` with the rooms, by mouse at 375 px and by keyboard (Tab, Tab, Enter) at 1280 px | [desktop](qa/run1-TC-8.1-desktop.png) · [375 after click](qa/run1-TC-8.1-mobile-after-click.png) · [keyboard focus](qa/run1-keyboard-focus-notfound.png) |
| TC-9.1 | anonymous | ✅ `html[lang="en"]`, title "LabSafe" on `/`, `/does-not-exist` and `/some/deep/link` | — |

Extra checks: keyboard only, Tab reaches the header link "LabSafe" and then "Go to the home page", each with a visible 2 px focus outline, and Enter follows the link. The pages have no forms yet. The browser console showed no errors or warnings on `/` and `/does-not-exist`; the only error was the expected 404 resource message on `/api/nope`.

Bugs: none.

Observations (not bugs, already tracked):

- The Playwright browser tool left its page snapshots in `.playwright-mcp/` at the repository root. The folder is not ignored by git or Prettier, so `pnpm verify` fails `format:check` on those 8 files until it is deleted (the project's guard hook does not let the qa-engineer remove it). This is test residue, not an application bug: delete `.playwright-mcp/` (or add it to `.gitignore` and `.prettierignore`).
- After Ctrl+C, `pnpm qa:serve` exits 130 and pnpm prints `ELIFECYCLE Command failed with exit code 130.`. The server does stop and the port is freed, so TC-4.1 passes. This is review finding F4 in [review.md](review.md); no separate bug is filed.

Specs added: none. The five `auto: e2e` test cases (TC-6.1, 7.1, 7.2, 8.1, 9.1) already have tests named after them in `e2e/tests/smoke.spec.ts` (FE-01), using roles and labels, with no order dependence. · `pnpm e2e`: 10 passed (desktop 5, mobile 5), exit 0.

## Run 2 · 2026-10-29 · verdict: PASS

Application: `pnpm qa:serve` (fresh test database `labsafe_test` on 5443) · Address: `http://localhost:4100` · Browser: Playwright Chromium at 1280 × 800 and 375 × 812. Code: same working tree as run 1 (no `/fix` round in between; review round 1 findings F1–F4 are still unticked).

This run completes run 1: TC-4.2 was run today **by the main session, with the user's explicit approval** (`pnpm db:down` stopped `labsafe-db-1` and `labsafe-db-test-1` → `pnpm qa:serve` → `pnpm db:up`, both containers healthy again). The qa-engineer did not stop or start any database container; it judged TC-4.2 from the saved output of that `pnpm qa:serve` run ([run2-TC-4.2.txt](qa/run2-TC-4.2.txt)). Every other test case was rerun.

| TC     | Role      | Result | Screenshot |
| ------ | --------- | ------ | ---------- |
| TC-1.1 | anonymous | ✅ (`auto: api`, run in `pnpm verify` by the reviewer; on the QA server `GET /` → 200 `text/html; charset=utf-8`, the built `index.html`) | — |
| TC-1.2 | anonymous | ✅ (QA server: `GET /some/deep/link` → 200 `text/html`, same `index.html`; in the browser it shows "Page not found" and loads `/assets/index-BIYeRjP4.js`) | — |
| TC-1.3 | anonymous | ✅ (QA server: `/api/health` → 200 JSON `{"status":"ok","database":"ok"}`; `/api/nope` and `/api` → 404 `application/json`, code `NOT_FOUND`; `POST /foo` → 404 JSON) | [img](qa/run2-TC-1.3.png) |
| TC-2.1 | anonymous | ✅ (`auto: api`, run in `pnpm verify` by the reviewer; not observable on the QA server, which always sets `WEB_DIST_DIR`) | — |
| TC-3.1 | —         | ✅ (`auto: unit`, `apps/api/src/common/config.test.ts`; rerun with `pnpm test`: api 46 passed, shared 18, web 9) | — |
| TC-3.2 | —         | ✅ (`auto: unit`, same file and run) | — |
| TC-4.1 | developer | ✅ `QA server: http://localhost:4100` printed on the line after Nest's "successfully started"; `/api/health` answered; home page loads with the four rooms; Ctrl+C (SIGINT to the process group) stopped the server, no process left, port 4100 free | [img](qa/run2-TC-6.1-desktop.png) |
| TC-4.2 | developer | ✅ run by the main session with the user's approval (see above). With the test database stopped, `pnpm qa:serve` built, then stopped at `test:db:prepare` with "The test database on localhost:5443 is not running. Run `pnpm db:up` first."; no stack trace (only pnpm's `ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL` / `ELIFECYCLE` summary lines); exit 1; the server was never started | [log](qa/run2-TC-4.2.txt) |
| TC-5.1 | developer | ✅ `pnpm e2e`: 10 passed (5 specs × `desktop` and `mobile`), exit 0, nothing listening on 4100 afterwards | — |
| TC-5.2 | developer | ✅ title expectation in TC-9.1 changed to `'LabSafe WRONG'`: exit 1; report names `[desktop]` and `[mobile]` › `TC-9.1 …` with Expected "LabSafe WRONG" / Received "LabSafe"; 8 passed, 2 failed; spec restored byte for byte (`cmp`), then `pnpm e2e` rerun green | — |
| TC-6.1 | anonymous | ✅ banner link "LabSafe", h1 "LabSafe", LAB-101 · Teaching lab 1, LAB-102, LAB-201, LAB-202, 15 hazard types incl. "Electrical" and "Biological", at 1280 and 375 px | [desktop](qa/run2-TC-6.1-desktop.png) · [375](qa/run2-TC-7.3-home-375.png) |
| TC-7.1 | anonymous | ✅ after the rooms loaded: `scrollWidth` 1280 = `clientWidth` 1280; at 375 px 375 = 375, no element past the right edge | [img](qa/run2-TC-7.3-home-375.png) |
| TC-7.2 | anonymous | ✅ `/does-not-exist`: 1280 = 1280; 375 = 375 | [img](qa/run2-TC-7.3-notfound-375.png) |
| TC-7.3 | anonymous | ✅ 375 × 812: 16 px text, nothing clipped ("Chemical exposure (toxic, corrosive, irritant)" wraps inside its card), even spacing | [home](qa/run2-TC-7.3-home-375.png) · [not found](qa/run2-TC-7.3-notfound-375.png) |
| TC-8.1 | anonymous | ✅ `/does-not-exist` typed directly → h1 "Page not found"; "Go to the home page" → `/` with the rooms, by mouse at 375 px and by keyboard (Tab, Tab, Enter) at 1280 px | [desktop](qa/run2-TC-8.1-desktop.png) · [375 after click](qa/run2-TC-8.1-mobile-after-click.png) · [keyboard focus](qa/run2-keyboard-focus-notfound.png) |
| TC-9.1 | anonymous | ✅ `html[lang="en"]`, title "LabSafe" on `/`, `/does-not-exist` and `/some/deep/link` | — |

Extra checks: keyboard only, Tab reaches the header link "LabSafe" and then "Go to the home page" (visible 2 px solid outline), and Enter follows the link. The pages have no forms yet. Browser console: no errors or warnings on `/`, `/does-not-exist` and `/some/deep/link`; the only error was the expected 404 resource message on `/api/nope`.

Bugs: none.

Observations (not bugs, already tracked):

- After Ctrl+C, `pnpm qa:serve` still exits 130 and pnpm prints `ELIFECYCLE Command failed with exit code 130.` The server stops and the port is freed, so TC-4.1 passes. This is review finding F4 in [review.md](review.md).
- The Playwright browser tool again wrote page snapshots to `.playwright-mcp/` at the repository root, which makes `pnpm verify` fail `format:check`. Test residue, being handled by the user; not a story bug.
- With the test database stopped, `pnpm qa:serve` first builds all packages (a few seconds) before it reports the stopped database. The expected result is still met; noted only as a possible speed-up.

Specs added: none. The five `auto: e2e` test cases (TC-6.1, 7.1, 7.2, 8.1, 9.1) already have tests named after them in `e2e/tests/smoke.spec.ts` (FE-01). · `pnpm e2e`: 10 passed (desktop 5, mobile 5), exit 0, port 4100 free afterwards.
