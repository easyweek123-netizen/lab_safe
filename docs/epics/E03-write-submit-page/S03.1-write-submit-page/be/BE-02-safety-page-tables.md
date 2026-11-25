---
id: BE-02
story: S03.1
layer: be
status: done
depends_on: [BE-01]
covers: [AC12, AC13]
updated: 2026-11-24
---

# BE-02 Safety page tables and entities

**Goal:** create the `photos`, `instruments`, `instrument_revisions`, `revision_hazards` and `revision_protective_equipment` tables and their entities, with the database half of R3, R4 and R5. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/photos/photo.entity.ts`
- create `apps/api/src/modules/instruments/instrument.entity.ts`, `instrument-revision.entity.ts`, `revision-hazard.entity.ts`, `revision-protective-equipment.entity.ts`
- create `apps/api/src/db/migrations/<timestamp>-CreateSafetyPageTables.ts`; change `apps/api/src/db/migrations/index.ts`
- create `apps/api/test/safety-page-tables.int.test.ts`

## Constraints

- Tables, columns, keys and CHECKs exactly as in [design.md "Data"](../../design.md#data) and the content columns of design doc §3, and only those (decision E03-D6: no `slug`, `published_revision_id`, review or `deleted_at` columns yet).
- Foreign keys: `photos.owner_id`, `instruments.created_by`, `instrument_revisions.submitted_by` → `users`; `instrument_revisions.instrument_id` → `instruments`; `photo_id` → `photos`; `lab_room_id` → `lab_rooms`; all `ON DELETE RESTRICT`, except the two child tables → `instrument_revisions` `ON DELETE CASCADE`. Indexes on `instrument_revisions.submitted_by` and `instrument_revisions.instrument_id`.
- The value CHECKs are built by the entities from the shared constants (`CATEGORIES`, `HAZARD_LEVELS`, `REVISION_KINDS`, `REVISION_STATUSES`, `HAZARD_TYPES`, `PROTECTIVE_EQUIPMENT`, `HAZARD_PICTOGRAMS`, `EMERGENCY_EQUIPMENT`), following `apps/api/src/modules/users/user.entity.ts`. The entities mirror the migration exactly, including constraint names, so a later `db:generate` finds no change.
- The two child tables use the composite keys of the design doc, with no own id or timestamps: the recorded exception in design.md "Data".
- The integration test proves: the schema-builder check finds nothing pending (as in `meta.int.test.ts`); the CHECK lists equal the shared constants; a direct insert is refused for training with Low (AC12), a value outside each fixed list, an unknown lab room, a blank required text and an incomplete `emergency_equipment` (AC13); deleting a revision removes its child rows. Titles start with `S03.1 AC<n>`.
- `bytes` is never loaded unless asked for (`select: false` or an explicit select), so list queries never read photos.
- Schema change: yes, migration `CreateSafetyPageTables`. Generating it with `db:generate` needs the development database and the user's approval; writing it by hand, like `CreateLabRooms`, is fine. The user approves the file before `pnpm db:migrate` runs it.

## Out of scope

Services and endpoints (BE-03, BE-04).

## Implementation notes

**Files changed:**

- apps/api/src/modules/photos/photo.entity.ts
- apps/api/src/modules/instruments/instrument.entity.ts
- apps/api/src/modules/instruments/instrument-revision.entity.ts
- apps/api/src/modules/instruments/revision-hazard.entity.ts
- apps/api/src/modules/instruments/revision-protective-equipment.entity.ts
- apps/api/src/db/sql-list.ts
- apps/api/src/modules/users/user.entity.ts
- apps/api/src/db/migrations/1795541562254-CreateSafetyPageTables.ts
- apps/api/src/db/migrations/index.ts
- apps/api/test/safety-page-tables.int.test.ts

**Differences from the ticket:**

- The training CHECK reads `(training_required AND training_given_by IS NOT NULL AND btrim(training_given_by) <> '') OR (NOT training_required AND training_given_by IS NULL)`. The design.md text leaves out `IS NOT NULL`, and then a NULL trainer with training required makes the CHECK NULL, so the row would pass. The generated migration was changed by hand to match the entity; the constraint name is the same.
- Extra CHECKs that the design does not list: `instrument_revisions_emergency_equipment_check` also requires `jsonb_typeof(emergency_equipment) = 'object'`; `photos_content_type_check` (`content_type = 'image/jpeg'`) and `photos_size_check` (`width > 0 AND height > 0`). The database checks only that required texts are not blank. Length limits stay in the shared schema, as design.md "Data" says.
- No `search_vector` column (design doc §3). It belongs to the search epics, E06 and E07.
- No column defaults except `id` and the timestamps. The service writes every column.
- `sqlList` moved from `user.entity.ts` to `src/db/sql-list.ts`, next to `valuesOf`, so every entity builds its CHECKs the same way.
- No module registers the new entities yet: the app uses `autoLoadEntities`, so they load once BE-03 and BE-04 add `TypeOrmModule.forFeature`. Until then the integration test opens its own `DataSource` on `labsafe_test` with every related entity, and runs the schema-builder check there.
- `InstrumentRevision` has `OneToMany` `hazards` and `protectiveEquipment` (no cascade options), so BE-04 can load the child rows with a join.
