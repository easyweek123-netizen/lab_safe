---
id: BE-04
story: S04.2
layer: be
status: done # todo | doing | done
depends_on: [BE-03]
covers: [AC4, AC6, AC10, AC12]
updated: 2026-11-26
---

# BE-04 Public page and photo

**Goal:** anyone reads a published page by its address and gets its photo; nothing unpublished is served; the author's list links to the published page. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/instruments/instruments.module.ts`, `instruments.controller.ts`, `published-instruments.query.ts`
- change `apps/api/src/modules/photos/photos.module.ts`, `photos.service.ts`
- change `apps/api/src/modules/submissions/submissions.service.ts`, `submission.response.ts` (`slug` in the summary)
- change `apps/api/src/app.module.ts`
- create `apps/api/test/public-page.int.test.ts`
- change `apps/api/CLAUDE.md` (modules: `instruments`, `review`)

## Constraints

- `GET /instruments/:slug` is `@Public()`; `InstrumentSlugParam`. `PublishedInstrumentsQuery` (design doc I1) is the only public read of content: `instruments.slug = $1` joined through `published_revision_id` with the child rows, the room and the reviewer's name, in one query; no match → 404 `NOT_FOUND`. It builds the response with the S04.1 display mapping and sets `lastApproved` from `reviewed_at` and the reviewer.
- `PublishedInstrumentsQuery` also answers whether a photo id is a published revision's photo. `PhotosService.read` serves such a photo to anyone; otherwise the E03 rule (owner or admin, else 404) is unchanged (E04-D7, I11). `PhotosModule` imports `InstrumentsModule`; no cycle.
- `listMine` and `read` add the instrument's slug only for `APPROVED` revisions, in the same query (a join, no query in a loop).
- No contributor, email, note or `version` in the public response; test it on the raw body.
- Integration tests titled `S04.2 AC<n>`: the public body and the anonymous photo (AC4); an unknown and an unpublished slug → 404 (AC6); `slug` in "My submissions" and in `GET /submissions/:id` (AC10); the anonymous checks before and after approval and another pending page staying 404 (AC12).
- Schema change: no.

## Out of scope

Rejected pages and replaced photos (S04.3).

## Implementation notes

**Files changed:**

apps/api/src/modules/instruments/instruments.module.ts
apps/api/src/modules/instruments/instruments.controller.ts
apps/api/src/modules/instruments/published-instruments.query.ts
apps/api/src/modules/instruments/published-safety-page.response.ts
apps/api/src/modules/photos/photos.module.ts
apps/api/src/modules/photos/photos.service.ts
apps/api/src/modules/submissions/submissions.service.ts
apps/api/src/modules/submissions/submission.response.ts
apps/api/src/app.module.ts
apps/api/test/public-page.int.test.ts
apps/api/CLAUDE.md

**Differences from the ticket:**

- **No existing test changed.** Every existing assertion of `slug: null` is on a pending page and stays true.
- One extra file, `published-safety-page.response.ts`, holds `toPublishedSafetyPageResponse(slug, revision)` (rule "map with a `to<Name>Response()`"). It reuses S04.1's `toSafetyPageDisplay` and sets `lastApproved` from `reviewed_at` and the reviewer's name.
- `PublishedInstrumentsQuery.findBySlug` starts from `instrument_revisions` and inner-joins `instruments` on `instrument.id = revision.instrument_id AND instrument.published_revision_id = revision.id`, filtered by `instrument.slug` (unique index) and also `revision.status = 'APPROVED'`, as a second guard for I2. `isPublishedPhoto(photoId)` is the same join filtered by `revision.photo_id` (indexed), then the instrument's primary key, so no new index is needed. E05 adds `deleted_at IS NULL` to both.
- `PhotosService.read`: an approved admin and anyone asking for a published revision's photo get any row. Another approved account gets only its own photo. Everyone else gets 404, as before. The check runs in the private `readableWhere`. For a non-admin caller it costs one extra `EXISTS` query.
- `listMine` gets the slug through a `relations: { instrument: true }` join selecting only `instrument.id` and `instrument.slug`. `GET`/`PUT /submissions/:id` get it through an inner join in `loadSubmission`. The mappers give the slug only for an `APPROVED` revision (`slugOf`), so later a pending or rejected revision of a published instrument answers `null`. `submitNew` passes `null`.
- `InstrumentSlugParam` limits a slug to 1–200 characters, so a slug longer than 200 answers 400 `VALIDATION_FAILED`, not 404. Any slug in the wrong form within that length answers 404. Both are tested under AC6.
- The public route sets no cache headers. The photo keeps E03's `Cache-Control: private, no-cache`, also when it is public.
- Extra tests beyond the ticket: a non-author contributor reads the public page and photo (AC4); an unsubmitted photo of the author stays private after approval, and the E03 rule still holds for a pending page's photo (AC12).
