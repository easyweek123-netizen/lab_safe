---
id: FE-01
story: S03.2
layer: fe
status: done
depends_on: [BE-01]
covers: [AC1, AC2, AC3, AC6]
updated: 2026-11-25
---

# FE-01 Edit safety page

**Goal:** the author opens a pending page from My submissions, sees it filled in, corrects it and saves it. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/submissions.ts` (`useSubmission`, `useUpdateSubmission`)
- create `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx`, `EditSafetyPagePage.test.tsx`
- change `apps/web/src/components/safety-page-form/SafetyPageForm.tsx` (initial values) and `form-values.ts` only if the mapping back needs it
- change `apps/web/src/pages/contribute/MySubmissions.tsx` (the name becomes a link), `MySubmissions.test.tsx`
- change `apps/web/src/App.tsx`
- change `apps/web/src/test/msw.ts`
- change `apps/web/CLAUDE.md` (page list: `/contribute/submissions/:id`)

## Constraints

- The route sits under `RequireAccount level="contributor"`. h1 "Edit safety page"; the submit button "Save changes" / "Saving…".
- The form is filled once from the loaded `Submission`; a later refresh of the query, failed or not, never resets or hides the form (AC6, decision E03-D7). Show the error state only when there is no data yet.
- "Page not found" for a 404, a 400 (malformed id) and a submission whose `submittedBy.id` is not the signed-in person (an admin may read it but not edit it). Reuse `NotFoundPage`'s content rather than a new text.
- `useUpdateSubmission` follows `useSubmitPage`: `networkMode: 'always'`, no `me` refresh on 401 or 403, the AC17 messages of S03.1; on success it invalidates the list and the submission, then navigates to `/contribute` with the AC2 confirmation.
- Component tests titled `S03.2 AC<n>` for AC1, AC2 (request, navigation), AC3 and every state of AC6, with MSW.
- Schema change: no.

## Out of scope

The e2e journey (FE-02). Rejected pages (E04).

## Implementation notes

**Files changed:**

- apps/web/src/api/submissions.ts
- apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx
- apps/web/src/pages/edit-safety-page/EditSafetyPagePage.test.tsx
- apps/web/src/pages/contribute/MySubmissions.tsx
- apps/web/src/pages/contribute/MySubmissions.test.tsx
- apps/web/src/App.tsx
- apps/web/src/test/msw.ts
- apps/web/CLAUDE.md

**Differences from the ticket:**

- `SafetyPageForm.tsx` and `form-values.ts` are unchanged. The form already takes `defaultValues`, and `fromContent` already maps the content back. react-hook-form reads `defaultValues` only when the form mounts, so a later refresh of the submission never resets it. The form also has `key={submission.id}`.
- Hooks: `submissionKey(id)` is `['submissions', id]`. `useSubmission(id, { enabled })` is used. `useUpdateSubmission(id)` sends `PUT` with `networkMode: 'always'`. On success it invalidates `['submissions', 'mine']` and `['submissions', id]`, and settles once both have answered.
- A malformed id (not a UUID by the shared `SubmissionIdParam`) shows "Page not found" without sending a request. A 400 or 404 from the server also shows it, but only while there is no data yet. A submission whose `submittedBy.id` is not the signed-in person shows it too. `NotFoundPage` itself is rendered, so the text is the same.
- The page also waits for `GET /api/meta/lists`, as `/contribute/new` does: the form's lab room select needs it. If either load fails before there is data, the page shows `alert` "Couldn't load this page, try again.". Retry reloads whichever load failed. h1 "Edit safety page" is shown in the loading and error states too.
- The query keeps the app's default `retry: 1`. In the running app, "Page not found" for an unknown id therefore appears after one retry, about 1 s.
- `msw.ts` gained the `SUBMISSION` pattern (`*/api/submissions/:id`). It also matches `/mine`, so a test's GET handler returns `undefined` for other ids and the request falls through. No default handler, so each test states its answer.
- Save-failure tests (AC6) reuse the S03.1 AC17 texts, so they still say "submit again" on the edit page. The texts were not reworded.
- Background-refresh tests trigger the refetch with `focusManager` (window focus). They answer 500, other content, and 404, and check that the typed description, the form and the button stay.

**Verification (2026-11-25):** `pnpm verify` passes (web 217 tests, api 133 + 283 integration, shared 129; docs-check OK). The e2e journey is FE-02, so no spec changed and `pnpm e2e` was not run.
