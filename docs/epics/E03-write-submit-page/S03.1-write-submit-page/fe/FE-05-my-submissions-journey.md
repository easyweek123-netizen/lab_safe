---
id: FE-05
story: S03.1
layer: fe
status: done
depends_on: [BE-04, FE-04]
covers: [AC8, AC16, AC19, AC20]
updated: 2026-11-24
---

# FE-05 My submissions and the submit journey

**Goal:** the contributor area lists the person's own submissions with the confirmation after a submit, proven in the browser at both widths together with the anonymous "not found" checks. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/pages/contribute/ContributorAreaPage.tsx`
- create `apps/web/src/pages/contribute/MySubmissions.tsx`, `MySubmissions.test.tsx`
- change `apps/web/CLAUDE.md` (page list: `/contribute` now holds My submissions)
- create `e2e/tests/safety-page.spec.ts`, `e2e/helpers/safety-page.ts` (fill in a complete page)
- create `e2e/fixtures/instrument.jpg` (a small JPEG)

## Constraints

- `/contribute` keeps h1 "Contributor area" and the sentence "Here you will write and update safety pages." (the E02 e2e helper `expectContributorArea` checks it), then the "New safety page" link, the confirmation `status` from the router state (AC8), and h2 "My submissions" as a list named "My submissions".
- Rows: the name, "Submitted <date>" (`en-GB`, `dateStyle: 'medium'`, as `SignUpRow.tsx`) and "Status: Pending" in words. Keys are the submission ids. In this story the name is plain text; S03.2 makes it a link.
- Loading, empty and error states exactly as in AC16; Retry runs the query again.
- `safety-page.spec.ts` runs in both Playwright projects with fresh accounts from `e2e/helpers/accounts.ts` (`signUpApproved`). It proves AC8 (submit "Rotary evaporator" with `e2e/fixtures/instrument.jpg` → confirmation and the row with today's date), AC16 (a second approved contributor sees the empty message), AC19 (a new browser context without login: `/instruments/rotary-evaporator` shows "Page not found", the photo URL and `GET /api/instruments/rotary-evaporator` answer 404) and AC20 (no sideways scroll on `/contribute/new` and `/contribute`). The page name may repeat between tests (epic open question 5).
- Component and e2e titles start with `S03.1 AC<n>`.
- Schema change: no.

## Out of scope

Opening a submission (S03.2). Approved or rejected statuses (E04).

## Implementation notes

**Files changed:**

- apps/web/src/pages/contribute/ContributorAreaPage.tsx
- apps/web/src/pages/contribute/MySubmissions.tsx
- apps/web/src/pages/contribute/MySubmissions.test.tsx
- apps/web/src/test/msw.ts
- apps/web/CLAUDE.md
- e2e/tests/safety-page.spec.ts
- e2e/helpers/safety-page.ts
- e2e/fixtures/instrument.jpg

**Differences from the ticket:**

- `src/test/msw.ts` gained a default `GET /api/submissions/mine` handler that answers an empty list. Every existing test that lands on `/contribute` (login, sign-up, gate, account menu, the FE-04 submit test) now loads My submissions, and unhandled requests fail. Tests that need a list still state it with `mySubmissionsHandler(…)`.
- The confirmation is read from `location.state.confirmation` only when it is a string. It shows as a `status` under the "New safety page" link. Because it lives in the history entry, it is still there after a reload of that entry.
- My submissions is a `section` with h2 "My submissions" and a list named by that heading (`aria-labelledby`). Statuses are written as words from a `RevisionStatus` map (Pending, Approved, Rejected), so E04 needs no change here.
- `e2e/fixtures/instrument.jpg` is a 320 × 240 plain JPEG of 718 bytes, made with `sharp`.
- The e2e spec is one journey test, run in both projects. It holds `POST /api/submissions` with `page.route` until "Submitting…" has been seen disabled, then lets it through to the real server. It also checks that the owner still gets 200 `image/jpeg` for the photo, as a contrast to the anonymous 404.

**Verification (2026-11-24):** `pnpm verify` passes. `pnpm e2e` passes: 54 tests, including `S03.1 AC8 AC16 AC19 AC20 …` in both the `desktop` and `mobile` projects.
