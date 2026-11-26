---
id: FE-02
story: S04.2
layer: fe
status: done # todo | doing | done
depends_on: [BE-04]
covers: [AC4, AC6]
updated: 2026-11-26
---

# FE-02 Public safety page

**Goal:** anyone opens `/instruments/<slug>` with no login and reads the published page in `SafetyPageView`. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/api/instruments.ts` (`usePublishedPage(slug)`)
- create `apps/web/src/pages/safety-page/SafetyPagePage.tsx`, `SafetyPagePage.test.tsx`
- change `apps/web/src/App.tsx` (`/instruments/:slug`, outside every `RequireAccount`)
- change `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list)

## Constraints

- Query key `['instruments', slug]`. A 404 shows `NotFoundPage` itself (pattern: `EditSafetyPagePage.tsx`); other failures show the AC6 `alert` with Retry only while there is no data; a failed background refresh keeps the page.
- The view with a level-1 title, so the page has one h1; "Last approved" from `page.lastApproved`.
- No account is needed and no account data is shown beyond the header.
- Component tests titled `S04.2 AC<n>`: the fields and the "Last approved" line for an anonymous visitor (AC4); loading, not found, error with Retry (AC6).
- Schema change: no.

## Out of scope

Search and links to the page from anywhere except the admin's confirmation and "My submissions" (E06).

## Implementation notes

**Files changed:**

apps/web/CLAUDE.md
apps/web/src/App.tsx
apps/web/src/api/instruments.ts
apps/web/src/pages/safety-page/SafetyPagePage.tsx
apps/web/src/pages/safety-page/SafetyPagePage.test.tsx
apps/web/src/test/msw.ts

**Differences from the ticket:**

- `usePublishedPage(slug, { enabled })` takes `enabled`, as `useReviewSubmission` does: a slug outside `InstrumentSlugParam` (over 200 characters) shows "Page not found" without a request, because the server would answer 400 there. A 400 from the server also counts as not found.
- While loading and in the error state there is no page title yet, so the page has a hidden (`sr-only`) h1 "Safety page" there, keeping one h1 per page. Once loaded, the view's title is the only h1 and there is no extra heading or wrapper.
- `msw.ts` gains `INSTRUMENT`, `publishedPageFixture` (approved by `adminUser` on 26 Nov 2026, midday UTC) and `publishedPageHandler`.
- No Playwright spec: this ticket doesn't complete the main path. FE-04 (`publish.spec.ts`) covers the public page end to end, including the no-sideways-scroll check (AC7, AC15).
- Extra tests beyond the list: a signed-in contributor also sees the page; an answer outside the contract and a network failure show the alert; a failed background refresh (500 or 404) keeps the page.
