---
id: BE-02
story: S04.2
layer: be
status: done # todo | doing | done
depends_on: []
covers: [AC3]
updated: 2026-11-26
---

# BE-02 Review and publishing columns

**Goal:** the epic's one migration adds the slug, the published pointer, the review columns and `version`, with the constraints that keep a published page consistent. **Contract:** [design.md](../../design.md#data-models)

## Files

- change `apps/api/src/modules/instruments/instrument.entity.ts`, `instrument-revision.entity.ts`
- create `apps/api/src/db/migrations/<timestamp>-AddReviewAndPublishing.ts` (generated)
- change `apps/api/src/db/migrations/index.ts`
- create `apps/api/test/review-tables.int.test.ts`

## Constraints

- `instruments`: `slug` text null, unique `instruments_slug_key`, CHECK `instruments_slug_check` (lowercase letters and digits in hyphen-separated groups); `published_revision_id` uuid null with the composite foreign key `(id, published_revision_id) → instrument_revisions (instrument_id, id)` `ON DELETE RESTRICT`; CHECK `instruments_published_check` (both null or both set).
- `instrument_revisions`: `reviewed_by` uuid null → `users` (`ON DELETE RESTRICT`), `reviewed_at` timestamptz null, `review_note` text null, `version` integer not null default 1 with CHECK `>= 1` (a plain column, not TypeORM's `@VersionColumn`); `UNIQUE (instrument_id, id)`; CHECK `instrument_revisions_review_check` as in the design's rule table; indexes on `(status, submitted_at)` and on `photo_id`.
- Entities mirror the migration with identical constraint names (pattern: E03's entities and `CreateSafetyPageTables`). If TypeORM can't express the composite foreign key, follow the design's "Risks" fallback and write it in the notes.
- Generate with `pnpm --filter @labsafe/api db:generate src/db/migrations/AddReviewAndPublishing` only with the user's approval; read every line, check `down`, add it to `ALL_MIGRATIONS`. **The user approves the file before `pnpm db:migrate` runs it.**
- Integration tests titled `S04.2 AC3`: each refused row from AC3 by its constraint name; an E03-style pending row still inserts with `version` 1; the schema builder finds no change (pattern: `safety-page-tables.int.test.ts`).
- Schema change: yes, migration `AddReviewAndPublishing`.

## Out of scope

Writing these columns from the services (BE-03, BE-04, S04.3).

## Implementation notes

**Files changed:**

apps/api/src/modules/instruments/instrument.entity.ts
apps/api/src/modules/instruments/instrument-revision.entity.ts
apps/api/src/db/migrations/1795653173748-AddReviewAndPublishing.ts
apps/api/src/db/migrations/index.ts
apps/api/test/review-tables.int.test.ts
apps/api/test/safety-page-tables.int.test.ts
apps/api/test/review-queue.int.test.ts
apps/api/test/submission-edit.int.test.ts

**Differences from the ticket:**

- **The composite foreign key works in TypeORM; no fallback was needed.** `Instrument.publishedRevision` is a `@ManyToOne` with the array `@JoinColumn([{ name: 'id', referencedColumnName: 'instrumentId' }, { name: 'published_revision_id', referencedColumnName: 'id' }])`, named `instruments_published_revision_fkey`. It generates `FOREIGN KEY ("id", "published_revision_id") REFERENCES "instrument_revisions"("instrument_id","id") ON DELETE RESTRICT`. The relation only declares the key; services read and write the `publishedRevisionId` column. Existing instrument inserts still work, and the schema builder finds no difference.
- **One line of the generated migration was corrected by hand:** TypeORM's `ADD COLUMN` path named the slug's unique constraint `UQ_dfe42ec06030135da1c26cf9d20` and ignored the `@Unique('instruments_slug_key')` name. Both `up` and `down` now use `instruments_slug_key`. The file was also formatted with prettier and its import changed to `import type`, as in the earlier migrations. The migration is not on `master`.
- Constraint and index names that the ticket did not give: `instrument_revisions_version_check`, `instrument_revisions_reviewed_by_fkey`, `instrument_revisions_instrument_id_id_key`, `instrument_revisions_status_submitted_at_idx`, `instrument_revisions_photo_id_idx`.
- `instrument_revisions_review_check` follows the design's rule table, which is stricter than AC3's list: a `PENDING` revision also may not have a reviewer or a review date (S04.3's resubmission clears them, E04-D5). `instruments_slug_check` is `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'` and has no length limit; BE-03's `slugify` keeps the part made from the name to at most 80 characters.
- **Existing tests whose fixtures or exact schema lists the new schema changes** (no assertion was removed or loosened):
  - `safety-page-tables.int.test.ts`: the exact-columns test now also lists the six new columns, and its title says so. The index test now also lists the three new indexes.
  - `review-queue.int.test.ts` (S04.1 AC1, AC4) and `submission-edit.int.test.ts` (S03.2 AC5): their raw SQL fixture set `status = 'REJECTED'` with no reviewer, date or note. The review CHECK now refuses that, so the fixture writes a valid rejected row (the admin as reviewer, `now()`, a note).
- AC3's "`down` undoes the migration" is tested by running `down` inside a rolled-back transaction and comparing the columns, constraints and indexes from before and after.
