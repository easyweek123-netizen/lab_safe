---
id: S04.4
epic: E04
title: Clearer photo and failure messages in the form
type: feature
status: done # draft | building | in-review | qa | done
covers: [US9]
points: 2
updated: 2026-11-26
---

# S04.4 Clearer photo and failure messages in the form

| **Status** | see `status:` above |
| --- | --- |
| **Story points** | see `points:` above |
| **Epic criteria** | C16, C17, C18 (the E03 known gaps S03.1 F1, S03.1 B1 and the "submit again" wording) |
| **Design** | [design.md](../design.md) |
| **UX/UI designs** | none |
| **Dependencies** | S04.3 (the fix form, where an admin's note often asks for a better photo) |

## User story

As a contributor fixing a rejected page, often with a new photo, I want every photo problem announced where I am and every failure message to fit the button I pressed, so that I know what went wrong and what to do, also with a keyboard or a screen reader.

## Acceptance criteria

- **AC1** Given the fix form with a photo shown (the same on the new-page form after an upload and on the edit form), When the contributor changes the photo to a PDF renamed to `.jpg`, Then "Only JPEG or PNG photos are accepted." appears next to the photo, is announced when it appears, and is the description of the "Change photo" button a keyboard user reaches; the old photo stays.
  - "Change photo" keeps its name; the hint "JPEG or PNG, at most 5 MB" stays part of its description.
  - With no photo shown, the file input keeps the hint and the message as in E03.
- **AC2** Given a photo shown and a server answer 400 with `fields: photoId`, When the contributor follows "Photo" in the error summary, Then focus moves to "Change photo"; with no photo shown, the link moves focus to the file input as before.
- **AC3** Given a submit (or save, or resubmit) that failed offline with its `alert`, When the contributor is back online and chooses a photo that is refused, Then only the photo's message is shown and the old failure `alert` is gone.
  - Choosing any new photo clears the old failure `alert`, also when the upload then succeeds.
- **AC4** Given the new-page form, the edit form and the fix form, When saving or submitting fails offline, Then the `alert` says "Couldn't reach LabSafe. Your page is still here; check your connection and try again."; and a 401 on saving, submitting or uploading a photo says "Your session has ended. Log in again in another tab, then try again here."
  - No message in the web app contains "submit again".
  - The other failure texts of S03.1 AC17 don't change.
  - `pnpm e2e`'s offline check in `network-drop.spec.ts` expects the new text and passes at both widths.

## Out of scope

- The other form gaps: S03.1 F2 and the S03.2 loading note (epic "Out of scope").
- Any change to the server.

## API contract

None; no endpoint changes.

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| photo field (all three forms) | "Uploading photo…" | "JPEG or PNG, at most 5 MB" | the message next to the photo, described on "Change photo" when a photo is shown, announced; the old failure `alert` cleared | the preview + "Change photo" |
| form failure `alert` (all three forms) | — | — | the AC4 texts | — |

## Approach

- `PhotoField.tsx`: while a photo is shown, the field id and the description move to "Change photo" (review F1's fix); the message is announced. `SafetyPageForm.tsx` clears its failure `alert` when a photo upload starts (a callback through `IdentitySection.tsx`, no effect).
- `failure-messages.ts`: the two texts. Update the tests that assert the old texts (`PhotoField.test.tsx`, `NewSafetyPagePage.test.tsx`, `EditSafetyPagePage.test.tsx`, `e2e/tests/network-drop.spec.ts`); only the expected text changes, never what they check.

## Tickets

1. [FE-01 Photo control fixes](fe/FE-01-photo-control.md)
2. [FE-02 "Try again" wording](fe/FE-02-try-again-wording.md)

## Known gaps

- F1 (minor, review round 1): "Change photo" is `disabled` while the upload runs, so a keyboard user who chooses a file from it loses focus to the page body and needs Shift+Tab to get back (`PhotoField.tsx:99`; dates from E03).
- F2 (minor, review round 1): the form's own photo message ("Upload a photo" or the server's `photoId` message) also sits in the polite live region, so it is announced on top of the error summary alert (`PhotoField.tsx:111-117`).

## Verification

**GREEN** · 2026-11-26 · architect review round 1 APPROVE ([review.md](review.md)), no blocker or major; minors F1 and F2 open. `pnpm verify` exit 0 (shared 181, API unit 139, web 377, integration 406, docs-check OK). `pnpm e2e` 72 passed (reported by FE-02), with the new offline text in `network-drop.spec.ts` at both widths. Every AC has a test titled `S04.4 AC<n>`: AC1 web (`PhotoField`, the edit and the fix form); AC2 web (new-page form with and without a photo, fix form); AC3 web (offline submit or resubmit then a refused photo, offline submit or save then a successful upload); AC4 web (the two texts, the offline and 401 alerts on all three forms, the 401 on a photo upload in each, the "submit again" scan) and e2e.

## Changes
