---
id: FE-01
story: S02.3
layer: fe
status: done
depends_on: [BE-01]
covers: [AC1, AC2, AC3, AC4, AC5, AC7, AC10, AC11]
updated: 2026-11-24
---

# FE-01 Accounts page

**Goal:** admins see the approved accounts on `/admin/accounts` and make or remove admins there. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/admin-users.ts`
- create `apps/web/src/pages/admin-accounts/AccountsPage.tsx`, `AccountRow.tsx`, `AccountsPage.test.tsx`
- change `apps/web/src/components/AccountMenu.tsx`, `AccountMenu.test.tsx` ("Accounts" link for admins)
- change `apps/web/src/App.tsx`, `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list: `/admin/accounts`)

## Constraints

- States and texts exactly as in the story's "UI states" and AC1–AC5, AC7, AC10, AC11. The page sits under `RequireAccount` with the `admin` level.
- Query key `['admin', 'users', 'APPROVED']`; the role mutation invalidates it, and also `['auth', 'me']` when the target is the signed-in admin (AC7) or the answer is 401 or 403 (AC11).
- The role is always shown in words, never only by a colour or an icon. Buttons say what they do ("Make admin", "Remove admin") and carry the person's name for screen readers.
- Follow `SignUpsPage` from S02.2; test titles start with `S02.3 AC<n>`.
- Schema change: no.

## Out of scope

The journey test (FE-02).

## Implementation notes

**Files changed:**

- apps/web/src/api/admin-users.ts
- apps/web/src/pages/admin-accounts/AccountsPage.tsx
- apps/web/src/pages/admin-accounts/AccountRow.tsx
- apps/web/src/pages/admin-accounts/AccountsPage.test.tsx
- apps/web/src/components/AccountMenu.tsx
- apps/web/src/components/AccountMenu.test.tsx
- apps/web/src/App.tsx
- apps/web/src/test/msw.ts
- apps/web/CLAUDE.md

**Differences from the ticket:**

- `admin-users.ts` gains `useApprovedAccounts()` (key `['admin', 'users', 'APPROVED']`) and `useChangeRole()` with `{ id, role }`. On success it reloads the approved list, and also `['auth', 'me']` when the answer's id is the signed-in user's id (read from the `me` cache). A 409 reloads the approved list. A 401 or 403 reloads `me`. As in S02.2, the invalidation promises are returned, so the row's button stays disabled until the list shows the new role.
- Each `AccountRow` owns its mutation (`mutateAsync`), so only that row's button is disabled. The page keeps the last message in `useState`: `status` "<name> is now an admin." or "<name> is now a contributor." (the name comes from the server's answer), `alert` "There must be at least one admin." for `LAST_ADMIN`, and `alert` "Couldn't save, try again." otherwise (500, a network error, or a 401 or 403 that the gate then replaces).
- Each button shows "Make admin" or "Remove admin" and has `aria-label` "<action> <name>" (for example "Make admin Anna Approved"). The accessible name starts with the visible text (WCAG 2.5.3). Its role is shown as the words "Admin" or "Contributor", with a hidden "Role: " prefix for screen readers.
- No empty state, as the story's "UI states" says. The h1 "Accounts" is shown while loading and on error too, as on `SignUpsPage`.
- `src/test/msw.ts` gains `ROLE` and `approvedAccounts` (the signed-in `adminUser`, `approvedUser` and a second admin, "Bruno Boss", in name order).
- AC3's "next page load shows Sign-ups and Accounts" is covered by the `AccountMenu` test for an admin. The reload across two sessions is FE-02's journey. No Playwright spec was added (FE-02), but `pnpm e2e` was run and passes (42 tests).
