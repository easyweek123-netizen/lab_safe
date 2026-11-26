---
id: BE-01
story: S04.3
layer: be
status: done # todo | doing | done
depends_on: []
covers: [AC1, AC2, AC3]
updated: 2026-11-26
---

# BE-01 Reject with a note

**Goal:** an admin rejects a pending page with a required note; it is decided once, and nobody else can reject. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `packages/shared/src/schemas/review.ts`, `review.test.ts` (`RejectSubmissionRequest`)
- change `packages/shared/src/schemas/submissions.ts`, `submissions.test.ts` (`reviewNote`)
- change `apps/api/src/modules/review/admin-review.controller.ts`, `review.service.ts`
- create `apps/api/test/review-reject.int.test.ts`

## Constraints

- Contract first: the two shared changes are this story's contract; the texts as in the story.
- `POST /admin/submissions/:id/reject`, `@HttpCode(200)`. One conditional `UPDATE … WHERE id AND status = 'PENDING' RETURNING`, setting the status, the trimmed note, the reviewer and the date (pattern: `UsersService.decideSignUp`); no row: 404 if the id is unknown, else 409 `ALREADY_REVIEWED`. The review CHECK of S04.2 BE-02 backs it.
- Rejecting has no `version` check (design open question 2).
- Log ids only, never the note.
- Integration tests titled `S04.3 AC<n>`: the stored note, reviewer and date (AC1); missing, spaces-only and too-long notes with nothing changed (AC2); the refusal matrix, an already approved and an already rejected page, malformed and unknown ids, foreign `Origin` (AC3).
- Schema change: no (the columns come from S04.2's migration).

## Out of scope

Showing the note and resubmitting (BE-02).

## Implementation notes

**Files changed:**

apps/web/src/test/msw.ts (by frontend-dev, fixtures only)
apps/web/src/pages/contribute/MySubmissions.test.tsx (by frontend-dev, fixtures only)

packages/shared/src/schemas/review.ts
packages/shared/src/schemas/review.test.ts
packages/shared/src/schemas/submissions.ts
packages/shared/src/schemas/submissions.test.ts
apps/api/src/modules/review/admin-review.controller.ts
apps/api/src/modules/review/review.service.ts
apps/api/src/modules/review/review.response.ts
apps/api/src/modules/submissions/submission.response.ts
apps/api/test/review-reject.int.test.ts
apps/api/test/submissions.int.test.ts
apps/api/test/submission-edit.int.test.ts

**Differences from the ticket:**

- The shared tests are in `packages/shared/src/schemas/` (`review.test.ts`, `submissions.test.ts`), as the ticket's "Files" says and as S04.1 and S04.2 BE-01 did. The shared schemas were written before their tests, so only the API tests were seen failing first (404 before the route existed).
- `RejectSubmissionRequest` also exports `REVIEW_NOTE_MAX = 1000`. The limit counts the trimmed note. A `null` or non-string note gives the "missing" message, like no note.
- `Submission.reviewNote` and `SubmissionSummary.reviewNote` are `z.string().nullable()`, required (nullable, not optional, as `slug` is). To keep the API compiling, `toSubmissionResponse` and `toSubmissionSummaryResponse` answer `reviewNote: null`, with a comment naming S04.3 BE-02, which returns the stored note of a rejected page (its ticket: "`read` and `listMine` return `reviewNote`"). Until BE-02, a rejected page reads with `reviewNote: null`.
- One extra file, `review.response.ts`, gains `toRejectionDecisionResponse(id)` → `{ id, status: 'REJECTED', slug: null }`: a rejected revision has no public address.
- The conditional `UPDATE` is a query builder update with `RETURNING id`, no transaction (one statement). The design's "Reviewed once" row says approve and reject lock `FOR UPDATE`; the ticket's single conditional update gives the same guarantee and was followed. A test runs two rejects at once: exactly one 200, the other 409, and the winner's note is stored.
- Extra tests beyond the ticket's list: line breaks inside the note kept; the page leaves the queue, shows `REJECTED` in the preview and publishes nothing; no other page changes; an admin rejects their own page; a note of exactly 1,000 characters; a non-string note; approving a just-rejected page is 409.
- **Existing tests changed** (fixtures of exact bodies only; no assertion removed or loosened): the two API tests that compare the whole `GET /api/submissions/mine` body (`S03.2 AC4 keeps GET /api/submissions/mine working next to :id`, `S03.1 AC16 lists only the caller's own submissions, newest first`) now also expect `reviewNote: null`; the shared fixtures in `submissions.test.ts` (S03.1 AC13 ×3, S04.2 AC10) got `reviewNote: null`.
- **Blocked on the web:** the web's fixtures parse with these schemas when the module loads (`rotavapSubmission` and `mySubmissionsFixture` in `apps/web/src/test/msw.ts`, `twoSubmissions` and `approvedList` in `MySubmissions.test.tsx`, the `Submission.parse` fixtures in `EditSafetyPagePage.test.tsx`), so every web test file fails until they get `reviewNote: null`. A backend ticket may not change `apps/web/`; see "Open questions".

**Open questions:**

- ~~Who adds `reviewNote: null` to the web fixtures?~~ Resolved 2026-11-26: frontend-dev added it to `rotavapSubmission` and `mySubmissionsFixture` (msw.ts) and the two rows of `twoSubmissions` (MySubmissions.test.tsx); `approvedList` and the EditSafetyPagePage fixtures spread these and needed no change. No contract or assertion changed; `pnpm verify` passes (shared 181, API unit 139, web 311, integration 390).
