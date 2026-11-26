---
id: FE-01
story: S04.2
layer: fe
status: done # todo | doing | done
depends_on: [BE-03]
covers: [AC1, AC8, AC9, AC14]
updated: 2026-11-26
---

# FE-01 Approve on the preview

**Goal:** the admin presses "Approve" on the preview, lands on "Pages to review" with a link to the public page, and gets a clear message for every refusal. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/review.ts` (`useApproveSubmission(id)`)
- create `apps/web/src/pages/admin-review-submission/DecisionPanel.tsx`
- change `apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.tsx`, `ReviewSubmissionPage.test.tsx`
- change `apps/web/src/pages/admin-review/ReviewQueuePage.tsx`, `ReviewQueuePage.test.tsx` (the confirmation's link)
- change `apps/web/src/test/msw.ts`

## Constraints

- The decision panel sits between "Submitted by … on …" and the view. "Approve" / "Approving…"; while it runs every decision button is disabled. The request sends the `version` of the loaded preview.
- The mutation follows `useUpdateSubmission`: `networkMode: 'always'`, no `me` refresh on 401 or 403. On success it invalidates `['review-queue']` and `['admin-submissions', id]`, then goes to `/admin/review` with the AC1 confirmation and the public path in the router state; the list shows the text as `status` and the link "Open the public page".
- 409 `ALREADY_REVIEWED`: the server's message with "Back to pages to review". 409 `SUBMISSION_CHANGED`: the message with "Reload the page", which refetches the preview. The AC14 texts for the rest. One `alert` at a time, cleared when a new decision starts.
- A loaded preview whose `status` is not `PENDING` shows "This page has already been reviewed." and no decision panel.
- Component tests titled `S04.2 AC<n>`: request body, busy state, navigation and confirmation with link (AC1); both 409s and the reviewed-page state (AC8, AC9); each failure text and the page kept (AC14).
- Schema change: no.

## Out of scope

The note and "Reject" (S04.3).

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
apps/web/src/api/review.ts
apps/web/src/pages/admin-review-submission/DecisionPanel.tsx
apps/web/src/pages/admin-review-submission/decision-messages.ts
apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.tsx
apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.test.tsx
apps/web/src/pages/admin-review/ReviewQueuePage.tsx
apps/web/src/pages/admin-review/ReviewQueuePage.test.tsx
apps/web/src/test/msw.ts

**Differences from the ticket:**

- **One existing S04.1 assertion changed.** `S04.1 AC4 shows the submitter only above the view, and no "Last approved" line` asserted no Approve or Reject button anywhere on the preview, which was true only while S04.1 left decisions out of scope. It now asserts no such button inside the view (`article`); the panel above the view is tested by the new `S04.2 AC1` tests, including its position between the submitter line and the view. Nothing else in the test changed.
- New file `decision-messages.ts` holds the AC8, AC9 and AC14 texts and maps an error to its text and action (pattern: `safety-page-form/failure-messages.ts`). The 409s show the server's own message, as the ticket says.
- `useApproveSubmission` invalidates `['review-queue']` with `refetchType: 'all'` (awaited, so the list is fresh, without the approved row, when the admin lands on it) and `['admin-submissions', id]` with `refetchType: 'none'` (marked stale but not refetched while still on screen, which would flash the "already reviewed" state before the navigation).
- The router state is `{ confirmation, publicPath }`. `ReviewQueuePage` shows the link only for a `publicPath` starting with `/instruments/`; the route itself comes with FE-02.
- "Reload the page" clears the alert (`mutation.reset()`) and refetches the preview; the panel then sends the new `version`.
- A loaded preview that is not `PENDING` shows "This page has already been reviewed." with the link "Back to pages to review" in place of the panel, and still shows the view below. It is a plain note, not an `alert`: the page loaded correctly.
- Extra tests beyond the list: the queue reloads after approving, so the row is gone (AC1); the alert clears when a new decision starts (AC14); no `me` request after a failed approve (AC14); no public link for a path outside `/instruments/` (AC1).
