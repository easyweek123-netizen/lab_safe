# Review: S02.1

<!-- architect. blocker: an acceptance criterion broken, a refused role gets in, data lost or leaked, a test weakened.
     major: a named rule, edge case or screen state wrong, or a criterion without a real test.
     minor: anything else; it becomes a known gap. -->

## Round 1 · 2026-11-24 · verdict: CHANGES

`pnpm verify`: ✅ (shared 46, web 66, API unit 125, API integration 82, docs-check OK; `pnpm e2e` 28 passed, reported by FE-03)

All of AC1–AC17 are built as written and every one has a real test with an `S02.1 AC<n>` title. Every refused caller has a passing test: an anonymous caller on logout (401), and anonymous, pending, contributor and admin callers on a route with no access level (403 over HTTP; rejected is covered by the guard unit tests). The data rules sit where design.md "Data" puts them. Sign-up and login each run in one transaction, the entities match the migration (checked by the schema builder), and no hash, password or token leaves the server.

Developer questions:
- **BE-03, the two `TC-7.3` config tests:** acceptable. They compare the whole config with `toEqual`, so the new key had to be added to the expected object. That makes them stricter, not weaker, and their titles are unchanged. The `COOKIE_SECURE` behaviour has its own `S02.1 AC14` tests. No finding.
- **FE-01, a failed logout shows nothing:** see F2.
- **FE-03, the faked "me" in the contributor-area width check:** acceptable for this story, on two conditions in F3.

- [ ] F1 [major][fe] `apps/web/vite.config.ts:14`: in `pnpm dev` every sign-up, login and logout is refused with 403. The string form of the proxy (`'/api': 'http://localhost:3000'`) makes Vite set `changeOrigin: true` (Vite `dist/node/chunks/node.js:19895`), which rewrites `Host` to `localhost:3000`. The browser still sends `Origin: http://localhost:5173` on each POST, so `RequestOriginGuard` sees two different hosts. Design doc D7 says "Vite proxies in development", and `pnpm dev` is a required command. `pnpm e2e` cannot catch this, because the built app is served from one origin. Fix: use the object form of the `/api` proxy with `changeOrigin: false`, so `Host` stays `localhost:5173`. Add a one-line comment on why, record it in FE-01's notes, and check sign-up → log out → log in by hand under `pnpm dev`. → fixed: `/api` proxy now uses the object form with `changeOrigin: false` (exported `devProxy`, unit test `S02.1 F1 …`); sign-up, logout, login checked through the Vite proxy.
- [ ] F2 [minor][fe] `apps/web/src/components/AccountMenu.tsx:35`: if logout fails with a 500 or a network error, the button becomes active again and nothing explains why the user is still signed in. The story's "UI states" names no state for this, so it is not a broken AC. It does go against the "every error shows an `alert`" rule in `apps/web/CLAUDE.md`. Fix: show `alert` "Something went wrong, try again." next to the button (the story's text for the same case on the forms), with a component test. Or leave it as a known gap.
- [ ] F3 [minor][fe] `e2e/tests/accounts.spec.ts:175`: the 375 px check of the contributor area answers `GET /api/auth/me` with a fake approved user, so this one check does not use the real server. That is acceptable until S02.2, because AC8's approved path is proven by `RequireAccount.test.tsx`, and AC10 is proven over HTTP. But the plan to replace the fake is not written down anywhere: S02.2 FE-02 says it changes `accounts.spec.ts` "only to reuse the new helpers". Fix: add a line to "Known gaps" in story.md, and add a constraint to S02.2 FE-02 to replace the faked `me` with an account approved by the setup admin.
- [ ] F4 [minor][fe] `apps/web/src/components/RequireAccount.tsx:34`, `apps/web/src/components/AccountMenu.tsx:18`: when a background refetch of `me` fails (on window focus, `retry: 1`), `isError` becomes true while the cached user is still there. The gate then swaps the page for "Couldn't load, try again.", and the header switches to "Log in". From E03 on, the page editor sits under this gate, and a short network drop would throw away typed text. Fix: show the error state only when there is no `data`, in both components, with a component test.

Where to look first: `apps/web/vite.config.ts` (F1, the dev proxy and the origin check), `apps/web/src/components/AccountMenu.tsx` (F2, F4), `e2e/tests/accounts.spec.ts` (F3)

## Round 2 · 2026-11-24 · verdict: APPROVE

`pnpm verify`: ✅ (shared 46, web 67, API unit 125, API integration 82, docs-check OK; reported by the main session)

- F1 checked, fixed. `apps/web/vite.config.ts:15-17` exports `devProxy` with `/api` → `{ target: 'http://localhost:3000', changeOrigin: false }`, used at line 22, with a comment on why at lines 10-14. Vite turns only the string form into `changeOrigin: true` (`vite/dist/node/chunks/node.js:19895-19898`); the object form goes to the proxy unchanged, and the proxy rewrites `Host` only when `changeOrigin` is set (`node.js:18959`). So `Host` stays `localhost:5173` and matches the `Origin` that `apps/api/src/common/request-origin.guard.ts:48-53` compares it with, while a foreign `Origin` is still refused. `apps/web/src/devProxy.test.ts:6` (`S02.1 F1 …`) pins the options, and `vite.config.ts` is in the web type check (`apps/web/tsconfig.json:11`). FE-01's "Implementation notes" record the change, both new files and the hand check under `pnpm dev` (sign-up 201, log out 204, log in 200, foreign `Origin` 403).
- F2, F3, F4 stay open as minor; the main session records them as known gaps.

No blocker or major is open.

Where to look first: `apps/web/vite.config.ts` (F1), `apps/web/src/devProxy.test.ts` (F1 test)
