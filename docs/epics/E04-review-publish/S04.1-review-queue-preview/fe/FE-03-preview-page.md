---
id: FE-03
story: S04.1
layer: fe
status: done # todo | doing | done
depends_on: [BE-02, FE-01, FE-02]
covers: [AC4, AC6, AC8]
updated: 2026-11-26
---

# FE-03 Preview page

**Goal:** an admin opens a pending page from the list and sees the contributor, the date and the page exactly as `SafetyPageView` shows it. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/review.ts` (`useReviewSubmission(id)`)
- create `apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.tsx`, `ReviewSubmissionPage.test.tsx`
- change `apps/web/src/App.tsx` (`/admin/review/:id` under `RequireAccount level="admin"`)
- change `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list)

## Constraints

- Follow `EditSafetyPagePage.tsx` for the id check (a malformed id sends no request), "Page not found" for 400 and 404, the error with Retry and keeping data on a failed refresh. Query key `['admin-submissions', id]`.
- h1 "Review a new page"; "Submitted by <name> on <date>"; then `SafetyPageView` with a level-2 title. Leave room above the view for the decision panel of S04.2 and S04.3; build no buttons now.
- Component tests titled `S04.1 AC<n>`: the heading, contributor, date, view and no "Last approved" line (AC4); loading, not found (unknown and malformed, no request for malformed), error and Retry (AC6); "No access" for a contributor (AC8).
- Schema change: no.

## Out of scope

Approve (S04.2), Reject (S04.3), the "already reviewed" state (S04.2).

## Implementation notes

**Files changed:**

apps/web/src/api/review.ts
apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.tsx
apps/web/src/pages/admin-review-submission/ReviewSubmissionPage.test.tsx
apps/web/src/App.tsx
apps/web/src/test/msw.ts
apps/web/CLAUDE.md

**Differences from the ticket:**

- `api/review.ts` also exports `reviewSubmissionKey(id)` (`['admin-submissions', id]`) for S04.2 and S04.3 to invalidate. `useReviewSubmission(id, { enabled })` takes `enabled` as `useSubmission` does, so a malformed id sends no request.
- `src/test/msw.ts` gains `ADMIN_SUBMISSION`, `reviewSubmissionFixture` (the queue's first item, "Rotary evaporator" by `approvedUser`, with `rotavapDisplay`) and `reviewSubmissionHandler(submission)` (404 for any other id). No default handler.
- The h1 is always "Review a new page"; an `UPDATE` revision (E05) gets no other heading yet.
- The submitter line is one `p` with the date in a `<time>`; the decision panel of S04.2 and S04.3 goes between it and the view.
- Extra tests beyond the ticket's list: a 400 from the server shows "Page not found", Retry after a network error, the preview kept after a background refresh fails with 500 or 404, no Approve or Reject button, the submitter's name absent inside the view, and an anonymous visitor sent to `/login?next=…`.
