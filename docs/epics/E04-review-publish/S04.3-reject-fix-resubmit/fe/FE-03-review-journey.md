---
id: FE-03
story: S04.3
layer: fe
status: done # todo | doing | done
depends_on: [FE-01, FE-02]
covers: [AC9, AC11]
updated: 2026-11-26
---

# FE-03 Review journey test

**Goal:** `pnpm e2e` runs the epic's journey C2–C8 at both widths, with the anonymous "not found" checks along the way. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `e2e/tests/review-journey.spec.ts`
- change `e2e/helpers/review.ts` (reject from the preview), `e2e/helpers/safety-page.ts` only if a step is shared
- create `e2e/fixtures/instrument-2.jpg` (a second small JPEG for the replaced photo) unless one can be made in the test

## Constraints

- Own accounts and a unique page name per test (design "Testing"); anonymous checks in a fresh browser context, at the address the unique name will get.
- The steps of AC11 in order, with the anonymous page, API and photo checks while pending and while rejected, and the replaced photo after approval (AC9).
- No-sideways-scroll checks on the preview with the note and on the fix form.
- Titles `S04.3 AC<n>`.
- Schema change: no.

## Out of scope

Anything not in the journey; the refusal matrices are integration tests.

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
e2e/helpers/review.ts
e2e/tests/review-journey.spec.ts

**Differences from the ticket:**

- No `e2e/fixtures/instrument-2.jpg`: the replacement photo is made in the test. "Change photo" opens the file chooser and gets the bytes of `instrument.jpg` under another name; the server re-encodes every upload with `sharp` and stores it as a new photo with its own id, so the replaced photo and the new one are two separate rows. The test checks that the ids differ.
- `e2e/helpers/review.ts` gains `rejectFromPreview(page, name, note)`: fill the note, press "Reject", wait for the AC1 confirmation and check the row is gone. It is listed in `apps/web/CLAUDE.md` (Tests).
- One test, `S04.3 AC11 AC9 …`, runs the whole journey in order in both projects. The anonymous checks (the address, `GET /api/instruments/<slug>`, the photo) run in a fresh context at the project's width while the page is pending, while it is rejected and after the resubmission (the new photo). After approval the visitor sees the public page with the new photo and the fixed Safe operation, without the note, and the replaced photo is 404 to them while its owner still gets 200.
- "With the new date": both dates are today, so the test compares the row's `<time datetime>` before the reject and after the resubmission (it must be later), and checks that the row is the last in "Pages to review".
- No-sideways-scroll checks run on the preview with the note field, on My submissions with the note, on the fix form and on the public page.
- The test passed on its first run because FE-01 and FE-02 already shipped the behaviour, so it never failed.
