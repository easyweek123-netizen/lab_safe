---
id: FE-01
story: S02.1
layer: fe
status: done
depends_on: [BE-03]
covers: [AC5, AC7]
updated: 2026-11-24
---

# FE-01 Session in the web app and the header

**Goal:** the web app knows who is signed in, and the header shows "Log in" or the user's name with "Log out". **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/client.ts` (a sender for POST and PUT next to `apiGet`)
- create `apps/web/src/api/auth.ts` (`useMe`, `useSignUp`, `useLogIn`, `useLogOut`)
- change `apps/web/src/components/AppShell.tsx`
- create `apps/web/src/components/AccountMenu.tsx`, `AccountMenu.test.tsx`
- change `apps/web/src/test/msw.ts` (default `GET /api/auth/me` → `{user: null}`, fixtures for each status)
- create `apps/web/src/api/client.test.ts` (the sender's success, 204, `fields` error and network error)

## Constraints

- Only `client.ts` calls `fetch`. The sender always sends `Content-Type: application/json` (with `{}` when there is no body, design "Cross-site requests"), validates the response with the shared schema, accepts 204 without a body, and raises the same `ApiError` as `apiGet`, keeping the server's `fields`.
- `useMe` uses the query key `['auth', 'me']` and the default stale time, so every page load and every newly mounted gate asks the server again (C3, C7). Log-in, sign-up and log-out invalidate it. A 401 from log-out counts as logged out.
- Header states as in the story's "UI states": nothing account-related while loading, "Log in" for anonymous or on error, the name, a "Contributor area" link and a "Log out" button when signed in. It wraps at 375 px instead of scrolling sideways.
- Follow the patterns of `src/api/meta.ts`, `HomePage.tsx` and `src/test/msw.ts`; test titles start with `S02.1 AC<n>`.
- Schema change: no.

## Out of scope

The sign-up and login pages (FE-02), the gate (FE-03), admin links (S02.2, S02.3).

## Implementation notes

**Files changed:**

- apps/web/src/api/client.ts
- apps/web/src/api/client.test.ts
- apps/web/src/api/auth.ts
- apps/web/src/components/AppShell.tsx
- apps/web/src/components/AccountMenu.tsx
- apps/web/src/components/AccountMenu.test.tsx
- apps/web/src/test/msw.ts
- apps/web/vite.config.ts
- apps/web/src/devProxy.test.ts

**Differences from the ticket:**

- The sender is `apiSend(method, path)` for a 204 action (nothing is read) and `apiSend(method, path, schema, body?)` for one with a body to validate; `body` defaults to `{}`. `apiGet` and `apiSend` share the `fetch`, error and parsing helpers; `ApiError` gains `fields`.
- `useSignUp`, `useLogIn` and `useLogOut` return the `invalidateQueries` promise from `onSuccess`, so each mutation finishes only after `me` has answered again (FE-02 can navigate to `/contribute` with a fresh `me`).
- `src/test/msw.ts` exports `pendingUser`, `approvedUser`, `rejectedUser`, `adminUser`, `ME` and `meHandler(user)`; the default `me` handler answers `{user: null}`.
- While log-out is being sent the "Log out" button is disabled. A log-out that fails with anything other than 401 (500, network) leaves the user signed in and shows no message: the story's "UI states" names none (open question in the report).
- Review F1 (round 1): the `pnpm dev` proxy is now the exported `devProxy` in `vite.config.ts`, with `/api` → `{ target: 'http://localhost:3000', changeOrigin: false }`. The string form set `changeOrigin: true`, which rewrote `Host` to localhost:3000 while the browser sent `Origin: http://localhost:5173`, so `RequestOriginGuard` refused every sign-up, login and logout with 403. `src/devProxy.test.ts` (node environment, because the config reads `import.meta.url`) checks the proxy options. Checked by hand under `pnpm dev` through the proxy: sign-up 201, log out 204, log in 200, `me` returns the user, a foreign `Origin` still gets 403.
- No new page, so the page list in `apps/web/CLAUDE.md` is unchanged.
