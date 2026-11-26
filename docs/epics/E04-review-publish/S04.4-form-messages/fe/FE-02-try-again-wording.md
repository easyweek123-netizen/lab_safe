---
id: FE-02
story: S04.4
layer: fe
status: done # todo | doing | done
depends_on: [FE-01]
covers: [AC4]
updated: 2026-11-26
---

# FE-02 "Try again" wording

**Goal:** the failure messages fit every button: "try again" instead of "submit again" on the new-page, edit and fix forms. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/components/safety-page-form/failure-messages.ts`
- change `apps/web/src/components/safety-page-form/PhotoField.test.tsx`, `apps/web/src/pages/new-safety-page/NewSafetyPagePage.test.tsx`, `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx`
- change `e2e/tests/network-drop.spec.ts`

## Constraints

- Exactly the two AC4 texts; the other S03.1 AC17 texts stay.
- In the existing tests change only the expected text; keep their titles (`S03.x AC<n>`) and what they check. Add `S04.4 AC4` tests for the offline and 401 messages on each of the three forms, and one that no exported message contains "submit again".
- Schema change: no.

## Out of scope

Messages of other pages.

## Implementation notes

**Files changed:**

- apps/web/src/components/safety-page-form/failure-messages.ts
- apps/web/src/components/safety-page-form/failure-messages.test.ts
- apps/web/src/components/safety-page-form/PhotoField.test.tsx
- apps/web/src/pages/new-safety-page/NewSafetyPagePage.test.tsx
- apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx
- e2e/tests/network-drop.spec.ts

**What was built:** `SESSION_ENDED_MESSAGE` is now "Your session has ended. Log in again in another tab, then try again here." and `SUBMIT_UNREACHABLE_MESSAGE` "Couldn't reach LabSafe. Your page is still here; check your connection and try again."; no other text changed.

**Existing tests whose expected text changed (only the text; titles and checks unchanged):**

- `PhotoField.test.tsx`: `S03.1 AC17 shows the session message on a 401`.
- `NewSafetyPagePage.test.tsx`: `S03.1 AC17 keeps the form and its photo after %s` (cases "a network error" and "a 401"); `S03.1 AC17 sends at once while offline and keeps the form`.
- `EditSafetyPagePage.test.tsx`: `S03.2 AC6 keeps every typed value after a save fails with %s` ("a network error", "a 401"); `S03.2 AC6 sends at once while offline and keeps the form`; `S04.3 AC10 keeps every typed value after a resubmission fails with %s` ("a network error", "a 401").
- `e2e/tests/network-drop.spec.ts`: the offline submit's expected text.

**Tests added (`S04.4 AC4`):** `failure-messages.test.ts` (the two texts; no string exported by `failure-messages.ts` or `decision-messages.ts` contains "submit again"; no non-test web source file contains it). `NewSafetyPagePage.test.tsx`: offline submit, 401 on submit, 401 on photo upload. `EditSafetyPagePage.test.tsx`: offline and 401 for the edit and the fix form, 401 on a photo upload in each. `PhotoField.test.tsx`: 401 on a photo change.

**Differences from the ticket:**

- Added a source-file scan (`import.meta.glob` with `?raw`, tests excluded) besides the exported-message check, to cover "No message in the web app contains 'submit again'"; this means no comment in the web sources may contain the phrase either.
- The header comment of `failure-messages.ts` mentions S04.4 AC4.
