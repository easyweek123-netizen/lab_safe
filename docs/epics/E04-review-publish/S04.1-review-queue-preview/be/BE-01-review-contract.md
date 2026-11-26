---
id: BE-01
story: S04.1
layer: be
status: done # todo | doing | done
depends_on: []
covers: [AC1, AC4]
updated: 2026-11-25
---

# BE-01 Review contract

**Goal:** the shared schemas of the review list, the preview and the page display exist and are tested, so the API and the web build on one contract. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `packages/shared/src/schemas/instruments.ts`, `packages/shared/src/schemas/instruments.test.ts` (`SafetyPageDisplay`)
- create `packages/shared/src/schemas/review.ts`, `packages/shared/src/schemas/review.test.ts` (`ReviewQueueItem`, `ReviewQueue`, `ReviewSubmission`)
- change `packages/shared/src/index.ts`

## Constraints

- Follow the pattern in `packages/shared/src/schemas/submissions.ts`: a Zod schema and its inferred type under the same name, ISO 8601 date-times with `z.iso.datetime()`.
- `SafetyPageDisplay.content` is the existing `SafetyPageContent` and `labRoom` the existing `LabRoom`; don't copy their fields. `lastApproved` is nullable, not optional.
- No email field anywhere; `submittedBy` is `{ id, name }` only.
- Shared tests titled `S04.1 AC1` / `S04.1 AC4`: a valid object parses; a missing `labRoom`, a bad date and an unknown status are refused; `lastApproved: null` parses.
- Schema change: no.

## Out of scope

`version`, approve, reject and the public page schemas (S04.2, S04.3).

## Implementation notes

**Files changed:**

packages/shared/src/schemas/instruments.ts
packages/shared/src/schemas/instruments.test.ts
packages/shared/src/schemas/review.ts
packages/shared/src/schemas/review.test.ts
packages/shared/src/index.ts

**Differences from the ticket:**

- Two small named sub-schemas were added so the web and the API can name them: `LastApproved { at, approverName }` (in `instruments.ts`) and `ReviewSubmitter { id, name }` (in `review.ts`). They don't add any fields to the contract.
- The tests are in `packages/shared/src/schemas/`, next to the other shared tests, as the ticket's "Files" says. They are not in `apps/api/test/`. The API tests that use this contract come with BE-02.
- Zod strips unknown keys, so an `email` sent along is dropped, not refused. The tests check that a parsed item or submission keeps no email and that `ReviewQueueItem` has exactly the five contract fields.
