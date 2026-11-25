---
id: BE-04
story: S03.1
layer: be
status: done
depends_on: [BE-01, BE-02, BE-03]
covers: [AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC16, AC19]
updated: 2026-11-24
---

# BE-04 Submit a page and list my submissions

**Goal:** `POST /api/submissions` stores a complete page as a pending new instrument, and `GET /api/submissions/mine` lists only the caller's own pages. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/submissions/submissions.module.ts`, `submissions.controller.ts`, `submissions.service.ts`, `submission.response.ts`
- change `apps/api/src/app.module.ts`
- create `apps/api/test/submissions.int.test.ts`
- change `apps/api/test/auth-helpers.ts` or create `apps/api/test/page-helpers.ts` (a complete valid page body and a photo row for tests)

## Constraints

- Both routes are `@Contributor()`. The body is parsed with `SafetyPageContent` through `ZodValidationPipe`, so one 400 names every problem (AC9, AC10).
- In one transaction (`dataSource.transaction`, the `users.service.ts` pattern): check the lab room exists and the photo is the caller's own upload (`PhotosService`), answering 400 `VALIDATION_FAILED` with `fields` for `labRoomId` and/or `photoId` together; then insert the instrument (`created_by` = caller), the revision (`NEW`, `PENDING`, `submitted_by` = caller, `submitted_at` = now) and its hazard and PPE rows, from the parsed body only.
- The response is built by a `to…Response` function into `Submission`, including `submittedBy {id, name}`; no entity is returned.
- `GET /submissions/mine`: only `submitted_by` = caller, newest first, mapped to `SubmissionSummary`, in one query that never reads photo bytes.
- Declare `mine` so that S03.2's `GET /submissions/:id` cannot shadow it.
- Integration tests (titles `S03.1 AC<n>`): a complete page → 201, the rows in all four tables (AC8); `{}` → 400 with every required field and no rows (AC9); each AC10 gap alone; both AC11 pairs; AC12; each AC13 case, including an unknown room and another user's photo, with no rows; anonymous 401 and pending and rejected 403 on both routes, admin 201 (AC14); two contributors each see only their own list, empty for the second (AC16); `GET /api/instruments/rotary-evaporator` is 404 after a submit (AC19).
- Schema change: no.

## Out of scope

`GET` and `PUT /submissions/:id` (S03.2). Slugs and the public page (E04, decision E03-D3).

## Implementation notes

**Files changed:**

- apps/api/src/modules/submissions/submissions.module.ts
- apps/api/src/modules/submissions/submissions.controller.ts
- apps/api/src/modules/submissions/submissions.service.ts
- apps/api/src/modules/submissions/submission.response.ts
- apps/api/src/modules/photos/photos.service.ts
- apps/api/src/app.module.ts
- apps/api/test/page-helpers.ts
- apps/api/test/submissions.int.test.ts

**Differences from the ticket:**

- `PhotosService.isOwnedBy` gained an optional `manager` argument, so the photo check runs inside the submit transaction (the "use `manager` for every query" rule). The lab-room check uses `manager.getRepository(LabRoom)` directly; `SubmissionsModule` lists `LabRoom` in its `forFeature` next to the four instrument entities, so it does not rely on `MetaModule`.
- The instrument entities are registered with `TypeOrmModule.forFeature` in `SubmissionsModule` (no separate instruments module; nothing else uses them yet).
- `@Contributor()` is on each handler, not on the controller, so S03.2 can add `@Public()` `GET`/`PUT /submissions/:id` (E03-D4) without overriding a class-level level; `mine` is declared first.
- `toSubmissionResponse` returns hazards and PPE items in PRD §4.2 list order, because the child rows have no order column; S03.2's read gets the same order.
- `submitted_at` is set by the service (`new Date()`); `mine` orders by `submitted_at DESC, id DESC`.
- Test helper in a new `test/page-helpers.ts` (`validPage`, `insertPhoto`, `firstLabRoomId`); `auth-helpers.ts` is unchanged. AC19's public-page check relies on the unknown `/api` route answering 404 `NOT_FOUND` (design "Endpoints").
