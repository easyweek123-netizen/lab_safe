---
id: FE-01
story: S02.2
layer: fe
status: done
depends_on: [BE-02]
covers: [AC4, AC5, AC6, AC7, AC8, AC10, AC11]
updated: 2026-11-24
---

# FE-01 Sign-ups page and the admin gate

**Goal:** admins review sign-ups on `/admin/sign-ups`; everyone else gets the right gate outcome. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/api/admin-users.ts`
- create `apps/web/src/pages/admin-sign-ups/SignUpsPage.tsx`, `SignUpRow.tsx`, `SignUpsPage.test.tsx`
- change `apps/web/src/components/RequireAccount.tsx`, `RequireAccount.test.tsx` (the `admin` level and "No access")
- change `apps/web/src/components/AccountMenu.tsx`, `AccountMenu.test.tsx` ("Sign-ups" link for admins)
- change `apps/web/src/App.tsx`, `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list: `/admin/sign-ups`)

## Constraints

- States and texts exactly as in the story's "UI states" and AC5–AC8, AC10, AC11. The sign-up date is formatted in English (`en-GB`, medium date).
- Query key `['admin', 'users', 'PENDING']`; approve and reject use `useMutation` and then invalidate it. A 409 also invalidates it; a 401 or 403 invalidates `['auth', 'me']` so the gate re-decides (design "Screens").
- The reject confirm step is inline in the row, keyboard reachable, and focus moves to "Yes, reject" when it opens; "Cancel" returns focus to "Reject".
- Each row is a list item with its name in text, so a screen reader can tell rows apart; buttons are at least 44 px high; the list wraps at 375 px.
- Follow `HomePage.tsx`, the S02.1 pages and `renderApp` with MSW; test titles start with `S02.2 AC<n>`.
- Schema change: no.

## Out of scope

The accounts page and the "Accounts" link (S02.3).

## Implementation notes

**Files changed:**

- apps/web/src/api/admin-users.ts
- apps/web/src/api/auth.ts
- apps/web/src/pages/admin-sign-ups/SignUpsPage.tsx
- apps/web/src/pages/admin-sign-ups/SignUpRow.tsx
- apps/web/src/pages/admin-sign-ups/SignUpsPage.test.tsx
- apps/web/src/components/RequireAccount.tsx
- apps/web/src/components/RequireAccount.test.tsx
- apps/web/src/components/AccountNotice.tsx
- apps/web/src/components/AccountMenu.tsx
- apps/web/src/components/AccountMenu.test.tsx
- apps/web/src/App.tsx
- apps/web/src/test/msw.ts
- apps/web/CLAUDE.md

**Differences from the ticket:**

- Approve and reject are one hook, `useDecideSignUp()`, with `{ id, decision: 'approve' | 'reject' }`; a single `useMutation` with the invalidations of the ticket (success and 409 → `['admin', 'users', 'PENDING']`; 401 and 403 → `['auth', 'me']`). The invalidation promise is returned, so the mutation settles after the reload and the row stays disabled until it disappears.
- Each `SignUpRow` owns its mutation (so only that row is disabled) and uses `mutateAsync`, whose promise settles even after the row has left the list; the page keeps the last message (`status` "Approved/Rejected <name>." or `alert`) in `useState` and clears it when a new action starts.
- A 401 or 403 from an action also sets `alert` "Couldn't save, try again."; it is only seen if `me` still says admin, because otherwise the gate replaces the page.
- `auth.ts` now exports `ME_KEY`, reused by `admin-users.ts`.
- `AccountNotice` gains the kind `no-access` (h1 "No access"); `AccountMenu` shows "Sign-ups" only for an `APPROVED` `ADMIN`.
- The date is shown as "Signed up <time>24 Nov 2026</time>" (`en-GB`, `dateStyle: 'medium'`, the browser's time zone).
- The confirm step moves focus with `flushSync` + `ref.focus()` in the click handler (no effect, no `autoFocus`).
- The page shows h1 "Sign-ups" also while loading and on error, above the `status` or `alert`.
- `src/test/msw.ts` gains `ADMIN_USERS`, `APPROVE`, `REJECT`, `pendingSignUps`, `adminUsersHandler(users)` and `errorResponse(status, code, message)`.
- No Playwright spec: the journey and the 375 px checks (AC12) are FE-02. `pnpm e2e` was run and still passes.
