---
id: S04.2
epic: E04
title: Approve and publish; anyone can open the page
type: feature
status: done # draft | building | in-review | qa | done
covers: [US12, US3, US4, US9, R1]
points: 8
updated: 2026-11-26
---

# S04.2 Approve and publish; anyone can open the page

| **Status** | see `status:` above |
| --- | --- |
| **Story points** | see `points:` above |
| **Epic criteria** | C2 (Approve; the preview matches the public page), C6, C7 (while pending, and after approval), C8, C9, C11 (approve), C13 (approve, an approved page can't be changed), C14, C15, C19 (public page, My submissions) |
| **Design** | [design.md](../design.md) |
| **UX/UI designs** | none |
| **Dependencies** | S04.1 (the list, the preview and `SafetyPageView`) |

## User story

As an admin, I want to approve a page I have checked so that it is published at once at its own address, and as a student, I want to open that page on my phone with no login and see the hazards, protection and emergency number on the first screen, so that I know how to work safely at the bench.

## Acceptance criteria

- **AC1** Given the preview of the pending "Rotary evaporator", When the admin presses "Approve", Then the page is published and the admin is back on "Pages to review" with a confirmation.
  - While it is sent, the button reads "Approving…" and the decision buttons are disabled.
  - The server answers 200 `ReviewDecision { status: "APPROVED", slug: "rotary-evaporator" }`.
  - In one transaction, the revision becomes `APPROVED` with the admin as `reviewed_by` and the current time as `reviewed_at`, and the instrument gets its `slug` and `published_revision_id`.
  - `/admin/review` shows `status` "Rotary evaporator was approved and published." with a link "Open the public page" to `/instruments/rotary-evaporator`, and the row is gone.
- **AC2** Given a page being approved for the first time, When its address is chosen, Then it is made from the name in lowercase ASCII with hyphens and is unique.
  - "Rotary evaporator" → `rotary-evaporator`; "Büchi R-300 / Rotavapor" → `buchi-r-300-rotavapor`.
  - A second approved page named "Rotary evaporator" → `rotary-evaporator-2`, then `-3`.
  - A name with no letter or digit → `instrument`; the part made from the name is at most 80 characters and never ends in a hyphen.
  - Two approvals of same-name pages at the same time get two different addresses.
- **AC3** Given the database, When a row would break the publishing rules, Then it is refused, and the migration matches the entities.
  - Refused: a `published_revision_id` that belongs to another instrument; a slug without a published revision, or the other way round; two instruments with the same slug; a slug that isn't lowercase with hyphens; an `APPROVED` or `REJECTED` revision without reviewer and date; a `REJECTED` revision without a note, or with only spaces; a `PENDING` or `APPROVED` revision with a note; a `version` below 1.
  - The existing pending rows keep working: `version` is 1 and the review columns are empty.
  - The schema builder finds no difference from the entities, and `down` undoes the migration.
- **AC4** Given the approved page, When an anonymous visitor in a fresh browser opens `/instruments/rotary-evaporator`, Then they see every field the contributor filled in, as in S04.1 AC5, and "Last approved <today's date> by <the admin's name>".
  - `GET /api/instruments/rotary-evaporator` answers 200 `PublishedSafetyPage` with no contributor, no email, no review note and no `version`.
  - The page's photo answers 200 `image/jpeg` to the anonymous visitor.
  - The page has no contributor name and no email on screen.
- **AC5** Given the same page in the admin's preview before approval and on the public page after it, When the two `SafetyPageView`s are compared, Then their text is the same, field by field and in the same order, except the "Last approved" line.
- **AC6** Given `/instruments/<slug>`, When the page is loading, Then `status` "Loading safety page…" shows; When the slug is unknown or the page is not published, Then it shows "Page not found"; When loading fails, Then `alert` "Couldn't load this safety page, try again." with a "Retry" button.
- **AC7** Given a published page with 4 hazards and 4 protective equipment items, When it is opened at 375 × 812, Then the hazard level, the training answer, the four hazard names, the four protective equipment names and the emergency number are visible without scrolling, and nothing scrolls sideways.
- **AC8** Given a page that has already been approved, When an admin approves it again, Then it is refused with 409 `ALREADY_REVIEWED` "This page has already been reviewed." and nothing changes.
  - Of two admins approving at the same moment, exactly one gets 200; the reviewer stays the first admin.
  - In the browser, the second admin's preview shows `alert` "This page has already been reviewed." with a link "Back to pages to review".
  - Opening the preview of a page that is no longer pending shows "This page has already been reviewed." and no Approve button.
- **AC9** Given an admin who opened the preview, When the author saves a correction before the admin presses "Approve", Then approving is refused with 409 `SUBMISSION_CHANGED` "This page changed since you opened it. Review it again." and nothing is published; after reloading the preview, approving works.
  - Every save by the author adds 1 to the revision's `version`; `submittedAt` stays.
  - Nothing published means: the revision is still `PENDING`, and the instrument has no slug and no published revision.
  - In the browser, the `alert` comes with a "Reload the page" button that loads the current version.
- **AC10** Given the author's approved page, When they look at "My submissions", Then the row says "Status: Approved" and its name links to `/instruments/rotary-evaporator`; nothing offers to edit it.
  - `/contribute/submissions/<id>` for the approved page shows "This page was approved and can't be changed here." with the link "Open the public page", and no form.
  - `PUT /api/submissions/:id` by the author answers 409 `ALREADY_REVIEWED` and changes nothing; every other caller gets 404 `NOT_FOUND`.
  - An author who still has the edit form open when the page is approved sees "This page has already been reviewed." on saving, and the form stays.
  - `SubmissionSummary.slug` and `Submission.slug` are set only for an approved page.
- **AC11** Given a pending page, When `POST /api/admin/submissions/:id/approve` is called by someone who is not an approved admin, Then it is refused and nothing changes: an anonymous visitor 401, a pending account, a rejected account and an approved contributor, also the author, 403.
  - For an admin: a malformed id 400, an unknown id 404, a body without a whole `version` of at least 1 400 `VALIDATION_FAILED`, a foreign `Origin` 403.
- **AC12** Given a page, When an anonymous visitor asks for it before and after approval, Then they get "not found" while it is pending and the page after approval (M3).
  - While pending: `/instruments/<slug>` in the browser, `GET /api/instruments/<slug>` and the photo address all answer "not found".
  - After approval: all three answer with the page and its photo.
  - Another page that is still pending, and its photo, stay "not found".
- **AC13** Given an admin who submits a page from the contributor area, When they find it in "Pages to review" and approve it, Then it is published and the public page says "Last approved <date> by <their own name>".
- **AC14** Given the preview, When approving fails, Then the page stays as it is with one `alert` above the decision buttons.
  - Offline or the network fails: "Couldn't reach LabSafe. Check your connection and try again."
  - 401: "Your session has ended. Log in again in another tab, then try again here."
  - 403: "Only admins can review pages."
  - 500 or an answer outside the contract: "Something went wrong on our side. Try again."
- **AC15** Given a 375 px and a 1280 px wide window, When the public page and "My submissions" are shown, Then nothing scrolls sideways; and `pnpm e2e` runs at both widths: a contributor submits a page → the admin approves it from the preview → the confirmation link opens the public page → an anonymous visitor sees it → the contributor's "My submissions" shows "Approved" with the link.

## Out of scope

- Rejecting, the note, fixing and resubmitting (S04.3).
- Suggesting an update to a published page, deleting a page (E05). An address never changes, but only E05 can show it.
- Search or any public list of pages (E06).

## API contract

Shared changes:

- `packages/shared/src/errors.ts`: `ALREADY_REVIEWED`, `SUBMISSION_CHANGED` (409).
- `review.ts`: `ReviewSubmission` gains `version: int ≥ 1`. `ApproveSubmissionRequest { version: int ≥ 1 }`. `ReviewDecision { id: uuid, status: "APPROVED" | "REJECTED", slug: string | null }`.
- `instruments.ts`: `InstrumentSlugParam { slug: string, 1–200 characters }` (any other text is simply not found). `PublishedSafetyPage { slug: string, page: SafetyPageDisplay }` with `page.lastApproved` set.
- `submissions.ts`: `SubmissionSummary` and `Submission` gain `slug: string | null`, set only for an approved page.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| POST | /api/admin/submissions/:id/approve | Admin | `SubmissionIdParam`, `ApproveSubmissionRequest` → 200 `ReviewDecision` | 400, 401, 403 (role or origin), 404, 409 `ALREADY_REVIEWED`, 409 `SUBMISSION_CHANGED` |
| GET | /api/admin/submissions/:id | Admin | as S04.1, now with `version` | as S04.1 |
| GET | /api/instruments/:slug | Public | `InstrumentSlugParam` → 200 `PublishedSafetyPage` | 400 `VALIDATION_FAILED` (a slug over 200 characters), 404 `NOT_FOUND` |
| GET | /api/photos/:id | Public guard; the service decides | as E03, plus a published page's photo for anyone | 400, 404 |
| GET | /api/submissions/mine | Contributor | → 200 `MySubmissions` with `slug` | 401, 403 |
| GET | /api/submissions/:id | Public guard; author or admin | as E03, with `slug` | as E03 |
| PUT | /api/submissions/:id | Public guard; the author | as E03; every save adds 1 to `version` | as E03, plus 409 `ALREADY_REVIEWED` for the author of an approved page |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/admin/review/:id` | "Approving…", decision buttons disabled | — | AC8, AC9, AC14 `alert`s; "This page has already been reviewed." without buttons for a reviewed page | → `/admin/review` with the AC1 confirmation and link |
| `/instruments/:slug` | `status` "Loading safety page…" | — | "Page not found"; `alert` "Couldn't load this safety page, try again." + "Retry" | h1 the name, `SafetyPageView`, "Last approved … by …" |
| `/contribute` | as E03 | as E03 | as E03 | an approved row: "Status: Approved", the name links to the public page |
| `/contribute/submissions/:id` | as E03 | — | as E03; saving an approved page: "This page has already been reviewed." | approved: the AC10 message and link, no form |

## Approach

- **Data:** the epic's migration `AddReviewAndPublishing` (design "Data models", E04-D6), including `review_note` for S04.3. Entities mirror it with identical constraint names (pattern: E03's `CreateSafetyPageTables` and `safety-page-tables.int.test.ts`).
- **API:** `slugify` in `src/modules/instruments/slug.ts`. `ReviewService.approve` in one `dataSource.transaction`: lock the revision `FOR UPDATE`, check status and version, take `pg_advisory_xact_lock` before choosing a slug, update both rows (design "Design" sequence; pattern: `UsersService.changeRole`). `SubmissionsService.update` adds 1 to `version` and answers the author 409 for an approved page (E04-D8). A new `InstrumentsModule` with `InstrumentsController` (`@Public()`) and the exported `PublishedInstrumentsQuery` (design doc I1), used by `PhotosService.read` (E04-D7).
- **Web:** the decision panel above the view on `ReviewSubmissionPage`; `useApproveSubmission` in `src/api/review.ts`; `src/pages/safety-page/` for `/instruments/:slug` with `usePublishedPage` in `src/api/instruments.ts`; `MySubmissions.tsx` and `EditSafetyPagePage.tsx` for approved pages; a 409 on save shows the server's message.
- **e2e:** `e2e/tests/publish.spec.ts`. The 4-hazard page for AC7 is created and approved through the API with `request` contexts (a helper in `e2e/helpers/review.ts`), then opened in the browser.

## Tickets

1. [BE-01 Publishing contract](be/BE-01-publishing-contract.md)
2. [BE-02 Review and publishing columns](be/BE-02-review-publishing-columns.md)
3. [BE-03 Approve a page](be/BE-03-approve.md)
4. [BE-04 Public page and photo](be/BE-04-public-page-photo.md)
5. [FE-01 Approve on the preview](fe/FE-01-approve-on-preview.md)
6. [FE-02 Public safety page](fe/FE-02-public-safety-page.md)
7. [FE-03 Approved pages for the contributor](fe/FE-03-approved-for-contributor.md)
8. [FE-04 Publishing journey test](fe/FE-04-publishing-journey.md)

## Known gaps

- F1 (minor, review round 1): the comment at `apps/api/src/modules/photos/photos.controller.ts:53` is out of date; it doesn't say a published page's photo is now served to anyone.
- ~~F2~~ fixed at `/complete-epic` (2026-11-26): the story's contract and the API table in `design.md` list the 400 for a slug over 200 characters.
- F3 (minor, review round 1): "Reload the page" in `DecisionPanel.tsx` clears the alert before reloading; if the reload fails, the old preview stays with no message and the next Approve gets the same 409 again (nothing wrong is published).

## Verification

**GREEN** · 2026-11-26 · architect review round 1 APPROVE ([review.md](review.md)), no blocker or major; minors F1–F3 open (F2 is for `/complete-epic`). `pnpm verify` exit 0 (shared 171, API unit 139, web 311, integration 367, docs-check OK). `pnpm e2e` 70 of 70, with the publishing journey at 1280 px and 375 px. Every AC has a test titled `S04.2 AC<n>`: AC1 shared, integration, web and e2e; AC2 unit and integration (also two approvals at once); AC3 integration (each constraint by name, schema builder, `down`); AC4 shared, integration, web and e2e; AC5 e2e; AC6 integration and web; AC7 e2e; AC8 shared, integration (also two admins at once) and web; AC9 shared, integration and web; AC10 shared, integration and web; AC11 integration; AC12 integration and e2e; AC13 integration and e2e; AC14 web; AC15 e2e.

## Changes

- 2026-11-26 · `/complete-epic` (review F2): the API contract lists 400 `VALIDATION_FAILED` for `GET /api/instruments/:slug` with a slug over 200 characters (`InstrumentSlugParam`, S04.2 BE-04 notes). No acceptance criterion changed.
