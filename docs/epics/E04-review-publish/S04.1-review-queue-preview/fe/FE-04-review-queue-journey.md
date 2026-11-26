---
id: FE-04
story: S04.1
layer: fe
status: done # todo | doing | done
depends_on: [FE-02, FE-03]
covers: [AC1, AC4, AC8, AC9]
updated: 2026-11-26
---

# FE-04 Review queue journey test

**Goal:** `pnpm e2e` proves at both widths that an admin finds a submitted page and previews it, and that a contributor is kept out. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/review-queue.spec.ts`
- create `e2e/helpers/review.ts` (open "Pages to review", find a row by name, open the preview)
- change `e2e/helpers/safety-page.ts` (`fillCompletePage` takes the page name, default `ROTAVAP_NAME`)
- change `apps/web/CLAUDE.md` (e2e helpers)

## Constraints

- Follow `e2e/tests/safety-page-edit.spec.ts` and the helpers in `e2e/helpers/accounts.ts`; every test uses its own accounts and its own page name (`Rotary evaporator <unique>`), because both widths share one database and other specs leave pending pages in the list. The E03 specs keep the default name and must still pass.
- Steps: a new approved contributor submits a page → the setup admin opens "Pages to review" → the row shows the name, "New", the contributor and today's date → the preview shows the contributor, the date and the filled-in fields → the no-sideways-scroll check on both pages; an approved contributor at `/admin/review` and `/admin/review/<id>` sees "No access" and not the page name.
- Titles `S04.1 AC<n>`.
- Schema change: no.

## Out of scope

Approving and rejecting in the browser (S04.2, S04.3).

## Implementation notes

**Files changed:**

e2e/tests/review-queue.spec.ts
e2e/helpers/review.ts
e2e/helpers/safety-page.ts
apps/web/CLAUDE.md

**Differences from the ticket:**

- `e2e/helpers/review.ts` also has `uniquePageName(testInfo)` ("Rotary evaporator <project>-<time>-<random>") and `todayInBrowser(page)` (today in the app's "26 Nov 2026" format, in the browser's time zone), besides `openReviewQueue`, `reviewRow` and `openReviewSubmission`.
- The admin logs in in the contributor's window after "Log out", not in a new browser context, because `browser.newContext()` does not take the project's viewport and the no-sideways-scroll checks must run at 375 px too.
- The AC8 test's contributor is the page's own author (they submit a page and take its id from their edit page), and it also checks that an anonymous visitor at `/admin/review/<id>` is sent to `/login?next=/admin/review/<id>`.
- The spec was written after FE-02 and FE-03 had built the pages, so its first run failed only on a wrong assertion of mine ("Flammable" is a GHS pictogram in `fillCompletePage`, not a hazard), not on missing behaviour.
