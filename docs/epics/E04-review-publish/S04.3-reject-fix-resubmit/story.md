---
id: S04.3
epic: E04
title: Reject with a note, then fix and resubmit
type: feature
status: done # draft | building | in-review | qa | done
covers: [US12, US9, R1]
points: 5
updated: 2026-11-26
---

# S04.3 Reject with a note, then fix and resubmit

| **Status** | see `status:` above |
| --- | --- |
| **Story points** | see `points:` above |
| **Epic criteria** | C2 (Reject), C3, C4, C5, C7 (while rejected, the replaced photo), C11 (reject), C12, C13 (reject), C19 (fix form, the journey C2–C8 at both widths) |
| **Design** | [design.md](../design.md) |
| **UX/UI designs** | none |
| **Dependencies** | S04.2 (approve, the migration with `review_note`, the public page the journey ends on) |

## User story

As an admin, I want to reject a page with a note saying what to fix, and as its contributor, I want to see that note, fix the page in the same form and resubmit it, so that a page that isn't ready yet becomes a good public page instead of being lost.

## Acceptance criteria

- **AC1** Given the preview of the pending "Rotary evaporator", When the admin writes "The photo is blurry; add the waste step to Safe operation." in "Note for the contributor" and presses "Reject", Then the page is rejected and the admin is back on "Pages to review" with a confirmation.
  - The decision panel shows "Approve", the note field and "Reject" above the page.
  - While it is sent, the button reads "Rejecting…" and the decision buttons are disabled.
  - The server answers 200 `ReviewDecision { status: "REJECTED" }`; the revision is `REJECTED` with the trimmed note, the admin as `reviewed_by` and the current time as `reviewed_at`.
  - `/admin/review` shows `status` "Rotary evaporator was rejected. The contributor can see your note.", and the row is gone.
- **AC2** Given the preview, When the admin presses "Reject" with an empty note or a note of only spaces, Then nothing is sent, "Enter a note for the contributor" shows next to the field, and focus moves to it.
  - `POST …/reject` with `{ note: "   " }` or no note answers 400 `VALIDATION_FAILED` with `fields: note`; a note over 1,000 characters answers 400 "The note must be at most 1000 characters".
  - Nothing changes; the page stays pending.
- **AC3** Given a pending page, When `POST /api/admin/submissions/:id/reject` is called by someone who is not an approved admin, Then it is refused and nothing changes: anonymous 401; a pending account, a rejected account and an approved contributor, also the author, 403.
  - Rejecting a page that is already approved or rejected answers 409 `ALREADY_REVIEWED` "This page has already been reviewed." and changes nothing; the browser shows it as in S04.2 AC8.
  - Malformed id 400, unknown id 404, foreign `Origin` 403. A failed reject shows the S04.2 AC14 messages.
- **AC4** Given the rejected page, When its author opens "My submissions", Then the row says "Status: Rejected" and "Admin's note: The photo is blurry; add the waste step to Safe operation." word for word, line breaks kept; the name links to `/contribute/submissions/<id>`.
  - `GET /api/submissions/mine` and `GET /api/submissions/:id` carry `reviewNote` only for a rejected page; no public response ever does.
- **AC5** Given the author's rejected page, When they open it, Then `/contribute/submissions/<id>` shows h1 "Fix safety page", the admin's note above the form, the form filled in with exactly what was submitted, and the button "Resubmit for review".
- **AC6** Given the fix form, When the author changes the photo and the Safe operation text and presses "Resubmit for review", Then the page is pending again with today's date and no note.
  - While it is sent the button reads "Resubmitting…" and is disabled.
  - `PUT` answers 200 `Submission` with `status: "PENDING"`, a new `submittedAt` and `reviewNote: null`; in one transaction the reviewer, the date and the note are cleared and `version` goes up by 1.
  - The browser shows `/contribute` with `status` "Rotary evaporator was resubmitted and is waiting for review."; the row says "Status: Pending" with no note.
  - "Pages to review" lists it again with the resubmission date, after the pages submitted before that date.
- **AC7** Given the fix form, When the author clears a required field, or breaks any rule of S03.1 AC9–AC13, and resubmits, Then it is refused with the same error summary and field messages as on the new-page form; a `PUT` with such a body sent straight to the server answers 400 `VALIDATION_FAILED` naming the field, and the page stays rejected with its note.
- **AC8** Given someone else's rejected page, When it or its photo is read, or a change or resubmission is sent, Then only the author and admins can read it, and only the author can change it.
  - `GET /api/submissions/:id`: the author and an admin 200; an anonymous visitor, a pending account, a rejected account and another approved contributor 404 `NOT_FOUND`, with the same body as an unknown id.
  - `PUT /api/submissions/:id` with a complete valid body: the author 200; an admin and all the others 404, and the page is unchanged.
  - `GET /api/photos/:id` of its photo: the author and an admin 200; all the others 404.
