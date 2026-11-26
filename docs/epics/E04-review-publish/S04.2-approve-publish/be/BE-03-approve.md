---
id: BE-03
story: S04.2
layer: be
status: done # todo | doing | done
depends_on: [BE-01, BE-02]
covers: [AC1, AC2, AC8, AC9, AC10, AC11, AC13]
updated: 2026-11-26
---

# BE-03 Approve a page

**Goal:** an admin approves the version they saw, and the page is published in one transaction with a unique, stable address. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/instruments/slug.ts`, `apps/api/test/unit/modules/instruments/slug.test.ts`
- change `apps/api/src/modules/review/admin-review.controller.ts`, `review.service.ts`, `review.response.ts` (approve; `version` in the preview)
- change `apps/api/src/modules/submissions/submissions.service.ts` (`version` + 1 on every save; 409 for the author of an approved page)
- create `apps/api/test/review-approve.int.test.ts`
- change `apps/api/test/submission-edit.int.test.ts` only where the approved-page answer is now 409

## Constraints

- `POST /admin/submissions/:id/approve` with `SubmissionIdParam` and `ApproveSubmissionRequest`; `@HttpCode(200)`.
- One `dataSource.transaction`, `manager` for every query (pattern: `UsersService.changeRole`): lock the revision `FOR UPDATE` (unknown → 404); not `PENDING` → 409 `ALREADY_REVIEWED`; `version` differs → 409 `SUBMISSION_CHANGED`; lock the instrument; only if it has no slug, take `pg_advisory_xact_lock` with one fixed key and pick `slugify(name)` or the first free `-2`, `-3`…; set the revision's status, reviewer and date and the instrument's slug and pointer. A refusal writes nothing.
- `slugify`: NFKD, accents removed, lowercase, every run of other characters → one hyphen, no hyphen at either end, cut to at most 80 characters before the `-2` suffix, `instrument` when empty. Unit tests for every example in AC2.
- `PUT /submissions/:id`: the lock loads `id AND submitted_by = me` without a status filter; `APPROVED` → 409 `ALREADY_REVIEWED` (E04-D8); `PENDING` saves as before plus `version` + 1. Keep the other callers' 404 (E03-D4). Leave `REJECTED` as 404 until S04.3.
- Log the approval with ids only.
- Integration tests titled `S04.2 AC<n>`: publish and the stored columns (AC1); duplicate names and two same-name approvals at once (AC2); approve twice and two admins at once (AC8); the version race of C14 (AC9); the author's `PUT` on an approved page and another caller's 404 (AC10); the refusal matrix with nothing changed, bad bodies, foreign `Origin` (AC11); an admin approves their own page (AC13).
- Schema change: no.

## Out of scope

The public read and photos (BE-04); reject (S04.3).

## Implementation notes

**Files changed:**

apps/api/src/modules/instruments/slug.ts
apps/api/src/modules/review/admin-review.controller.ts
apps/api/src/modules/review/review.service.ts
apps/api/src/modules/review/review.response.ts
apps/api/src/modules/review/review.module.ts
apps/api/src/modules/submissions/submissions.service.ts
apps/api/test/unit/modules/instruments/slug.test.ts
apps/api/test/review-approve.int.test.ts

**Differences from the ticket:**

- **`submission-edit.int.test.ts` is unchanged.** No existing test there (or anywhere else) puts a page in `APPROVED`: S03.2 AC5's "no longer pending" test uses a `REJECTED` row, which still answers 404 until S04.3, as the ticket says. The admin's `PUT` on someone else's pending page also still answers 404. So no existing test had to change; the new 409 for the author of an approved page is tested in `review-approve.int.test.ts` (S04.2 AC10).
- `slug.ts` exports two pure functions: `slugify(name)` and `nextFreeSlug(base, taken)` (the first free `base`, `base-2`, `base-3` …), so both are unit tested without a database. `SLUG_BASE_MAX_LENGTH = 80` is exported for the test.
- The free slug is found with one query under the advisory lock: `slug = base OR slug LIKE 'base-%'` (a slug has only `a-z`, `0-9` and `-`, so no LIKE wildcard), then `nextFreeSlug` picks in memory. The advisory lock's fixed key is `5503788329879364913` (the bytes of "LabSafe1").
- `ReviewModule` also registers `Instrument` in `TypeOrmModule.forFeature`, and `ReviewService` gets `DataSource` injected. `review.response.ts` gains `toApprovalDecisionResponse(id, slug)`.
- `toReviewSubmissionResponse` now reads `revision.version` (BE-01's placeholder `version: 1` is gone). The preview's `lastApproved` stays `null` also for an approved revision; nothing in S04.2 asks for it there.
- The instrument row is read `FOR UPDATE` after the revision (the same order every approval takes, so no deadlock with `PUT`, which locks only the revision). An instrument missing behind a revision cannot happen (foreign key); the code answers 404 for it rather than asserting.
- An approve of a `REJECTED` revision is also 409 `ALREADY_REVIEWED` (it is not `PENDING`), tested under AC8.
- The version is incremented in SQL (`version = version + 1`) in the same `UPDATE` as the content, under the row lock. A refused save (404, 400) does not change it; tested under AC9.
- `Submission.slug` / `SubmissionSummary.slug` still answer `null` (BE-01's placeholder): BE-04 reads them, per its ticket.
- The approval log line has ids only: revision, instrument and the approving account.
