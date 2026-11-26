---
id: FE-01
story: S04.4
layer: fe
status: done # todo | doing | done
depends_on: []
covers: [AC1, AC2, AC3]
updated: 2026-11-26
---

# FE-01 Photo control fixes

**Goal:** a failed photo change is announced on the control a keyboard user reaches, the summary's "Photo" link focuses it, and a new upload clears the old failure message (S03.1 F1, B1). **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/components/safety-page-form/PhotoField.tsx`, `PhotoField.test.tsx`
- change `apps/web/src/components/safety-page-form/IdentitySection.tsx`
- change `apps/web/src/components/safety-page-form/SafetyPageForm.tsx`
- change `apps/web/src/pages/new-safety-page/NewSafetyPagePage.test.tsx` and `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx` (the form-level cases)

## Constraints

- The fix described in S03.1 review F1: while a photo is shown, the element the summary targets (`fieldId('photoId')`) is "Change photo", described by the hint and the message; the hidden input gets another id. "Change photo" keeps its accessible name; the e2e helpers find it by that name.
- The message is announced when it appears (a polite live region), without a second `alert` competing with the form's.
- The form clears its failure `alert` when an upload starts; computed through a callback, not a `useEffect`.
- Component tests titled `S04.4 AC<n>`: the description and announcement with a photo shown, the old photo kept (AC1); the summary link's focus with and without a photo (AC2); an offline submit, then a refused upload: one message only, and a successful upload also clears it (AC3).
- Schema change: no.

## Out of scope

The wording (FE-02). S03.1 F2.

## Implementation notes

**Files changed:**

- apps/web/src/components/safety-page-form/PhotoField.tsx
- apps/web/src/components/safety-page-form/PhotoField.test.tsx
- apps/web/src/components/safety-page-form/IdentitySection.tsx
- apps/web/src/components/safety-page-form/SafetyPageForm.tsx
- apps/web/src/pages/new-safety-page/NewSafetyPagePage.test.tsx
- apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx

**What was built:**

- `PhotoField`: while a photo is shown, "Change photo" has the field id (`fieldId('photoId')`) and `aria-describedby` "<id>-hint <id>-error"; the hidden file input becomes `<id>-file`, and the "Photo" label follows the input, so "Change photo" keeps its name and `getByLabel('Photo')` still finds the input. With no photo, the input keeps the id, hint and message as in E03. The message sits in an always-present `aria-live="polite"` region (no role, so it doesn't compete with the form's `alert` or the "Uploading photo…" `status`).
- `PhotoField` calls a new `onFileChosen` prop whenever a file is chosen; `IdentitySection` passes it through as `onPhotoChosen`; `SafetyPageForm` passes `() => setFailure(null)`. No effect.

**Tests added (none existing changed):** `PhotoField.test.tsx`: three `S04.4 AC1` cases (refused change with a photo shown: live region present before, description and focus on "Change photo", old photo kept, no `alert`; the field id and the form's own message on "Change photo"; no photo: the input keeps id, hint and message). `NewSafetyPagePage.test.tsx`: `S04.4 AC2` with and without a photo, `S04.4 AC3` offline submit then refused photo, and then a successful upload. `EditSafetyPagePage.test.tsx`: `S04.4 AC1` in the fix form and the edit form, `S04.4 AC2` in the fix form, `S04.4 AC3` offline resubmit then refused photo, offline save then successful upload. The AC3 tests check that the alert is gone, not its wording, so FE-02 doesn't touch them.

**Differences from the ticket:**

- The failure `alert` is cleared when a file is chosen, not only when an upload request starts, so a file over 5 MB (refused in the browser, never uploaded) also clears it (AC3 "Choosing any new photo clears the old failure alert").
- `aria-invalid` stays on the (hidden) file input only; it is not put on the "Change photo" button, which is not an input. The message is in its description.
- No Playwright spec: this ticket doesn't complete the story's main path (FE-02 changes `network-drop.spec.ts`); the e2e helpers still find the input by the label "Photo" and the button by "Change photo".
- After a failed submit with a server `photoId` message, that message is both in the summary `alert` and in the photo's polite live region, so a screen reader may read it twice; left as is (simplest safe option).
