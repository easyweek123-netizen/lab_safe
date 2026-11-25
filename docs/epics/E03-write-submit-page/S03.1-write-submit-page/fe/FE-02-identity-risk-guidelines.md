---
id: FE-02
story: S03.1
layer: fe
status: done
depends_on: [FE-01]
covers: [AC1, AC2, AC3]
updated: 2026-11-24
---

# FE-02 Identity, Risk at a glance and Guidelines sections

**Goal:** the form groups Identity, Risk at a glance and Guidelines exist as fields of one react-hook-form form, with the R5 definitions and the guideline prompts. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/components/safety-page-form/form-values.ts` (the form's value type, its empty defaults, and the mapping to and from `SafetyPageContent`)
- create `apps/web/src/components/safety-page-form/IdentitySection.tsx`, `RiskSection.tsx`, `GuidelinesSection.tsx`
- create `apps/web/src/components/safety-page-form/sections.test.tsx` (sections rendered inside a test form)
- change `apps/web/src/components/TextField.tsx` only if a hint or a multi-line variant is needed; otherwise add a small `TextArea` next to it

## Constraints

- Each section is a `fieldset` with a `legend` (or a heading) named exactly as the group in AC1, and reads the form through react-hook-form's context, so FE-04 composes them.
- Identity: name, the photo field from FE-01, manufacturer, model, category (select), lab room (select from `useMetaLists`), short description (with the hint "What it does, in 1–3 sentences"), responsible person's name and contact.
- Risk at a glance: hazard level as three radio buttons labelled Low, Medium, High, with the three R5 definitions word for word from PRD R5 beside them (web constants); training required Yes/No radios and "Who gives the training", shown only for Yes (AC3). The level is never shown by colour alone.
- Guidelines: four text areas in the order of AC1, each labelled with its section name and its PRD §4.1 prompt as a hint ("Training, inspection, PPE, ventilation, setup" and so on).
- List options come only from `GET /api/meta/lists` and the shared constants, in their order; no "other" or free-text option (AC2).
- Labels on every input, messages as the input's description, 16 px text, nothing wider than 375 px.
- Component tests titled `S03.1 AC<n>` for the parts of AC1–AC3 these sections hold.
- Schema change: no.

## Out of scope

Hazards, PPE, pictograms and emergency info (FE-03). Submitting and the error summary (FE-04).

## Implementation notes

**Files changed:**

- apps/web/src/components/TextField.tsx
- apps/web/src/components/TextArea.tsx
- apps/web/src/components/safety-page-form/form-values.ts
- apps/web/src/components/safety-page-form/SectionFieldset.tsx
- apps/web/src/components/safety-page-form/SelectField.tsx
- apps/web/src/components/safety-page-form/RadioGroup.tsx
- apps/web/src/components/safety-page-form/hazard-level-definitions.ts
- apps/web/src/components/safety-page-form/IdentitySection.tsx
- apps/web/src/components/safety-page-form/RiskSection.tsx
- apps/web/src/components/safety-page-form/GuidelinesSection.tsx
- apps/web/src/components/safety-page-form/sections.test.tsx

**Differences from the ticket:**

- Each group is a `fieldset` whose `legend` holds an `h2` (`SectionFieldset`). That gives both the named group and the heading AC1 asks for.
- `TextField` gained an optional `hint` (`<id>-hint`, read before the message as the description) and `required` (`aria-required`). A new `TextArea` sits next to it. Two small helpers were added to the form folder: `SelectField` (a disabled prompt option first, then only the list's options) and `RadioGroup` (`role="radiogroup"`, each choice labelled in words, with an optional description per choice).
- `form-values.ts`: the form's field names are the contract's, so issue paths map straight onto fields. `toContent` leaves out an unchosen select or radio so the schema reports its own message. It sends `trainingGivenBy` as null unless training is Yes (AC3). Training is held as `'' | 'yes' | 'no'`. `fromContent` is for S03.2. `fieldId(path)` gives the input id `page-<path with dots as dashes>` (for example `page-photoId`, which matches FE-01). For a radio group, that id belongs to the first radio, and the other radios use `<id>-<value>`. FE-04's error summary links to it. FE-03 extends the type, the defaults and both mappings.
- The R5 definitions are in `hazard-level-definitions.ts`, word for word from PRD R5 with the first letter capitalised. Each one is the description of its radio.
- Lab room options read "Teaching lab 1 (LAB-101)" (name, then code).
- `sections.test.tsx` also has two AC9 tests: messages are the inputs' descriptions, and the ids match what the summary links to. It also maps the empty form through `SafetyPageContent` to show that the schema names every field in these sections.

**Verification (2026-11-24):** `pnpm verify` passes (web 153 tests, api 133, shared 125). The ticket has no e2e spec.
