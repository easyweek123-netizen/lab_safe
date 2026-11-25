---
id: FE-02
story: S03.2
layer: fe
status: done
depends_on: [BE-01, FE-01]
covers: [AC1, AC2, AC7, AC8]
updated: 2026-11-25
---

# FE-02 Edit journey test

**Goal:** prove in the browser, at both widths, that the author corrects a pending page and that it stays invisible to the public. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/safety-page-edit.spec.ts`
- change `e2e/helpers/safety-page.ts` (open a submission from My submissions, if useful)

## Constraints

- Runs in both Playwright projects with a fresh approved account per test (`e2e/helpers/accounts.ts`) and the S03.1 helper that fills in a complete page.
- Proves AC1 (the form shows the submitted values, including the photo and one emergency item marked "Not applicable"), AC2 (save → confirmation → "Status: Pending" → reopen shows the new description), AC7 (a new browser context without login gets "Page not found" and 404 for the photo) and AC8 (no sideways scroll on the edit form).
- Titles start with `S03.2 AC<n>`. Find elements by role or label.
- Schema change: no.

## Out of scope

Component-level states (FE-01).

## Implementation notes

**Files changed:**

- e2e/tests/safety-page-edit.spec.ts
- e2e/helpers/safety-page.ts

**Differences from the ticket:**

- One journey test covers AC1, AC2, AC7 and AC8 (titled `S03.2 AC1 AC2 AC7 AC8 …`), run in both projects, as the S03.1 spec does.
- New helper `openSubmission(page, name)` follows the name in My submissions and waits for h1 "Edit safety page" and "Save changes"; it returns the id from the address.
- AC1 checks every field `fillCompletePage` fills: the texts, the photo preview's address (the same photo id), category and lab room (compared with the values chosen before submitting), the radios, the hazard with its note, PPE, the guidelines, two emergency locations, and "Not applicable" on "Emergency stop" (not on "Eyewash"). `fillCompletePage` chooses no "none" option, so the "none" choices are left to the FE-01 component tests.
- AC2 holds the `PUT` with `page.route` so "Saving…" can be seen disabled, as the S03.1 spec does for submit. The status, `submittedAt` and the replaced rows are checked by BE-01; in the browser, the test checks the confirmation, "Status: Pending" and the new description after reopening.
- The feature was already built by BE-01 and FE-01, so the spec passed on its first run; it could not be seen failing first.

**Verification (2026-11-25):** `pnpm e2e` 56 passed (the new journey at desktop and 375 px). `pnpm verify` passes (format, lint, types, web 217, api 133 + 283 integration, shared 129, build, docs-check OK).
