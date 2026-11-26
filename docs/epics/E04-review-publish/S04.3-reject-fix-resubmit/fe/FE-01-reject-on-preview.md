---
id: FE-01
story: S04.3
layer: fe
status: done # todo | doing | done
depends_on: [BE-01]
covers: [AC1, AC2, AC3]
updated: 2026-11-26
---

# FE-01 Reject on the preview

**Goal:** the admin writes a note and presses "Reject"; an empty note is refused in the browser before anything is sent. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/review.ts` (`useRejectSubmission(id)`)
- change `apps/web/src/pages/admin-review-submission/DecisionPanel.tsx`, `ReviewSubmissionPage.test.tsx`
- change `apps/web/src/test/msw.ts`

## Constraints

- A `TextArea` labelled "Note for the contributor" and the "Reject" / "Rejecting…" button in the decision panel, under "Approve". Phone first: full width at 375 px.
- Check the note with the shared `RejectSubmissionRequest` on "Reject"; the message next to the field and focus on it; no request. A server `fields: note` shows the same way.
- The mutation, its invalidations, the confirmation in the router state and the failure `alert`s follow S04.2 FE-01; one `alert` at a time.
- Component tests titled `S04.3 AC<n>`: the request, busy state and confirmation (AC1); empty and spaces-only notes with no request, focus, and a server 400 (AC2); 409 and the failure texts (AC3).
- Schema change: no.

## Out of scope

The contributor's side (FE-02).

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
apps/web/src/api/review.ts
apps/web/src/pages/admin-review-submission/DecisionPanel.tsx
apps/web/src/pages/admin-review-submission/decision-messages.ts
apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.test.tsx
apps/web/src/test/msw.ts

**Differences from the ticket:**

- One extra file, `decision-messages.ts`, gains `noteFieldError(error)`: the message of a 400 with `fields: note`, shown next to the field (with focus) instead of an alert. A 400 without a note field (for example a malformed id) gets the S04.2 AC14 "Something went wrong on our side. Try again." alert.
- The note field and "Reject" are a small `react-hook-form` form with `zodResolver(RejectSubmissionRequest)`, as `LoginPage` does, so the shared `TextArea` (which takes a `register` result) is reused and focus moves to the field on a refused note. The trimmed note from the schema is what is sent.
- `useRejectSubmission` shares the approve hook's invalidations through a private `invalidateAfterDecision` in `review.ts`; behaviour of approve is unchanged.
- One `alert` at a time across both decisions: starting one decision resets the other mutation; "Reload the page" resets both.
- The router state after a reject is `{ confirmation, publicPath: null }`, so the queue shows no "Open the public page" link. No change to `ReviewQueuePage` was needed.
- "Reject" is red (`bg-red-700`) with its text label; nothing relies on the colour.
- Extra tests beyond the list: the panel order (Approve, note, Reject, view); line breaks inside the note kept and the note trimmed; the queue reloads so the row is gone; "Reject" disabled while an approve is sent; a note over 1,000 characters refused in the browser; approving never checks the note; a failed approve then a failed reject keep one alert; no note field for a page no longer pending.
- No existing test changed.
