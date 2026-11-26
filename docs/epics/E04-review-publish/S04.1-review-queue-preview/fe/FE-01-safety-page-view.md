---
id: FE-01
story: S04.1
layer: fe
status: done # todo | doing | done
depends_on: [BE-01]
covers: [AC5]
updated: 2026-11-25
---

# FE-01 Safety page view

**Goal:** one `SafetyPageView` component renders a `SafetyPageDisplay` as the public page will, for the preview now and `/instruments/:slug` in S04.2. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/components/safety-page-view/SafetyPageView.tsx` and its parts (at-a-glance block, hazard level badge, guideline sections, emergency information), one component per file
- create `apps/web/src/components/safety-page-view/SafetyPageView.test.tsx`
- change `apps/web/src/components/safety-page-form/ghs-symbols.ts` only to move it where both folders can share it (then update its imports)
- change `apps/web/CLAUDE.md` (layout: `safety-page-view/`)

## Constraints

- Props: the `SafetyPageDisplay` and the title's heading level (1 on the public page, 2 in the preview); headings below it follow in order. Nothing else changes between the two uses.
- The order and texts of AC5. Labels from the shared lists in `packages/shared/src/lists.ts`; the "Last approved <date> by <name>" line only when `lastApproved` is set, with the `MySubmissions` date format.
- The hazard level is a word with a decorative icon (an inline SVG with `aria-hidden`), never colour alone. GHS symbols as in the form (`alt=""`, the name next to it).
- The emergency number is a `tel:` link only when it holds nothing but digits, spaces, `+`, `-`, `(` and `)`; otherwise plain text (design "Security").
- Texts as React text with kept line breaks; never `dangerouslySetInnerHTML`.
- Phone first: the at-a-glance block is compact (names only, wrapping), before the photo; nothing wider than 375 px; text at least 16 px.
- Component tests titled `S04.1 AC5`, one per detail of AC5 (order, "none" choices, training no, empty optional fields, HTML as text, no contributor).
- Schema change: no.

## Out of scope

The pages that use the view (FE-03; the public page in S04.2).

## Implementation notes

**Files changed:**

apps/web/src/components/safety-page-view/SafetyPageView.tsx
apps/web/src/components/safety-page-view/SafetyPageView.test.tsx
apps/web/src/components/safety-page-view/AtAGlance.tsx
apps/web/src/components/safety-page-view/HazardLevelBadge.tsx
apps/web/src/components/safety-page-view/NameList.tsx
apps/web/src/components/safety-page-view/EmergencyPhone.tsx
apps/web/src/components/safety-page-view/PageDetails.tsx
apps/web/src/components/safety-page-view/HazardDetails.tsx
apps/web/src/components/safety-page-view/PictogramList.tsx
apps/web/src/components/safety-page-view/ProtectiveEquipmentDetails.tsx
apps/web/src/components/safety-page-view/GuidelineSection.tsx
apps/web/src/components/safety-page-view/EmergencyInformation.tsx
apps/web/src/components/safety-page-view/ViewSection.tsx
apps/web/src/components/safety-page-view/ViewText.tsx
apps/web/src/components/safety-page-view/Heading.tsx
apps/web/src/components/safety-page-view/labels.ts
apps/web/src/components/ghs-symbols.ts (moved from apps/web/src/components/safety-page-form/ghs-symbols.ts)
apps/web/src/components/safety-page-form/HazardsSection.tsx
apps/web/src/components/safety-page-form/hazards-emergency.test.tsx
apps/web/src/components/format-date.ts
apps/web/src/pages/contribute/MySubmissions.tsx
apps/web/src/test/msw.ts
apps/web/CLAUDE.md

**Differences from the ticket:**

- `ghs-symbols.ts` moved to `src/components/`; only its import paths changed.
- The "My submissions" date format moved into `src/components/format-date.ts` (`formatDate`), used by `MySubmissions` and the "Last approved" line, so FE-02's queue can share it. `MySubmissions.tsx` and its output are otherwise unchanged.
- `src/test/msw.ts` gains a `rotavapDisplay` fixture (`rotavapContent` with lab room `LAB-101`, never approved) for FE-01 and FE-03.
- Section headings under the title: "At a glance", "Hazards", "GHS pictograms" (left out when empty), "Protective equipment", "Before use", "Safe operation", "Do NOT", "Emergency & first aid", each one level below the title. Category, lab room, short description and responsible person/contact sit without a heading between the photo and "Hazards" (two `dl`s and the description).
- Visible texts not fixed by AC5: "Manufacturer: …", "Model: …", the terms "Category", "Lab room", "Responsible person", "Contact", "Emergency phone number: …", the at-a-glance labels "Hazards:" and "Protective equipment:", and the photo's alt "Photo of <name>".
- The emergency number appears twice as a `tel:` link (at a glance and in Emergency & first aid), with spaces and brackets removed from the `href`.
- The hazard level icon is three bars, one, two or three filled (shape, not colour).
- "Last approved <date> by <name>" goes last, after Emergency & first aid, as in design "Screens" (AC5's order doesn't place it).
