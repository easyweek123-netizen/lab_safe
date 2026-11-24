---
id: FE-03
story: S02.1
layer: fe
status: done
depends_on: [BE-03, FE-01, FE-02]
covers: [AC1, AC8, AC9, AC14, AC15, AC17]
updated: 2026-11-24
---

# FE-03 Account gate, contributor area and journey test

**Goal:** `/contribute` shows the empty contributor area only to approved accounts, and the status notice to everyone else, proven in the browser at both widths. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/components/RequireAccount.tsx`, `RequireAccount.test.tsx`
- create `apps/web/src/components/AccountNotice.tsx` (the waiting and not-approved notices)
- create `apps/web/src/pages/contribute/ContributorAreaPage.tsx`
- change `apps/web/src/App.tsx`
- change `apps/web/CLAUDE.md` (page list: `/contribute`)
- create `e2e/tests/accounts.spec.ts`

## Constraints

- `RequireAccount` is a layout route as in [design.md "Screens"](../../design.md#screens) and decision E02-D7: it renders the notice at the requested URL, never a redirect to a notice page. In this story it has only the `contributor` level; S02.2 adds `admin`. Anonymous visitors go to `/login?next=<the path>` (AC9).
- Loading and error states as in AC15, following `HomePage.tsx` (Retry calls the `me` query again).
- Notice and page texts exactly as in AC8 and the story's "UI states".
- `accounts.spec.ts` runs in both Playwright projects and uses a unique email per test. It proves AC1 and AC8 (sign-up → waiting notice, also after reload), log out → log in → the header name, AC9's redirect, AC14 (no cookie while anonymous on `/`, `/login`, `/signup`; exactly one `labsafe_session` cookie with `HttpOnly`, `SameSite=Lax`, `Path=/` after login; every request to the app's origin) and AC17's no-sideways-scroll check on each page. Follow `smoke.spec.ts`.
- Component test titles start with `S02.1 AC<n>`; e2e titles too.
- Schema change: no.

## Out of scope

The admin level and the "no access" notice (S02.2). Any content in the contributor area (E03).

## Implementation notes

**Files changed:**

- apps/web/src/components/RequireAccount.tsx
- apps/web/src/components/RequireAccount.test.tsx
- apps/web/src/components/AccountNotice.tsx
- apps/web/src/pages/contribute/ContributorAreaPage.tsx
- apps/web/src/App.tsx
- apps/web/CLAUDE.md
- e2e/tests/accounts.spec.ts

**Differences from the ticket:**

- `RequireAccount` takes `level: 'contributor'` and decides with an exhaustive `switch` on the level, so S02.2 adds `case 'admin'` there. `AccountNotice` takes `kind: 'waiting' | 'not-approved'`.
- The anonymous redirect keeps slashes readable: `/login?next=/contribute` (the rest of the path is URL-encoded).
- The component tests of AC1 (waiting text after sign-up) and AC9 (redirect, login back to `/contribute`, `//evil.example` and `https://evil.example` ignored) left by FE-02 are in `RequireAccount.test.tsx`.
- `accounts.spec.ts` also checks `/signup` and `/login` at both widths (AC17). No account can be approved before S02.2 and the spec runs no SQL, so the contributor-area no-scroll check answers `GET /api/auth/me` with an approved contributor through `page.route`; everything else in the spec runs against the real server. The spec was written after the components, so it was not seen failing first (the component tests were).
