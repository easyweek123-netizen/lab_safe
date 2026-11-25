---
id: BE-01
story: S03.2
layer: be
status: done
depends_on: []
covers: [AC2, AC3, AC4, AC5, AC7]
updated: 2026-11-25
---

# BE-01 Read and edit one submission

**Goal:** `GET /api/submissions/:id` serves a pending page to its author and admins only, and `PUT` lets only the author replace it, still pending. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `packages/shared/src/schemas/submissions.ts`, `packages/shared/src/schemas/submissions.test.ts` (`SubmissionIdParam`)
- change `apps/api/src/modules/submissions/submissions.controller.ts`, `submissions.service.ts`
- create `apps/api/test/submission-edit.int.test.ts`

## Constraints

- Both routes are `@Public()`; the service decides (decision E03-D4) and answers one 404 `NOT_FOUND`, identical to an unknown id, to everyone it does not allow. `GET`: the author, or an approved admin. `PUT`: only an approved author; an admin gets 404 too (design open question 1). The id is parsed with `SubmissionIdParam` (malformed → 400); the body with `SafetyPageContent` (design open question 5: a bad body is 400 for any caller).
- The `mine` route keeps working; `:id` must not catch it.
- `PUT` runs in one transaction: load the revision `FOR UPDATE` with id, `submitted_by` = caller and status `PENDING` (no row → 404), run S03.1's room and photo checks (400 with `fields`), update the content and `updated_at`, delete and re-insert the hazard and PPE rows from the parsed body. `submitted_at`, `kind` and `status` stay (design open question 8, E03-D5). Reuse S03.1 BE-04's mapping and checks; don't copy them.
- Integration tests (titles `S03.2 AC<n>`): author edit → 200, rows replaced, still pending, `submittedAt` unchanged (AC2); an incomplete body and each S03.1 AC13 case → 400 and nothing changed (AC3); the `GET` matrix with `submittedBy` for the author and an admin, 404 for anonymous, pending, rejected, another contributor and an unknown id, 400 malformed (AC4); the `PUT` matrix with an admin refused and the stored page unchanged (AC5); the photo and `/api/instruments/rotary-evaporator` still 404 to an anonymous visitor after an edit (AC7).
- Schema change: no.

## Out of scope

Editing a `REJECTED` revision (E04, US9). Public reads (E04).

## Implementation notes

**Files changed:**

- packages/shared/src/schemas/submissions.ts
- packages/shared/src/schemas/submissions.test.ts
- apps/api/src/modules/submissions/submissions.controller.ts
- apps/api/src/modules/submissions/submissions.service.ts
- apps/api/test/submission-edit.int.test.ts

**Differences from the ticket:**

- The read and the post-edit response share one private `loadSubmission(manager, id, submittedBy | null)` query (revision, hazards, PPE and the submitter's id and name in one join), mapped with S03.1's `toSubmissionResponse`; `PUT` reuses S03.1's `checkReferences`, `insertChildRows` and `contentColumns` instead of copying them.
- The `FOR UPDATE` load uses TypeORM's `lock: { mode: 'pessimistic_write' }` on `findOne`, selecting only `id`.
- `GET` and `PUT` both answer 404 to an author whose account is no longer `APPROVED`; `PUT` also answers 404 for a revision that is no longer `PENDING` (tested). A foreign `Origin` on `PUT` is 403 `FORBIDDEN` (tested).
- The malformed-id case of `PUT` is titled under AC3 (no criterion names it for `PUT`); the `mine`-still-works check is titled under AC4.
