---
id: S04.1
epic: E04
title: See what's waiting for review and preview it
type: feature
status: done # draft | building | in-review | qa | done
covers: [US11, US12, US4]
points: 5
updated: 2026-11-26
---

# S04.1 See what's waiting for review and preview it

| **Status** | see `status:` above |
| --- | --- |
| **Story points** | see `points:` above |
| **Epic criteria** | C1, C2 (the preview; Approve comes with S04.2, Reject with S04.3), C10, C11 (list, preview), C19 (list, preview) |
| **Design** | [design.md](../design.md) |
| **UX/UI designs** | none |
| **Dependencies** | none |

## User story

As an admin, I want one list of every page waiting for review and a preview that looks exactly like the public page, so that I can check each page the way students will see it before I decide.

## Acceptance criteria

- **AC1** Given pending pages from two contributors and one from the admin themself, When an approved admin chooses "Pages to review" in the header, Then `/admin/review` shows h1 "Pages to review" and one row per pending page, the oldest submission first.
  - Each row: the page name as a link to `/admin/review/<id>`, "New", "Submitted by <contributor's name>", and "Submitted <date>" in the "My submissions" format (for example "25 Nov 2026").
  - The admin's own pending page is listed like any other.
  - Correcting a pending page (S03.2) doesn't change its date or its place.
  - `GET /api/admin/review-queue` answers 200 `ReviewQueue` with only `PENDING` revisions, ordered by `submittedAt`, then `id`; the items hold no content and no email.
- **AC2** Given no pending page, When the admin opens "Pages to review", Then it says "No pages waiting for review."
- **AC3** Given "Pages to review", When the list is loading, Then `status` "Loading pages to review…" shows; When loading fails, Then `alert` "Couldn't load the pages to review, try again." with a "Retry" button that loads it again; and a failed background refresh keeps the list on screen.
- **AC4** Given the list, When the admin opens "Rotary evaporator", Then `/admin/review/<id>` shows h1 "Review a new page", "Submitted by <contributor's name> on <date>", and under it the page as `SafetyPageView` shows it, with the photo and with the instrument's name as a level-2 heading.
  - There is no "Last approved" line, because the page has never been approved.
  - `GET /api/admin/submissions/:id` answers 200 `ReviewSubmission` with `page.lastApproved` null and `page.labRoom` filled in.
- **AC5** Given a page with every field filled in, When `SafetyPageView` shows it, Then it shows, in this order: the name, the manufacturer and model, an "at a glance" block, the photo, the category, the lab room, the short description, the responsible person and contact, each hazard with its note, the GHS pictograms, each protective equipment item with its note, then Before use, Safe operation, Do NOT and Emergency & first aid.
  - The at-a-glance block: "Hazard level: Medium" as a word with an icon (never colour alone), "Training required before first use: Yes, given by Dr. Lee" (or "No"), the hazard names, the protective equipment names, and "Emergency: 112".
  - Each GHS pictogram shows its symbol with its name; the symbol image is decorative (`alt=""`).
  - "No significant hazards" and "No PPE beyond standard lab attire" are shown when chosen.
  - The lab room reads "<name> (<code>)". The category and every list value use the PRD §4.2 labels.
  - Emergency & first aid starts with the emergency phone number, then lists the six emergency equipment items, each with its location or "Not applicable", then the contributor's text.
  - An empty optional field (manufacturer, model, pictograms, a protective equipment note) is left out, with no empty heading.
  - Line breaks in the texts are kept; text like `<b>` shows as typed and is never run as HTML.
  - The view shows no contributor name and no email.
- **AC6** Given `/admin/review/<id>`, When the page is loading, Then `status` "Loading…" shows; When the id is unknown or malformed, Then it shows "Page not found" (a malformed id sends no request); When loading fails, Then `alert` "Couldn't load this page, try again." with a "Retry" button.
- **AC7** Given a pending page, When `GET /api/admin/review-queue` or `GET /api/admin/submissions/:id` is called by someone who is not an approved admin, Then nothing is returned except the error, and no page name or content.
  - An anonymous visitor: 401 `UNAUTHENTICATED`.
  - A pending account, a rejected account and an approved contributor, also the page's own author: 403 `FORBIDDEN`.
  - An admin with an unknown id gets 404 `NOT_FOUND`, and with a malformed id 400 `VALIDATION_FAILED`.
- **AC8** Given an approved contributor, When they open `/admin/review` or `/admin/review/<id>` in the browser, Then they see "No access" and none of the page's content, and their header has no "Pages to review" link. An anonymous visitor is sent to log in.
- **AC9** Given a 375 px and a 1280 px wide window, When "Pages to review" and the preview are shown, Then nothing scrolls sideways; and `pnpm e2e` runs at both widths: a contributor submits a page with its own name → the admin finds it in "Pages to review" → opens it → the preview shows the contributor, the date and every filled-in field; an approved contributor at both addresses sees "No access".

