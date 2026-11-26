---
id: FE-02
story: S04.1
layer: fe
status: done # todo | doing | done
depends_on: [BE-02]
covers: [AC1, AC2, AC3, AC8]
updated: 2026-11-26
---

# FE-02 Pages to review

**Goal:** an admin opens "Pages to review" from the header and sees every pending page oldest first, with the empty, loading and error states. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/api/review.ts` (`useReviewQueue`)
- create `apps/web/src/pages/admin-review/ReviewQueuePage.tsx`, its row component, `ReviewQueuePage.test.tsx`
- change `apps/web/src/App.tsx` (`/admin/review` under `RequireAccount level="admin"`)
- change `apps/web/src/components/AccountMenu.tsx`, `AccountMenu.test.tsx` (the "Pages to review" link for approved admins)
- change `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list)

## Constraints

- Follow `src/pages/admin-sign-ups/` for the list, its states and Retry, and `MySubmissions.tsx` for the date format. Query key `['review-queue']`.
- Kind label "New" (and "Update" for `UPDATE`, which E05 produces), as text.
- A failed background refresh keeps the list (E03-D7).
- The page reads a confirmation from the router state and shows it as `status`; S04.2 and S04.3 put it there. Show nothing when there is none.
- Component tests titled `S04.1 AC<n>`: rows, order as received, the links (AC1); empty (AC2); loading, error, Retry, kept list on a failed refresh (AC3); a contributor sees "No access" and no "Pages to review" link (AC8).
- Schema change: no.

## Out of scope

The preview page (FE-03).

## Implementation notes

**Files changed:**

apps/web/src/api/review.ts
apps/web/src/pages/admin-review/ReviewQueuePage.tsx
apps/web/src/pages/admin-review/ReviewQueueRow.tsx
apps/web/src/pages/admin-review/ReviewQueuePage.test.tsx
apps/web/src/App.tsx
apps/web/src/components/AccountMenu.tsx
apps/web/src/components/AccountMenu.test.tsx
apps/web/src/test/msw.ts
apps/web/CLAUDE.md

**Differences from the ticket:**

- `src/test/msw.ts` gains `REVIEW_QUEUE`, `reviewQueueFixture` (three pending pages, oldest first: `approvedUser`'s "Rotary evaporator", a second contributor's "Fume hood" and the admin's own "Centrifuge") and `reviewQueueHandler(queue)`. No default handler: only admin pages ask for the queue.
- `api/review.ts` exports `REVIEW_QUEUE_KEY` (`['review-queue']`) for S04.2 and S04.3 to invalidate.
- The page shows the list whenever it has data (so a failed background refresh keeps it, E03-D7), the error only without data, and the loading state while a Retry runs, as the edit page does. The list is named by the h1 (`aria-labelledby`).
- The kind label is text in a bordered box ("New" or "Update"); the confirmation from the router state uses the same `confirmation` key and green-bordered `status` as `/contribute`.
- The confirmation is tested by navigating to `/admin/review` with router state, because `renderApp` takes only a path.
