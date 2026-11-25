---
id: S03.2
epic: E03
title: Correct my pending page; nobody else can
type: feature
status: done
covers: [US7, R3, R4, R5]
updated: 2026-11-25
---

# S03.2 Correct my pending page; nobody else can

**As an** approved contributor **I want** to open my pending page again and correct it **so that** the admin reviews the right content, while no one else can read or change it · Delivers: C9, C11, C13 (editing), C16 (edit form), C17 · Design: [design.md](../design.md)

**Try it:** after S03.1's "Try it", open "Contributor area", click "Rotary evaporator" in My submissions, change the description, press "Save changes", and open it again.

## Acceptance criteria

- **AC1** Given the author's My submissions on `/contribute`, When they click the name "Rotary evaporator", Then `/contribute/submissions/<id>` shows h1 "Edit safety page" and the S03.1 form filled in with exactly what was submitted: every text, the photo preview, every list choice with its note, the training answer and who gives it, the "none" choices, and each emergency item's location or "Not applicable".
- **AC2** Given the filled-in edit form, When the author changes the description (or any other field, the photo included) and presses "Save changes", Then the button reads "Saving…" and is disabled while it is sent; the server answers 200 `Submission` still `PENDING`, with the first `submittedAt` and a new `updatedAt`; the revision's content and its hazard and PPE rows are replaced in one transaction (a removed hazard has no row left); and the browser shows `/contribute` with `status` "Your changes to Rotary evaporator were saved. It is still waiting for review.". Opening the page again shows the new description.
- **AC3** Given the edit form, When the author clears a required field, or breaks any rule of S03.1 AC9–AC13, and saves, Then the form refuses it with the same error summary and field messages as S03.1; a `PUT` with such a body sent straight to the server answers 400 `VALIDATION_FAILED` naming the field, and the stored page is unchanged.
- **AC4** Given a pending submission, When `GET /api/submissions/:id` is called, Then the author and an admin get 200 `Submission` with `submittedBy`; an anonymous visitor, a pending account, a rejected account and another approved contributor get 404 `NOT_FOUND` with the same body as an id that does not exist; a malformed id gets 400.
- **AC5** Given a pending submission, When `PUT /api/submissions/:id` is called with a complete valid body, Then the author gets 200; an anonymous visitor, a pending account, a rejected account, another approved contributor and an admin get 404 `NOT_FOUND`, and the stored page is unchanged.
- **AC6** Given `/contribute/submissions/<id>`, When the submission is loading, Then it shows `status` "Loading…"; When the id is unknown, malformed, or not the signed-in person's own (an admin's included), Then it shows h1 "Page not found"; When loading fails, Then `alert` "Couldn't load this page, try again." with a Retry button; When saving fails, Then the messages of S03.1 AC17 appear and every typed value stays; and a failed or successful background refresh of the submission never resets or hides what has been typed.
- **AC7** Given the saved, still pending "Rotary evaporator", When an anonymous visitor in a fresh browser context opens `/instruments/rotary-evaporator` and the photo address, Then both still show "not found".
- **AC8** Given a 375 px and a 1280 px wide window, When the edit form is shown, Then nothing scrolls sideways, and `pnpm e2e` runs at both widths: submit a page → open it from My submissions → it is filled in → change the description → save → still "Pending" → open again → the new description → AC7's anonymous checks.

## API contract

Shared, in `packages/shared/src/schemas/submissions.ts`: `SubmissionIdParam { id: uuid }`. `Submission` and `SafetyPageContent` as in [S03.1](../S03.1-write-submit-page/story.md#api-contract).

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| GET | /api/submissions/:id | Public guard; the service allows the author and admins (E03-D4) | `SubmissionIdParam` → 200 `Submission` | 400 malformed id; 404 `NOT_FOUND` |
| PUT | /api/submissions/:id | Public guard; the service allows only the approved author | `SubmissionIdParam`, `SafetyPageContent` → 200 `Submission` | 400 `VALIDATION_FAILED` with every field (also unknown `labRoomId`, foreign `photoId`); 403 `FORBIDDEN` (origin); 404 `NOT_FOUND` |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/contribute/submissions/:id` | `status` "Loading…"; save "Saving…", disabled | — | h1 "Page not found" (unknown, malformed, not yours); `alert` "Couldn't load this page, try again." + "Retry"; the S03.1 error summary and AC17 messages | → `/contribute` with the AC2 confirmation |
| `/contribute` | as S03.1 | as S03.1 | as S03.1 | each row's name is a link to its edit page |

## Approach

- **API:** `GET` and `PUT /submissions/:id` in `SubmissionsController`, `@Public()` with the visibility rule in `SubmissionsService` (design "Who may do what"). `PUT` uses one transaction that first loads the revision `WHERE id AND submitted_by = me AND status = 'PENDING' FOR UPDATE` (design E03-D5), then the S03.1 room and photo checks, then the content update and the replaced child rows. Follow S03.1 BE-04 and `users.service.ts` `changeRole` for the locking transaction.
- **Web:** `src/pages/edit-safety-page/` reuses `SafetyPageForm` with the loaded values and "Save changes"; `form-values.ts` already maps `Submission.content` back to form values. Hooks `useSubmission(id)` and `useUpdateSubmission(id)` in `src/api/submissions.ts`, with the same failure rules as `useSubmitPage`.
- **e2e:** `e2e/tests/safety-page-edit.spec.ts` with the S03.1 helpers.

## Tickets

1. [BE-01 Read and edit one submission](be/BE-01-read-edit-submission.md)
2. [FE-01 Edit safety page](fe/FE-01-edit-page.md)
3. [FE-02 Edit journey test](fe/FE-02-edit-journey.md)

## Out of scope

- Fixing a rejected page and resubmitting it; the admin's preview (E04).
- Withdrawing or deleting a pending page (epic "Out of scope").
- Keeping the form when a background refresh of the account fails (S03.3).

## Known gaps

- Review round 1 note (no finding): the save-failure messages reuse S03.1 AC17 texts, so the edit page says "submit again"; rewording needs a change to the frozen AC6.
- QA run 1 observations (not bugs): while loading, h1 "Edit safety page" shows above "Loading…" even for a page that turns out not to be the person's own (no content is shown); an anonymous visitor on `/contribute/submissions/<id>` is sent to the login page, which AC6 does not cover.

## Verification

**GREEN** · 2026-11-25 · architect review round 1 APPROVE ([review.md](review.md)), no findings. `pnpm verify` exit 0 (shared 129, API unit 133, web 217, integration 283, docs-check OK). `pnpm e2e` 56 passed, with the S03.2 journey at 1280 px and 375 px. Every AC has a test titled `S03.2 AC<n>`: AC1 web and e2e; AC2 integration, web and e2e; AC3 integration and web; AC4 integration and shared; AC5 and AC7 integration (AC7 also e2e); AC6 web; AC8 e2e.

## Changes
