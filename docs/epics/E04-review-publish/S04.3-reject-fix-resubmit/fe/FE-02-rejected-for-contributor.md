---
id: FE-02
story: S04.3
layer: fe
status: done # todo | doing | done
depends_on: [BE-02]
covers: [AC4, AC5, AC6, AC7, AC10]
updated: 2026-11-26
---

# FE-02 Rejected pages for the contributor

**Goal:** the author sees the admin's note in "My submissions", opens the fix form with the note above it, and resubmits. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/pages/contribute/MySubmissions.tsx`, `MySubmissions.test.tsx`
- change `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx`, `EditSafetyPagePage.test.tsx`
- create `apps/web/src/pages/edit-safety-page/ReviewNote.tsx`
- change `apps/web/src/test/msw.ts` only if a handler is needed
- change `apps/web/CLAUDE.md` (page list: the fix mode of `/contribute/submissions/:id`)

## Constraints

- A rejected row: "Status: Rejected", then "Admin's note: <note>" with kept line breaks; the name links to the fix form.
- `EditSafetyPagePage` by the loaded `status`: `REJECTED` → h1 "Fix safety page", the note (a heading and the text, before the form), `SafetyPageForm` with "Resubmit for review" / "Resubmitting…", confirmation "<name> was resubmitted and is waiting for review."; `PENDING` unchanged; `APPROVED` as S04.2 FE-03. The h1 may read "Edit safety page" until the submission has loaded.
- Reuse `useUpdateSubmission` (it already invalidates "My submissions" and the submission) and every E03 rule for the form: filled once, never reset by a refresh (E03-D7).
- Component tests titled `S04.3 AC<n>`: the row and the note (AC4); the fix page (AC5); the request, busy state and confirmation (AC6); the error summary on a cleared field and a server 400 (AC7); loading, not found, error with Retry, failure keeps values, refresh doesn't reset (AC10).
- Schema change: no.

## Out of scope

The photo and wording fixes in the shared form (S04.4).

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
apps/web/src/pages/contribute/MySubmissions.tsx
apps/web/src/pages/contribute/MySubmissions.test.tsx
apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx
apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx
apps/web/src/pages/edit-safety-page/ReviewNote.tsx

**Differences from the ticket:**

- `msw.ts` is unchanged: the tests build their rejected fixtures (`status: 'REJECTED'`, `reviewNote`) and the resubmission answer (`PENDING`, new `submittedAt`, `reviewNote: null`) inline from the existing ones, as S04.2 FE-03 did.
- The row's note is one paragraph "Admin's note: <note>" with `whitespace-pre-wrap` (line breaks and spaces kept, `break-words` so a long word doesn't scroll sideways at 375 px). It shows only when `status` is `REJECTED` and `reviewNote` is not null.
- `ReviewNote` is a `section` labelled by its h2 "Admin's note" with the text in `whitespace-pre-wrap`, in an amber box; a plain note, not an `alert` (the page loaded correctly). The h2 matches the form's section headings, so the heading order stays h1, h2.
- Edit or fix is decided once, when the form is first shown: the page's existing "form shown for" UI state now records `{ id, fix }` instead of only the id (set during render, no effect). So a background refresh that answers another status never changes the h1, the button or the confirmation of an open form (E03-D7), in both directions (a pending form whose refresh answers rejected stays "Edit safety page"). The note itself is read from the current submission and shown only while it is `REJECTED`: if a refresh answers the page pending or approved (changed elsewhere), the note goes, but the form, the h1 "Fix safety page" and everything typed stay; a failed or 404 refresh keeps the cached note. I did not copy the note into `useState` (server data rule).
- The resubmission confirmation is chosen by the fix mode, not by the response's `status` (which is `PENDING` for both a save and a resubmission).
- No Playwright spec: FE-03 (`review-journey.spec.ts`) runs the journey end to end.
- Extra tests beyond the list: the note's line breaks on the fix form; a resubmitted row shows "Status: Pending" with no note; an admin who isn't the author gets "Page not found" without the note; a 409 on resubmission shows the server's message and keeps the values; refreshes answering pending again or approved keep the fix form; a pending form stays "Edit safety page" when a refresh answers rejected.
- No existing test changed.
