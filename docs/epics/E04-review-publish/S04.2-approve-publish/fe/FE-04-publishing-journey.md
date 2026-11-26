---
id: FE-04
story: S04.2
layer: fe
status: done # todo | doing | done
depends_on: [FE-01, FE-02, FE-03]
covers: [AC5, AC7, AC12, AC13, AC15]
updated: 2026-11-26
---

# FE-04 Publishing journey test

**Goal:** `pnpm e2e` proves at both widths that an approved page is public, identical to its preview, readable at a glance on a phone, and hidden until then. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/publish.spec.ts`
- change `e2e/helpers/review.ts` (approve from the preview; publish a page through the API)
- change `apps/web/CLAUDE.md` (e2e helpers)

## Constraints

- Each test uses its own accounts and page name (design "Testing"); anonymous checks run in a fresh browser context.
- AC5: read the view's text on the preview and on the public page and compare them, without the "Last approved" line.
- AC7: a page with 4 hazards and 4 protective equipment items, created and approved with Playwright `request` contexts (contributor uploads the photo and submits, the setup admin approves with the preview's `version`), then opened at 375 × 812; each named element's box lies inside the first screen; the no-sideways-scroll check.
- AC12: before approval the browser address, the API and the photo answer "not found"; after approval all three succeed.
- AC13: the setup admin submits from the contributor area and approves; the public page names them.
- AC15: the full approve journey at both widths, ending with "Approved" and its link in "My submissions".
- Titles `S04.2 AC<n>`.
- Schema change: no.

## Out of scope

Reject and resubmit journeys (S04.3).

## Implementation notes

**Files changed:**

e2e/tests/publish.spec.ts
e2e/helpers/review.ts
e2e/helpers/safety-page.ts
apps/web/CLAUDE.md

**Differences from the ticket:**

- `e2e/helpers/safety-page.ts` also changed: `submitCompletePage(page, name)` opens the form, fills a complete page, submits it and returns the photo id (used by the AC15 and AC13 tests; the S04.1 spec keeps its own local `submitPage`, unchanged).
- `e2e/helpers/review.ts` gains `approveFromPreview` (returns the confirmation link's address), `expectedSlug` (the slug of an accent-free name, so AC12 can ask for the address before it exists), `apiContributor` (sign-up and approval through the API, then `submit(name, { hazards, protectiveEquipment })` with photo upload) and `approveThroughApi` (the setup admin approves with the preview's `version`).
- Four tests, each at both widths: AC15 with AC5 (one journey: the preview's view text is read before approving and compared line by line with the public page as the admin and as the anonymous visitor, without the "Last approved" line; it also checks the photo answers 200 `image/jpeg` anonymously, no contributor name or email on the public page, and the row's only link is the public one), AC12 (pages made through the API; browser address, `GET /api/instruments/<slug>` and the photo before and after approval, plus a second pending page), AC7 and AC13.
- AC7 opens its own 375 × 812 context (`isMobile`, `hasTouch`) in both projects, as the S04.1 FE-04 notes advise; "on the first screen" means each element's whole bounding box lies within 0–375 × 0–812 without scrolling.
- The anonymous contexts of AC15 and AC12 take the project's width (`viewport: page.viewportSize()`), so their no-sideways-scroll check runs at 375 px too.
- The spec could not be seen failing for missing behaviour: FE-01 to FE-03 and BE-01 to BE-04 had built everything before it was written. It passed on its first run.
