---
id: FE-04
story: S03.1
layer: fe
status: done
depends_on: [BE-04, FE-01, FE-02, FE-03]
covers: [AC1, AC8, AC9, AC10, AC11, AC12, AC17, AC18]
updated: 2026-11-24
---

# FE-04 New safety page: submit, error summary and failures

**Goal:** `/contribute/new` shows the whole form, submits a complete page, names every gap in one summary, and keeps everything typed when submitting fails. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/web/src/components/safety-page-form/SafetyPageForm.tsx`, `ErrorSummary.tsx`, `field-labels.ts`
- create `apps/web/src/pages/new-safety-page/NewSafetyPagePage.tsx`, `NewSafetyPagePage.test.tsx`
- change `apps/web/src/pages/contribute/ContributorAreaPage.tsx` (the "New safety page" link)
- change `apps/web/src/App.tsx`
- change `apps/web/CLAUDE.md` (page list: `/contribute/new`)

## Constraints

- `SafetyPageForm` owns the react-hook-form form, composes the five sections in AC1's order, and takes the submit button's label and an `onSubmit` from its page, so S03.2's edit page reuses it. It validates with the shared `SafetyPageContent` on submit (apps/web/CLAUDE.md "Forms").
- `ErrorSummary` is one `alert` at the top with the AC9 heading and a link per problem to its input; focus moves to it on a failed submit. It lists both client issues and the server's `fields` (which also go onto their inputs). `field-labels.ts` gives a label for every path the schema can produce, including indexed ones ("How does the Vacuum / implosion hazard arise?"); a unit test proves every path has one.
- Submit failures exactly as in AC17. The form is never reset or unmounted by a failure, and a 401 does not send the person to log in (decision E03-D7).
- Success: navigate to `/contribute` with the confirmation text of AC8 in the router state; FE-05 shows it.
- `/contribute/new` sits under `RequireAccount level="contributor"`. Loading and error of the lists as in AC18, following `HomePage.tsx`; h1 "New safety page".
- Component tests titled `S03.1 AC<n>` for AC1, AC8 (request and navigation), AC9–AC12 in the browser half, AC17 and AC18, with MSW.
- Schema change: no.

## Out of scope

My submissions and the confirmation display (FE-05). The edit page (S03.2). A failed background refresh of the account (S03.3).

## Implementation notes

**Files changed:**

- apps/web/src/components/safety-page-form/SafetyPageForm.tsx
- apps/web/src/components/safety-page-form/ErrorSummary.tsx
- apps/web/src/components/safety-page-form/field-labels.ts
- apps/web/src/components/safety-page-form/field-labels.test.ts
- apps/web/src/components/safety-page-form/failure-messages.ts
- apps/web/src/pages/new-safety-page/NewSafetyPagePage.tsx
- apps/web/src/pages/new-safety-page/NewSafetyPagePage.test.tsx
- apps/web/src/pages/contribute/ContributorAreaPage.tsx
- apps/web/src/App.tsx
- apps/web/CLAUDE.md

**Differences from the ticket:**

- The resolver is `zodResolver` on `z.custom<SafetyPageFormValues>().transform(toContent).pipe(SafetyPageContent)`, so the browser runs exactly the shared schema and the issue paths are the form's field names. RHF's own focus on the first error is off (`shouldFocusError: false`); focus goes to the summary instead.
- `SafetyPageForm` props: `defaultValues` (default the empty form; S03.2 passes `fromContent(…)`), `submitLabel`, `submittingLabel` and `onSubmit(content) => Promise<void>`. The form catches a rejected `onSubmit` itself: an `ApiError` with `fields` that name form fields goes onto the inputs and the summary; anything else shows the AC17 `alert` above the button. A 400 whose `fields` name nothing in the form gets the 500 text. The button is disabled while submitting and while a photo uploads (`useIsUploadingPhoto`).
- The summary is built from react-hook-form's `errors` (client and server), so it updates as fields are revalidated and disappears when nothing is left. Each line is a link with the field's name, then the message ("Name: Enter the instrument's name"; after a question label only a space). A link moves focus to its input.
- `field-labels.ts` also exports `fieldTarget(path)` (the input id: note inputs and emergency locations by their own path, list items by their list), `isFieldPath(path)` and `summaryItems(errors, values)` (form order). `field-labels.test.ts` runs the schema over the empty form, every item ticked with bad notes and too long texts, and bodies with values outside the lists, and checks that every issue path has a name.
- `failure-messages.ts` gained `SUBMIT_UNREACHABLE_MESSAGE`, `SUBMIT_FAILED_MESSAGE` and `submitFailureMessage(error)`.
- Success navigates to `/contribute` with router state `{ confirmation: "<name> was submitted and is waiting for review." }` (name from the 201 `Submission`). FE-05 reads `location.state.confirmation`.
- The h1 "New safety page" is shown in the loading and error states too.
- `ContributorAreaPage` keeps its paragraph and gains the "New safety page" link; FE-05 adds My submissions.

**Verification (2026-11-24):** `pnpm verify` passes (web 189 tests, api 133 + 254 integration, shared 125; docs-check OK). This ticket doesn't complete the main path (FE-05 does), so it has no e2e spec and `pnpm e2e` was not run.