- **AC9** Given "Rotary evaporator" while it is rejected, When an anonymous visitor in a fresh browser asks for it, Then `/instruments/rotary-evaporator`, `GET /api/instruments/rotary-evaporator` and its photo all answer "not found"; and after it is resubmitted with a new photo and approved, the new photo is public while the replaced photo still answers "not found" to them (its owner can still open it) (M3).
- **AC10** Given `/contribute/submissions/<id>` of a rejected page, When it loads, Then `status` "Loading…" shows; When the page is someone else's, Then "Page not found"; When loading fails, Then `alert` "Couldn't load this page, try again." with "Retry"; When resubmitting fails, Then the form's failure messages appear and everything typed stays; and a background refresh never resets the form.
- **AC11** Given a 375 px and a 1280 px wide window, When the preview with the note field and the fix form are shown, Then nothing scrolls sideways; and `pnpm e2e` runs the journey C2–C8 at both widths: submit → preview → reject with the note → "Rejected" with the note → fix the photo and Safe operation → resubmit → "Pending" with no note → back in "Pages to review" with the new date → approve → "Approved" with the link → the anonymous visitor sees the public page, after getting "not found" while it was pending and while it was rejected, and "not found" for the replaced photo.

## Out of scope

- A list of earlier rejections or notes; the old note is gone after resubmitting (PRD §6).
- Saving a rejected page without resubmitting it (epic open question 5).
- Withdrawing or deleting one's own page; any notification of the outcome.
- The form's photo and wording fixes (S04.4).

## API contract

Shared changes:

- `review.ts`: `RejectSubmissionRequest { note: string }`, trimmed, 1–1,000 characters; missing or only spaces: "Enter a note for the contributor"; too long: "The note must be at most 1000 characters".
- `submissions.ts`: `Submission` and `SubmissionSummary` gain `reviewNote: string | null`, set only for a rejected page.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| POST | /api/admin/submissions/:id/reject | Admin | `SubmissionIdParam`, `RejectSubmissionRequest` → 200 `ReviewDecision { status: "REJECTED", slug }` | 400 `VALIDATION_FAILED` (`note`, id), 401, 403 (role or origin), 404, 409 `ALREADY_REVIEWED` |
| PUT | /api/submissions/:id | Public guard; the approved author | `SafetyPageContent` → 200 `Submission`; a rejected page becomes `PENDING` with a new `submittedAt` | as S04.2 |
| GET | /api/submissions/mine, /api/submissions/:id | as E03 | with `reviewNote` | as E03 |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/admin/review/:id` | "Rejecting…", decision buttons disabled | — | "Enter a note for the contributor" next to the field; the S04.2 `alert`s | → `/admin/review` with the AC1 confirmation |
| `/contribute` | as E03 | as E03 | as E03 | a rejected row: "Status: Rejected", "Admin's note: …", the name links to the fix form |
| `/contribute/submissions/:id` (rejected) | `status` "Loading…"; "Resubmitting…", disabled | — | "Page not found"; `alert` + "Retry"; the form's error summary and failure messages | h1 "Fix safety page", the note, the filled form; → `/contribute` with the AC6 confirmation |

## Approach

- **API:** `ReviewService.reject` as one conditional update of a `PENDING` revision (pattern: `UsersService.decideSignUp`, then the 404 or 409 lookup). `SubmissionsService.update`: a `REJECTED` revision of the author is resubmitted in the same transaction as a correction, with `submitted_at` now and the review columns cleared (E04-D5). `read` and `listMine` return the note only when rejected.
- **Web:** the note field and "Reject" in `DecisionPanel.tsx`, checked with the shared `RejectSubmissionRequest` before sending. `EditSafetyPagePage` chooses by `status`: pending edit (E03), rejected fix, approved message (S04.2). `MySubmissions.tsx` shows the note.
- **e2e:** `e2e/tests/review-journey.spec.ts` runs C2–C8 with the S04.1 and S04.2 helpers.

## Tickets

1. [BE-01 Reject with a note](be/BE-01-reject.md)
2. [BE-02 Fix and resubmit](be/BE-02-fix-resubmit.md)
3. [FE-01 Reject on the preview](fe/FE-01-reject-on-preview.md)
4. [FE-02 Rejected pages for the contributor](fe/FE-02-rejected-for-contributor.md)
5. [FE-03 Review journey test](fe/FE-03-review-journey.md)

## Known gaps

- F1 (minor, review round 1): with the pending edit form open, if an admin rejects the page meanwhile, a background refresh brings the note but it stays hidden; "Save changes" then resubmits and clears the note, so the author never sees the admin's feedback (`apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx:115`).
- ~~F2~~ fixed at `/complete-epic` (2026-11-26): `design.md` "Reviewed once" now says reject is one conditional update.
- B1 (minor, QA run 1): after resubmitting and a later approval, reloading `/contribute` still shows the old "…was resubmitted and is waiting for review." confirmation above a row saying "Approved" (the confirmation lives in the browser history entry; the same happens after a first submit, since S03.1).

## Verification

**GREEN** · 2026-11-26 · architect review round 1 APPROVE ([review.md](review.md)), no blocker or major; minors F1 and F2 open (F2 is for `/complete-epic`). `pnpm verify` exit 0 (shared 181, API unit 139, web 352, integration 406, docs-check OK). `pnpm e2e` 72 passed, with the C2–C8 review journey at 1280 px and 375 px. Every AC has a test titled `S04.3 AC<n>`: AC1 shared, integration and web; AC2 shared, integration and web; AC3 integration (also two admins at once) and web; AC4 shared, integration, web and e2e; AC5 web and e2e; AC6 integration, web and e2e; AC7 integration and web; AC8 integration; AC9 integration and e2e; AC10 web; AC11 e2e.

## Changes

- 2026-11-26 · `/complete-epic` (review F2): known gap F2 closed by the `design.md` update. No acceptance criterion changed.
