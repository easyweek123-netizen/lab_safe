---
id: FE-03
story: S04.2
layer: fe
status: done # todo | doing | done
depends_on: [BE-03, BE-04]
covers: [AC10]
updated: 2026-11-26
---

# FE-03 Approved pages for the contributor

**Goal:** the author sees "Approved" with a link to the public page, and is never offered to edit an approved page. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/pages/contribute/MySubmissions.tsx`, `MySubmissions.test.tsx`
- change `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx`, `EditSafetyPagePage.test.tsx`
- change `apps/web/src/components/safety-page-form/failure-messages.ts` (a 409 shows the server's message)
- change `apps/web/src/test/msw.ts` only if a handler is needed

## Constraints

- An approved row's name links to `/instruments/<slug>`; pending rows keep the edit link.
- The edit address of an approved page shows the AC10 message and "Open the public page" (to `/instruments/<Submission.slug>`) and no form.
- A 409 on save shows the server's message ("This page has already been reviewed.") in the form's failure `alert`; the form stays.
- Component tests titled `S04.2 AC10` for the row, the approved edit address and the 409 on save.
- Schema change: no.

## Out of scope

Rejected rows and the fix form (S04.3); rewording the other failure messages (S04.4).

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
apps/web/src/pages/contribute/MySubmissions.tsx
apps/web/src/pages/contribute/MySubmissions.test.tsx
apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx
apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx
apps/web/src/components/safety-page-form/failure-messages.ts

**Differences from the ticket:**

- `msw.ts` is unchanged: the tests build their approved fixtures (`status: 'APPROVED'`, `slug: 'rotary-evaporator'`) inline from the existing ones.
- `submitFailureMessage` shows the server's message for any 409 that carries a code (as for 413/415 in `photoUploadMessage`); a 409 without a code falls back to "Something went wrong on our side…". A 409 does not invalidate the submission, so the form stays.
- The approved note replaces only the form; the h1 stays "Edit safety page". It is a plain note, not an `alert` (the page loaded correctly), as FE-01's "already reviewed" note.
- A form already on screen stays when a background refresh answers the page approved meanwhile (E03-D7: a refresh never hides the open form, so what was typed is kept, and saving it then shows the 409 message). The page remembers the id whose form it has shown in `useState` (UI state, set during render, no effect). Tested as an extra `S04.2 AC10` test.
- An approved row (or submission) without a slug is outside the contract; the row then shows its name without a link, and the edit address shows the note without the link.
- No Playwright spec: FE-04 (`publish.spec.ts`) covers "My submissions" showing "Approved" with the link end to end.
