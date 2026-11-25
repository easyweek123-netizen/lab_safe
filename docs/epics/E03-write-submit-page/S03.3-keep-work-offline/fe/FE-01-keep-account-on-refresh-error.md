---
id: FE-01
story: S03.3
layer: fe
status: done
depends_on: []
covers: [AC1, AC2, AC3]
updated: 2026-11-25
---

# FE-01 Keep the account and the form through a failed refresh

**Goal:** a failed background refresh of the account never replaces the page or the header, so a half-written safety page survives a network drop (S02.1 F4). **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/components/RequireAccount.tsx`, `RequireAccount.test.tsx`
- change `apps/web/src/components/AccountMenu.tsx`, `AccountMenu.test.tsx`
- create `e2e/tests/network-drop.spec.ts`

## Constraints

- Both components decide from the cached `me` data whenever it exists; the loading and error states appear only when there is no data yet (design decision E03-D7). A refresh that **succeeds** with other data still re-decides (AC2), so no E02 behaviour changes.
- Don't touch the query's settings in `src/api/auth.ts` (stale time, retries): the fix is in how the two components read the query.
- Component tests titled `S03.3 AC<n>`: with an approved account loaded, a refetch that fails (MSW network error and 500) keeps the page content and the header's name (AC1); AC2's first-load error and the re-decide on `{user: null}`. The existing `S02.1` and `S02.2` gate and header tests keep passing unchanged.
- `network-drop.spec.ts` runs in both Playwright projects with a fresh approved account and proves AC3 with the S03.1 helpers; title `S03.3 AC3 …`.
- Schema change: no.

## Out of scope

The submit and upload failure messages themselves (S03.1 FE-01, FE-04). S02.1 F2.

## Implementation notes

**Files changed:**

- apps/web/src/components/RequireAccount.tsx
- apps/web/src/components/RequireAccount.test.tsx
- apps/web/src/components/AccountMenu.tsx
- apps/web/src/components/AccountMenu.test.tsx
- apps/web/src/test/render.tsx
- e2e/tests/network-drop.spec.ts

**Differences from the ticket:**

- `RequireAccount` decides from `data` whenever it exists. Without data it shows the error and Retry only when the query has failed and is idle; otherwise it shows "Loading…", the same as before. `AccountMenu` reads `data?.user`, so a failed refresh keeps the cached account. A first load that fails still shows "Log in". `src/api/auth.ts` is unchanged.
- `src/test/render.tsx`: `renderApp` also returns its `queryClient`. The new tests use it to wait until the failed refresh has settled (`fetchStatus` idle, `status` error) before they check the page. Existing tests are unchanged.
- The component tests trigger the refresh with `focusManager.setFocused(false/true)` and with `onlineManager.setOnline(false/true)` for the reconnect case. There is also a test for "error and refetching at once", which showed "Loading…" before this fix.
- `network-drop.spec.ts`, order of steps: half fill, go offline, focus change, back online. Then a forced 500 on `GET /api/auth/me` (`page.route`, the first try and the app's one retry), because a focus refresh while offline is paused by TanStack Query rather than failed. Then `fillCompletePage` and submit while offline, which gives the network message. Then submit online, which gives the confirmation. A half-filled form never reaches the network on submit, because client validation stops it first. So the page is completed before the offline submit, not after, which is a small reordering of AC3's wording. The spec fails against the old components (checked by running it with the previous versions) and passes with the fix.

**Verification (2026-11-25):** `pnpm verify` passes (web 230 tests, api 133, shared 129, docs-check OK). `pnpm e2e` passes (58 tests, including `network-drop.spec.ts` in both projects).