## Out of scope

- Approving (S04.2) and rejecting (S04.3), so no Approve or Reject button yet.
- The public page at `/instruments/<slug>` (S04.2). This story builds the `SafetyPageView` it will reuse.
- The "Update" mark and the live version next to an update (E05).
- Paging or filtering the list.

## API contract

Shared, in `packages/shared/src/schemas/instruments.ts`:

- `SafetyPageDisplay { content: SafetyPageContent, labRoom: LabRoom, lastApproved: { at: ISO date-time, approverName: string } | null }`. The one shape `SafetyPageView` renders (E04-D1).

In `packages/shared/src/schemas/review.ts`:

- `ReviewQueueItem { id: uuid, name: string, kind: RevisionKind, submittedBy: { id: uuid, name: string }, submittedAt: ISO date-time }`
- `ReviewQueue { items: ReviewQueueItem[] }`
- `ReviewSubmission { id: uuid, kind, status: RevisionStatus, submittedAt, submittedBy: { id, name }, page: SafetyPageDisplay }`. S04.2 adds `version`.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| GET | /api/admin/review-queue | Admin | → 200 `ReviewQueue` | 401 `UNAUTHENTICATED`, 403 `FORBIDDEN` |
| GET | /api/admin/submissions/:id | Admin | `SubmissionIdParam` → 200 `ReviewSubmission` (any status) | 400 malformed id, 401, 403, 404 `NOT_FOUND` |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/admin/review` | `status` "Loading pages to review…" | "No pages waiting for review." | `alert` "Couldn't load the pages to review, try again." + "Retry"; a contributor sees "No access" | h1 "Pages to review"; rows as AC1 |
| `/admin/review/:id` | `status` "Loading…" | — | "Page not found"; `alert` "Couldn't load this page, try again." + "Retry"; a contributor sees "No access" | h1 "Review a new page", "Submitted by … on …", the `SafetyPageView` |
| header | — | — | — | "Pages to review" link for approved admins only |

## Approach

- **API:** a new `review` module (`src/modules/review/`): `AdminReviewController` with `@Admin()` on the class (pattern: `admin-users.controller.ts`), `ReviewService`, `review.response.ts`. Move the content mapping out of `submissions/submission.response.ts` into `src/modules/instruments/` (a content mapper and a `SafetyPageDisplay` mapper) and use it from both modules. One query each, joining the child rows, the room and the submitter (pattern: `SubmissionsService.loadSubmission`). The queue query has no index of its own until S04.2's migration (design "Data models").
- **Web:** `src/components/safety-page-view/` (`SafetyPageView` and its parts; reuse `GHS_SYMBOLS` and the shared list labels). Hooks in `src/api/review.ts`. Pages `src/pages/admin-review/` and `src/pages/admin-review-submission/` under `RequireAccount level="admin"` (pattern: `admin-sign-ups/`). The header link goes in `AccountMenu.tsx`.
- **e2e:** `e2e/tests/review-queue.spec.ts`, review steps in a new `e2e/helpers/review.ts`; `fillCompletePage` takes the page name (default "Rotary evaporator").

## Tickets

1. [BE-01 Review contract](be/BE-01-review-contract.md)
2. [BE-02 Review queue and preview endpoints](be/BE-02-review-queue-preview-endpoints.md)
3. [FE-01 Safety page view](fe/FE-01-safety-page-view.md)
4. [FE-02 Pages to review](fe/FE-02-pages-to-review.md)
5. [FE-03 Preview page](fe/FE-03-preview-page.md)
6. [FE-04 Review queue journey test](fe/FE-04-review-queue-journey.md)

## Known gaps

- F1 (minor, review round 1): `emergencyEquipmentLabel` in `apps/web/src/components/safety-page-view/labels.ts` is exported but never used.
- F2 (minor, review round 1): the photo check in `e2e/tests/review-queue.spec.ts` only asserts `toBeVisible()`, which a broken image also passes.
- ~~F3~~ fixed in S04.2 BE-04: `apps/api/CLAUDE.md` now lists the `instruments` and `review` modules.
- B1 (minor, QA run 1): an admin opening `/admin/review/<unknown id>` sees "Loading…" for about 1 s and the request is retried on a 404 before "Page not found" (the app-wide `retry: 1`).

## Verification

**GREEN** · 2026-11-26 · architect review round 1 APPROVE ([review.md](review.md)), no blocker or major; minors F1–F3 open (F3 is for `/complete-epic`). `pnpm verify` exit 0 (shared 142, API unit 133, web 279, integration 295, docs-check OK). `pnpm e2e` 62 passed, with the S04.1 journey at 1280 px and 375 px. Every AC has a test titled `S04.1 AC<n>`: AC1 shared, integration, web and e2e; AC2 integration and web; AC3 web; AC4 shared, integration, web and e2e; AC5 web; AC6 web; AC7 integration; AC8 web and e2e; AC9 e2e.

## Changes
