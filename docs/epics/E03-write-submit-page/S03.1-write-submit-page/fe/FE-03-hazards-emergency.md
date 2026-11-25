---
id: FE-03
story: S03.1
layer: fe
status: done
depends_on: [FE-02]
covers: [AC1, AC2, AC3]
updated: 2026-11-24
---

# FE-03 Hazards and protection, and Emergency info sections

**Goal:** the form groups Hazards and protection and Emergency info exist, with notes per hazard and PPE item, the "none" choices, GHS symbols with names, and a location or "Not applicable" per emergency item. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/components/safety-page-form/HazardsSection.tsx` (hazard types, "No significant hazards", GHS pictograms, PPE items, "No PPE beyond standard lab attire")
- create `apps/web/src/components/safety-page-form/EmergencySection.tsx`
- create `apps/web/src/assets/ghs/` (the nine pictogram SVGs) and `apps/web/src/components/safety-page-form/ghs-symbols.ts` (value → image, with the source in a comment)
- change `apps/web/src/components/safety-page-form/form-values.ts`
- create `apps/web/src/components/safety-page-form/hazards-emergency.test.tsx`

## Constraints

- Hazard types and PPE items are checkbox lists from the shared lists in PRD order. A ticked hazard shows its required note input (labelled per hazard, for example "How does the Electrical hazard arise?"); a ticked PPE item shows its optional note ("Note for Lab coat, optional"). "No significant hazards" and "No PPE beyond standard lab attire" are separate checkboxes and stay usable when items are ticked: the form refuses both on submit (design open question 6).
- GHS pictograms: checkboxes whose label holds the symbol (`alt=""`, decorative) and the name, as in design "Screens". Source: the official UNECE GHS pictograms (design open question 4).
- Emergency info: the emergency phone number first, then the six items of `EMERGENCY_EQUIPMENT` in order, each a location input and a "Not applicable" checkbox; ticking it clears and disables the location (AC3).
- `form-values.ts` maps these choices to the contract's `hazards`, `protectiveEquipment`, `pictograms` and `emergencyEquipment` shapes and back, so issue paths such as `hazards.2.note` and `emergencyEquipment.EYEWASH` can be shown on their inputs (FE-04).
- Lists wrap at 375 px; touch targets at least 44 px; labels on every input.
- Component tests titled `S03.1 AC<n>` for the parts of AC1–AC3 these sections hold, and for the mapping.
- Schema change: no.

## Out of scope

Submitting, the error summary and the page (FE-04).

## Implementation notes

**Files changed:**

- apps/web/src/assets/ghs/explosive.svg
- apps/web/src/assets/ghs/flammable.svg
- apps/web/src/assets/ghs/oxidizing.svg
- apps/web/src/assets/ghs/compressed-gas.svg
- apps/web/src/assets/ghs/corrosive.svg
- apps/web/src/assets/ghs/toxic.svg
- apps/web/src/assets/ghs/harmful-irritant.svg
- apps/web/src/assets/ghs/health-hazard.svg
- apps/web/src/assets/ghs/environmental-hazard.svg
- apps/web/src/components/TextField.tsx
- apps/web/src/components/safety-page-form/ghs-symbols.ts
- apps/web/src/components/safety-page-form/form-values.ts
- apps/web/src/components/safety-page-form/Checkbox.tsx
- apps/web/src/components/safety-page-form/CheckboxWithNote.tsx
- apps/web/src/components/safety-page-form/ChoiceGroup.tsx
- apps/web/src/components/safety-page-form/HazardsSection.tsx
- apps/web/src/components/safety-page-form/EmergencySection.tsx
- apps/web/src/components/safety-page-form/hazards-emergency.test.tsx
- apps/web/src/components/safety-page-form/sections.test.tsx

**Differences from the ticket:**

- The SVGs are the UNECE pictograms as public-domain files from Wikimedia Commons (`GHS-pictogram-explos.svg` and the others), unchanged. Their source is in the comment in `ghs-symbols.ts`. They were checked for scripts and external references and have none.
- `form-values.ts` keeps `hazards`, `pictograms` and `protectiveEquipment` in the contract's shape (`{ type, note }[]`, `HazardPictogram[]`, `{ item, note }[]` with `''` for no note). The helpers `toggleHazard`, `togglePictogram` and `toggleProtectiveEquipment` keep them in PRD order, and so does `toContent`. The index in an issue path such as `hazards.2.note` is therefore the same in the form and the content, and FE-04 can call `setError(path)` without mapping. `emergencyEquipment` is held as `{ location, notApplicable }` per item. `toContent` sends `NOT_APPLICABLE` or `LOCATION` with the typed location. An empty location lets the schema report `emergencyEquipment.<KEY>`. `fromContent` maps back.
- Ids for the error summary, using `fieldId`:
  - The first checkbox of a list gets the field's id (`page-hazards`, `page-pictograms`, `page-protectiveEquipment`). The other checkboxes use `<id>-<VALUE>`.
  - A note input gets the id of its issue path (`page-hazards-1-note`).
  - An emergency item's location input is `page-emergencyEquipment-<KEY>`, and its "Not applicable" checkbox is `<that id>-not-applicable`.
  - A message for a whole list (for example `hazards`) is the description of the list's `fieldset`.
- Three small helpers in the form folder: `Checkbox` (the whole row is the label, at least 44 px high), `CheckboxWithNote` (shows the note input when the box is ticked) and `ChoiceGroup` (a named `fieldset` for a list, with an optional hint and message; only the pictograms use two columns from `sm` up).
- Labels:
  - The list groups are "Hazards" (hint "Tick every hazard of this instrument and say how it arises."), "GHS pictograms (optional)" and "Personal protective equipment (PPE)".
  - Each emergency item is a `fieldset` named after the item, with the location input "Where is the <item>?" and the checkbox "Not applicable".
- `TextField` gained an optional `disabled` prop, used for an emergency location while "Not applicable" is ticked.
- `sections.test.tsx`: the FE-02 round-trip test (`fromContent` → `toContent`) now also expects the new fields. No assertion was removed.

**Verification (2026-11-24):** `pnpm verify` passes (web 168 tests, api 133, shared 125; docs-check OK). This ticket doesn't complete the main path, so it has no e2e spec and `pnpm e2e` was not run.
