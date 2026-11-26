---
id: BE-01
story: S04.2
layer: be
status: done # todo | doing | done
depends_on: []
covers: [AC1, AC4, AC8, AC9, AC10]
updated: 2026-11-25
---

# BE-01 Publishing contract

**Goal:** the shared schemas and error codes for approving, the public page and the approved row in "My submissions" exist and are tested. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `packages/shared/src/errors.ts` (`ALREADY_REVIEWED`, `SUBMISSION_CHANGED`)
- change `packages/shared/src/schemas/review.ts`, `review.test.ts` (`version`, `ApproveSubmissionRequest`, `ReviewDecision`)
- change `packages/shared/src/schemas/instruments.ts`, `instruments.test.ts` (`InstrumentSlugParam`, `PublishedSafetyPage`)
- change `packages/shared/src/schemas/submissions.ts`, `submissions.test.ts` (`slug` in `SubmissionSummary` and `Submission`)

## Constraints

- Follow the pattern of S04.1 BE-01. `version` is a whole number of at least 1. `PublishedSafetyPage.page.lastApproved` is required (not null) there; `SafetyPageDisplay` itself stays nullable.
- `PublishedSafetyPage` has no field for the contributor, an email, the review note or `version`.
- Shared tests titled `S04.2 AC<n>`: valid and invalid objects for each new schema; `version` 0, 1.5 and a string refused; a published page without `lastApproved` refused.
- Schema change: no.

## Out of scope

`RejectSubmissionRequest` and `reviewNote` (S04.3).

## Implementation notes

**Files changed:**

packages/shared/src/errors.ts
packages/shared/src/schemas/review.ts
packages/shared/src/schemas/review.test.ts
packages/shared/src/schemas/instruments.ts
packages/shared/src/schemas/instruments.test.ts
packages/shared/src/schemas/submissions.ts
packages/shared/src/schemas/submissions.test.ts
apps/api/src/modules/review/review.response.ts
apps/api/src/modules/submissions/submission.response.ts
apps/api/test/review-queue.int.test.ts
apps/api/test/submission-edit.int.test.ts
apps/api/test/submissions.int.test.ts
apps/web/src/test/msw.ts (by frontend-dev, fixtures only)
apps/web/src/pages/contribute/MySubmissions.test.tsx (by frontend-dev, fixtures only)

**Differences from the ticket:**

- The tests are in `packages/shared/src/schemas/`, as the ticket's "Files" says and as S04.1 BE-01 did, not in `apps/api/test/`. The test for the two error codes is in `instruments.test.ts` (there is no `errors.test.ts`).
- `ReviewDecision.status` is its own `z.enum(['APPROVED', 'REJECTED'])`, not `RevisionStatus`, so `PENDING` is refused. Every `slug` in the contract (`ReviewDecision`, `PublishedSafetyPage`, `Submission`, `SubmissionSummary`) is a non-empty string; the format itself is guarded by the database CHECK in BE-02, not by the schema.
- `PublishedSafetyPage.page` is `SafetyPageDisplay.extend({ lastApproved: LastApproved })`; `SafetyPageDisplay` stays nullable.
- The existing S03.1 and S04.1 test fixtures got the new required fields (`slug: null`, `version: 1`); no assertion was removed. Three API integration tests that compare the exact body (`S04.1 AC4 gives the admin the page as SafetyPageDisplay…`, `S03.2 AC4 keeps GET /api/submissions/mine working…`, `S03.1 AC16 lists only the caller's own submissions…`) now also expect `version: 1` or `slug: null`.
- To keep the API compiling, its two mappers fill the new fields with what is true until the later tickets: `toSubmissionResponse` and `toSubmissionSummaryResponse` answer `slug: null` (no page can be approved before BE-03; BE-04 reads the slug), and `toReviewSubmissionResponse` answers `version: 1` (no column before BE-02; BE-03 reads it). Each has a comment naming the ticket that replaces it.
- **Blocked on the web:** the web's MSW fixtures in `apps/web/src/test/msw.ts` (`rotavapSubmission`, `mySubmissionsFixture`, `reviewSubmissionFixture`) parse with these schemas when the module loads, so every web test file fails until they get `slug: null` and `version: 1`. A backend ticket may not change `apps/web/`; see "Open questions".

**Open questions:**

- ~~Who adds the new fields to the web fixtures?~~ Resolved 2026-11-26: frontend-dev added `slug: null` to `rotavapSubmission`, `mySubmissionsFixture` and the inline `twoSubmissions` fixture in `MySubmissions.test.tsx`, and `version: 1` to `reviewSubmissionFixture`. No contract or assertion changed; `pnpm verify` passes (shared 171, API unit 133, web 279, integration 295).
