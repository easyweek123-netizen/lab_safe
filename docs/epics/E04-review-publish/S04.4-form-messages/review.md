# Review: S04.4

<!-- architect. blocker: an acceptance criterion broken, a refused role gets in, data lost or leaked, a test weakened.
     major: a named rule, edge case or screen state wrong, or a criterion without a real test.
     minor: anything else; it becomes a known gap. -->

## Round 1 · 2026-11-26 · verdict: APPROVE

`pnpm verify`: ✅ (exit 0, run by the main session: shared 181, API unit 139, web 377, integration 406, docs-check OK); `pnpm e2e` 72 passed (reported by FE-02)

AC1 to AC4 are built as written, and each has a real test titled `S04.4 AC<n>`. No endpoint, schema or server code changes, as the story says. The change is three web components and one message file.

**Photo control (AC1, AC2).** This is the fix asked for in S03.1 F1. While a photo is shown, "Change photo" carries `fieldId('photoId')` and `aria-describedby` "<id>-hint <id>-error". The hidden input becomes `<id>-file`, and the "Photo" label follows it. So the button keeps its name, and `getByLabel('Photo')` in the e2e helpers still finds the input. With no photo, the input keeps the E03 id, hint and message. The message sits in a `aria-live="polite"` region that is always on the page, with no role, so it does not compete with the form's `alert` or the "Uploading photo…" `status`. The tests check four things in all three forms: the live region is empty before the message and holds it after, the description on "Change photo", the kept preview `src` and form value, and that there is no `alert`. They follow the summary's "Photo" link and check focus on "Change photo" with a photo (new-page form and fix form) and on the input without one.

**Old failure alert (AC3).** `SafetyPageForm` passes `() => setFailure(null)` through `IdentitySection` to `PhotoField.onFileChosen`. It is an event callback, not an effect. The tests cover three paths: an offline submit or resubmit followed by a refused upload (only the photo's message, no `alert`, preview kept), and an offline submit or save followed by a successful upload (no `alert`).

**Wording (AC4).** Only `SESSION_ENDED_MESSAGE` and `SUBMIT_UNREACHABLE_MESSAGE` changed. The other AC17 texts and the S04.2 409 branch are untouched. The offline and 401 texts are tested on the new-page, edit and fix forms, and the 401 on a photo upload in each form and in `PhotoField`. No source file in `apps/web`, `apps/api` or `packages/shared` contains "submit again".

Developer points:
- **1a, the alert clears on every chosen file, also one refused in the browser:** accepted. AC3's detail says "Choosing any new photo clears the old failure `alert`", and a file over 5 MB is a new choice whose message replaces the old one. The story's Approach says "when a photo upload starts"; the ticket notes record the difference, and the AC wins.
- **1b, `aria-invalid` only on the hidden input:** accepted. ARIA 1.2 does not support `aria-invalid` on the `button` role, and AC1 asks for the description, which the button has. The attribute on the hidden input has no effect but does no harm.
- **1c, a server `photoId` message read twice:** a real but small problem, see F2.
- **2, FE-02 test edits and the source scan:** not weakened. In the five existing tests (`PhotoField.test.tsx` S03.1 AC17; `NewSafetyPagePage.test.tsx` S03.1 AC17 ×2; `EditSafetyPagePage.test.tsx` S03.2 AC6 ×2, S04.3 AC10) and in `network-drop.spec.ts`, the diff changes only the expected strings. Titles, setup and assertions are the same. The `import.meta.glob` scan is a fair test of "No message in the web app contains 'submit again'". It asserts that `failure-messages.ts` is among the scanned files, so it can't pass by matching nothing. Banning the phrase in comments too is an acceptable cost.

- [ ] F1 [minor][fe] `apps/web/src/components/safety-page-form/PhotoField.tsx:99`: "Change photo" is `disabled` while the upload runs. A keyboard user who opens the picker from the button and chooses a file therefore loses focus: the browser's focus fixup moves it to the body. When the refusal arrives, the live region announces it, but focus is no longer on "Change photo". The user has to press Shift+Tab to reach the control with the description. This was already so in E03 and does not break AC1 (the control a user reaches has the description). The by-hand screen-reader check for C16 will meet it. Fix: keep the button focusable while uploading (`aria-disabled="true"` and ignore clicks while `upload.isPending`), and test that focus stays on "Change photo" through a refused upload.
- [ ] F2 [minor][fe] `apps/web/src/components/safety-page-form/PhotoField.tsx:111-117`: the form's own `error` (the client "Upload a photo" or a server `fields: photoId`) also goes into the polite live region. When a submit fails, the message is in the summary `alert` and is announced a second time by the photo's live region. Fix: announce only the photo field's own messages (too large, upload failures) through the live region, and render the form's `error` with the same `<id>-error` id outside it.

No blocker or major is open.

Where to look first: `apps/web/src/components/safety-page-form/PhotoField.tsx` (the id and description move, the live region, F1, F2), `apps/web/src/components/safety-page-form/SafetyPageForm.tsx` (`onPhotoChosen` clears the failure `alert`), `apps/web/src/components/safety-page-form/failure-messages.test.ts` (the two texts and the "submit again" scan)
