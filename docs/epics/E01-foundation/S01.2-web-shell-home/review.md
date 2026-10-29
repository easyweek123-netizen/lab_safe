# Review: S01.2

Tick (`[x]`) the findings `/fix` should handle; unticked ones are left as they are. Add instructions as `> note` lines under a finding.

## Round 1 · 2026-10-29 · verdict: APPROVE

Verify: ✅ (format, lint, typecheck, unit 18 shared + 41 api + 9 web, integration 15, build, docs-check OK) · Scope: uncommitted changes (13 changed files, 26 new files)

- [x] F1 [minor][fe] `apps/web/src/pages/home/HomePage.tsx:17-30`: while a Retry is running, the error state stays exactly as it was. The button stays enabled, nothing says "loading", and in the real app (`main.tsx` `retry: 1`) a failing Retry takes about 1 s more. If the API is still down, the same `<p role="alert">` stays mounted with the same text, so screen readers announce nothing new. A visitor can't tell whether Retry did anything. Fix: use `isFetching` from `useMetaLists()`. While it is true, disable the button (or set `aria-busy`) and show the `status` "Loading…", or show the loading state instead of the error. Add a check to TC-6.3. → fixed: while a Retry runs (isError && isFetching) the home page shows the loading state ("Loading…") instead of the stale error, so a repeated failure is announced again; TC-6.3 now checks it.
- [ ] F2 [minor][fe] `apps/web/tsconfig.json:8`: one tsconfig gives all of `src/` the `node` types, which only `vite.config.ts` and `App.test.tsx` need. Browser code that uses `process.env` or imports `node:*` therefore type-checks, and lint doesn't catch it either: typescript-eslint turns `no-undef` off. It then fails at runtime in the browser. Fix: put `vite.config.ts` and the tests in their own tsconfig with `node` types (or a `tsconfig.node.json` and a test tsconfig), and leave `node` out of the app's `types`.

Checked with no finding:
- **Test cases:** every automated test case (TC-1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2, 6.3, 7.1, 7.2) has a test whose name starts with its identifier, and each test really checks the expected result.
- **AC1:** the lists match the shared constants exactly, in order. The rooms are sorted by `code`, the unique index already covers that sort, and each room is mapped to `{ id, code, name }`, never returned as the entity.
- **AC2:** the error filter returns the generic 500 and does not leak `relation secret`.
- **Entity:** it matches the migration, and a schema-builder test keeps it that way. `installExtensions: false` stops TypeORM from changing the schema on connect.
- **Access:** both routes are public as design §9 says, so there are no refused roles to test.
- **Frontend and backend fit:** the frontend calls the real path and validates every response with the shared schema. It turns an error status, a network error and a wrong body into one `ApiError`.
- **Shell and pages:** the shell meets AC3. The not-found page is inside the shell (AC7). `apps/web/CLAUDE.md` covers every bullet of design §10, and its page list has `/` and `*` (AC10).
- **Housekeeping:** no secrets, no stray build output or screenshots, and nothing built beyond the story.

Summary: The backend endpoint, the contract and the web shell meet every acceptance criterion and pass every automated test case, and `pnpm verify` is green. There are no blocker or major findings; the two minor ones are feedback while Retry runs (F1) and Node types leaking into browser code (F2).

## Round 2 · 2026-10-29 · verdict: APPROVE

Verify: ✅ (format, lint, typecheck, unit 18 shared + 41 api + 9 web, integration 15, build, docs-check OK) · Scope: uncommitted changes (13 changed files, 26 new files besides this review). Changed since round 1: `HomePage.tsx`, `HomePage.test.tsx`, FE-03 "Implementation notes", the S01.2 status cell in `epic.md`.

- [ ] F3 [minor][fe] `apps/web/src/pages/home/HomePage.tsx:11-31`: the F1 fix unmounts the Retry button the moment it is pressed, so keyboard focus falls back to `<body>`. If the retry fails again, the new error state mounts but focus is not on its Retry button: a keyboard or screen-reader user has to Tab from the top of the page to try again (WCAG 2.4.3). The same happens on success, which is less of a problem. Fix: when the error state mounts after a retry, move focus to its Retry button (a `ref` plus `focus()` in an effect, only when this is not the first load). Or keep the error state mounted during the retry with the button `aria-disabled="true"` (not `disabled`, which drops focus) next to the `status` "Loading…". Add a check to TC-6.3 or a new automated test: Retry, then fail again, then the Retry button has focus.
- [ ] F4 [minor][fe] `apps/web/src/api/meta.ts:7-11` (residual of F1, not a reopen): TanStack Query's default `networkMode: 'online'` pauses a fetch when `navigator.onLine` is false (`fetchStatus: 'paused'`, `isFetching` false; checked in `@tanstack/query-core` 5.105 `fetchState`). On a phone that is offline, two things go wrong. Opening `/` shows "Loading…" forever instead of the AC6 error state. Pressing Retry in the error state changes nothing on screen, which is the F1 symptom again. F1 is fixed for the case it described (the browser is online and the API is down). Fix: set `networkMode: 'always'` on `useMetaLists` (or in the `QueryClient` defaults in `main.tsx`), so an offline request fails at once with the network `ApiError` and shows the error state. Add a component test that stubs `navigator.onLine` to false and expects the alert.

Checked with no finding:
- **F1 → fixed, confirmed.** `isPending || (isError && isFetching)` shows the `status` "Loading…" during a Retry, including the extra attempt from `retry: 1` in `main.tsx`. A failed Retry mounts a new `<p role="alert">`, which screen readers announce. A successful Retry shows the lists. In TanStack Query v5 a refetch after an error keeps `status: 'error'` with `fetchStatus: 'fetching'`, so the condition is right. With `staleTime: Infinity` the success state never refetches, so the new branch can't hide loaded data. While in the error state, focusing the window or reconnecting refetches the data (the query has no data, so it counts as stale). The page then shows "Loading…" briefly, which is correct.
- **TC-6.3:** the test holds the retry answer behind a promise. It checks "Loading…" with no alert and no Retry button, then releases the answer and checks the lists with no status, no alert and no button. This really tests the fix. Every other TC test is unchanged and passes.
- **No regressions:** TC-4.1, TC-6.1 and TC-6.2 still check that no loading text shows next to the error. The FE-03 implementation notes record the fix.
- **F2:** the user left it unticked. It is minor, so it does not affect the verdict.

Summary: F1 is fixed correctly and TC-6.3 now proves it; `pnpm verify` is green and there are no blocker or major findings.
Two new minor findings: focus is lost when Retry unmounts its button (F3), and an offline device never reaches the error state, so Retry does nothing there (F4).
