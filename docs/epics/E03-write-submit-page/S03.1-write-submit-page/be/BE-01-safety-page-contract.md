---
id: BE-01
story: S03.1
layer: be
status: done
depends_on: []
covers: [AC9, AC10, AC11, AC12, AC13]
updated: 2026-11-24
---

# BE-01 Safety page contract

**Goal:** create the story's shared contract: the list enums, the photo and submission schemas, and the `SafetyPageContent` schema that names every missing or invalid field at once. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `packages/shared/src/lists.ts`, `packages/shared/src/errors.ts`, `packages/shared/src/index.ts`
- create `packages/shared/src/schemas/safety-page.ts`, `packages/shared/src/schemas/safety-page.test.ts`
- create `packages/shared/src/schemas/photos.ts`
- create `packages/shared/src/schemas/submissions.ts`, `packages/shared/src/schemas/submissions.test.ts`

## Constraints

- The contract is exactly the story's "API contract", with its field names, limits and messages. Follow `schemas/auth.ts`: schema and type share a name; the value lists are exported constants, because BE-02 builds the database CHECKs from them.
- The new Zod enums in `lists.ts` are built from the existing constants' values, so a list has one source. Add `EMERGENCY_EQUIPMENT` in PRD order with value and label, like the other lists.
- Every text is trimmed before its length is checked, so spaces only count as missing; empty optional texts become null; `trainingGivenBy` is null when training is not required.
- The cross-field rules (hazards or "No significant hazards", PPE or "standard lab attire only", training needs a trainer, training with Low) must be reported **together with** every other problem in one parse (design E03-D2). Zod skips object refinements when a child failed unless told otherwise: follow the `when` option used in `apps/api/src/common/config.ts`, and write the rules so they never throw on missing or wrongly typed input.
- Issue paths are the contract's field paths (`hazards.2.note`, `emergencyEquipment.EYEWASH`), because the web maps them to inputs and the summary.
- `Submission.content` reuses `SafetyPageContent`, so a stored page parses with the same schema in the browser.
- Add `PHOTO_TOO_LARGE` and `PHOTO_TYPE` to `ErrorCode` only.
- The unit tests prove: `{}` gives one issue per required field of AC9 at once; each gap of AC10 alone gives exactly its issue; both pairs of AC11; AC12 on `hazardLevel`; AC13's out-of-list values, duplicates and limits; spaces only count as missing; a complete page parses. Titles start with `S03.1 AC<n>`.
- Schema change: no.

## Out of scope

Database tables (BE-02), endpoints (BE-03, BE-04). `SubmissionIdParam` (S03.2).

## Implementation notes

**Files changed:**

- packages/shared/src/lists.ts
- packages/shared/src/errors.ts
- packages/shared/src/index.ts
- packages/shared/src/schemas/safety-page.ts
- packages/shared/src/schemas/safety-page.test.ts
- packages/shared/src/schemas/photos.ts
- packages/shared/src/schemas/submissions.ts
- packages/shared/src/schemas/submissions.test.ts

**Differences from the ticket:**

- Messages the contract leaves open: limits read "<Label> must be at most n characters" with the plain number (`4000`), using the labels Name, Manufacturer, Model, Short description, Responsible person's name, Responsible person's contact, Who gives the training, Before use, Safe operation, Do NOT, Emergency & first aid, Emergency phone number, Hazard note (300), PPE note (200), Location (200). Values outside a list: "Choose a hazard type / PPE item / pictogram from the list" on `hazards.<i>.type`, `protectiveEquipment.<i>.item`, `pictograms.<i>`.
- Paths of the rules the contract places on a row: the AC11 contradictions are on `noSignificantHazards` and `standardLabAttireOnly`; duplicates on `hazards`, `pictograms`, `protectiveEquipment`; every emergency problem, including a too-long location, on `emergencyEquipment.<KEY>`.
- `hazards`, `pictograms`, `protectiveEquipment` default to `[]` and the two "none" booleans to `false`, so `{}` gives exactly the AC9 list (no extra entries for the booleans). A missing `emergencyEquipment` is checked as `{}`, giving one entry per item.
- Also exported for the web and BE-04: `HazardEntry`, `ProtectiveEquipmentEntry`, `EmergencyEquipmentEntry`, `EmergencyEquipment`, `EmergencyEquipmentValue`. The tests live in `packages/shared/src/schemas/` as the ticket's file list says, not in `apps/api/test/`.
