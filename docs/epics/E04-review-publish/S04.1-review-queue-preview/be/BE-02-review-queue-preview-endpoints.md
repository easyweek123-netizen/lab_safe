---
id: BE-02
story: S04.1
layer: be
status: done # todo | doing | done
depends_on: [BE-01]
covers: [AC1, AC4, AC7]
updated: 2026-11-26
---

# BE-02 Review queue and preview endpoints

**Goal:** an approved admin gets the pending pages oldest first and one page as `ReviewSubmission`; everyone else is refused. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/review/review.module.ts`, `admin-review.controller.ts`, `review.service.ts`, `review.response.ts`
- create `apps/api/src/modules/instruments/revision-content.ts` (the content mapping, moved), `safety-page-display.ts` (`SafetyPageDisplay` mapping)
- change `apps/api/src/modules/submissions/submission.response.ts` (uses the moved mapping)
- change `apps/api/src/app.module.ts`
- create `apps/api/test/review-queue.int.test.ts`

## Constraints

- `@Admin()` on the controller class, `@Controller('admin')`, routes `review-queue` and `submissions/:id`. Follow `admin-users.controller.ts` and the thin-controller rule.
- Queue: one query over `PENDING` revisions joined to the submitter's id and name, ordered by `submitted_at`, then `id`; it selects only the id, name, kind, `submitted_at` and the submitter's id and name, never the content or the photo bytes.
- Preview: `SubmissionIdParam`; one query with the hazard and protective equipment rows, the lab room and the submitter (pattern: `SubmissionsService.loadSubmission`); any status; unknown → 404 `NOT_FOUND`. `lastApproved` is null in this story.
- Moving the mapping changes no `Submission` output; the S03 tests must still pass unchanged. Hazards and protective equipment stay in PRD §4.2 order.
- The `(status, submitted_at)` index comes with S04.2's migration; record nothing else as an exception.
- Integration tests titled `S04.1 AC<n>`: order with three pages (two contributors and the admin), a corrected page keeps its place (AC1); the preview's fields, `labRoom` and `lastApproved: null` (AC4); the refusal matrix of both routes with no page name in the body: anonymous 401, pending, rejected, approved contributor and the author 403; unknown 404, malformed 400 (AC7).
- Schema change: no.

## Out of scope

Approve and reject; the public read (S04.2).

## Implementation notes

**Files changed:**

apps/api/src/modules/review/review.module.ts
apps/api/src/modules/review/admin-review.controller.ts
apps/api/src/modules/review/review.service.ts
apps/api/src/modules/review/review.response.ts
apps/api/src/modules/instruments/revision-content.ts
apps/api/src/modules/instruments/safety-page-display.ts
apps/api/src/modules/submissions/submission.response.ts
apps/api/src/app.module.ts
apps/api/test/review-queue.int.test.ts

**Differences from the ticket:**

- Recorded exception (E04 design "Data models"): the queue query filters on `instrument_revisions.status` and orders by `submitted_at` with no index of its own. The `(status, submitted_at)` index comes with S04.2's `AddReviewAndPublishing` migration (about 100 rows until then). This ticket has no schema change and no migration.
- `revision-content.ts` exports `toSafetyPageContent` and the type `RevisionContentFields`. `submission.response.ts` keeps `SubmissionFields` as an alias of it, so `SubmissionsService` is unchanged. `safety-page-display.ts` exports `toSafetyPageDisplay(revision, lastApproved)`. `ReviewService` passes `null` for `lastApproved` until S04.2 approves pages.
- `ReviewModule` registers only `InstrumentRevision` with `TypeOrmModule.forFeature`. The child rows, `LabRoom` and `User` come in through joins on the relations. The preview query never joins the photo, so no photo bytes are loaded.
- The 404 for an unknown id uses the same body as E03's `notFound()` (`NOT_FOUND`, "Not found."), built in `ReviewService`.
- Extra integration tests beyond the ticket's list: an empty queue; only `PENDING` rows listed, with equal dates ordered by id; hazards and PPE returned in PRD order when they were submitted reversed; the admin's own page and a non-pending (`REJECTED`, set with SQL) page in the preview. The test that the queue items "hold no content and no email" checks the exact key set. `responsibleContact` holds an email-like value in the test page, so the preview tests check for the submitter's email only.
- `apps/api/CLAUDE.md` still lists the modules without `review`, and still says `instruments/` holds only entities. This ticket may not edit that document, so it is left for `/complete-epic`.
