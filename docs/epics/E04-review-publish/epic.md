---
id: E04
title: Review and publish
status: done
covers: [US3, US4, US9, US11, US12, R1]
depends_on: [E03]
branch: epic/E04-review-publish
updated: 2026-11-26
---

# E04 Review and publish

## Goal

Nothing reaches students without an admin's approval. An admin checks each submitted page and approves or rejects it with a note; approved pages become public safety pages that a student can read at a glance on a phone, and contributors see the outcome and can fix a rejected page.

## Requirements

| Requirement | In this epic | Roles | The user sees |
| ----------- | ------------ | ----- | ------------- |
| US11 One list of pending pages and updates | The review list of every pending new page, oldest first. Only new pages exist until E05, so every item is marked "New"; the "Update" mark comes with US8 in E05. | Admin | "Pages to review" in the admin area: each row has the page name, "New", the contributor's name and the date it was submitted for review. With nothing pending: "No pages waiting for review." |
| US12 Preview, then approve or reject with a note | Opening an item shows the page exactly as the public page will show it, with Approve and Reject. Rejecting needs a note. Approving publishes at once and records the last-approved date and the approver. The live version next to an update comes with E05. | Admin | The preview with the contributor and submission date above it. After approving: a confirmation with a link to the public page. After rejecting: a confirmation. Either way the item leaves the list. |
| US3 Open a safety page | The public safety page at `/instruments/<name>`, open to anyone with no login, showing every PRD §4.1 field. | Anyone, including an anonymous student | The page with its photo and every field. On a phone, the hazard level, training, hazards, protective equipment and emergency number fill the first screen. |
| US4 Read the four guideline sections | The four sections on the public page and in the preview, always in order, with the emergency information at the top of the Emergency section. | Anyone | Before use · Safe operation · Do NOT · Emergency & first aid. The Emergency section starts with the phone number and lists the six emergency equipment items, each with its location or "Not applicable". |
| US9 See my submissions' status | "My submissions" shows Pending, Approved or Rejected for each new page. A rejected page shows the admin's note and can be fixed and resubmitted. Updates join the list in E05. | Approved contributor, admin (as a contributor) | Each row: name, submission date, status. Rejected rows show the note; opening one shows the filled-in form with the note above it and a "Resubmit for review" button. Approved rows link to the public page. |
| R1 Nothing is published without admin approval | Pending and rejected pages, and their photos, are "not found" for anonymous visitors. Only an approval makes a page public. Pending updates (E05), search (E06) and the assistant (E07) are covered in their epics. | Anonymous visitor, every non-admin | "Page not found" at the page address and at the photo address until the page is approved. |

This epic also closes:

- **NFR4** (partly met since E02): the refusal tests for every new admin action (review list, preview, approve, reject), and the "someone else's draft" tests for a *rejected* page. After E04, NFR4 is accepted; E05 must add delete to the same tests.
- **Three known gaps from E03** in the safety page form, which E04 reuses to fix and resubmit a rejected page (see Scope and open question 1).

## Rules

**Review (US11, US12)**

- Only an approved **admin** sees the review list, opens a preview, approves or rejects. Refused, by the server: an anonymous visitor, a pending account, a rejected account and an approved contributor, also when that contributor wrote the page. A refusal never shows any of the page's content.
- The list shows every pending page, the admin's own included, oldest first by the date it was last submitted for review. A resubmitted page counts from its resubmission date. Correcting a page while it is still pending does not change its date.
- The preview shows the page exactly as the public page will: the same fields, the same order, the same layout, with the photo. A page that has never been approved has no "last approved" line.
- Rejecting needs a note; a note of only spaces counts as missing. The note is visible only to the author and to admins, never to the public.
- Approving publishes the page at once, records today's date and the approving admin, and gives the page its public address. An admin may approve their own page (PRD §7).
- A page is approved or rejected once. If a second admin acts on a page that has already been reviewed, the action is refused with "This page has already been reviewed." and nothing changes.
- An admin approves only what they saw. If the author saved a change after the admin opened the preview, approving is refused with "This page changed since you opened it. Review it again." and nothing is published (open question 3).
- An admin cannot change a page's content; they can only approve or reject it.

**Public page (US3, US4)**

- Anyone can open an approved page at its address, with no login. Its photo is public too.
- The page shows every §4.1 field that has a value: photo, name, manufacturer and model, category, lab room, short description, responsible person and contact, hazard level, training required and who gives it, each hazard with its note (or "No significant hazards"), the GHS pictograms, each protective equipment item with its note (or "No PPE beyond standard lab attire"), the four guideline sections, the emergency phone number, the six emergency equipment items, and "Last approved <date> by <admin's name>". An empty optional field is left out.
- The four guideline sections are always Before use, Safe operation, Do NOT, Emergency & first aid, in that order. The Emergency section starts with the emergency phone number, followed by the six emergency equipment items, each with its location or "Not applicable".
- On a phone (375 × 812, the size the browser tests use), the hazard level, training required, the names of the hazards, the names of the protective equipment items and the emergency phone number are visible without scrolling, for a page with up to 4 hazards and 4 protective equipment items. Notes and the photo may be further down.
- The hazard level is shown as a word with an icon, never by colour alone. Every GHS pictogram shows its name with its symbol.
- The page shows no contributor's name or email, and no admin's email.

**My submissions and fixing a rejected page (US9)**

- "My submissions" lists only the signed-in person's own pages, each as Pending, Approved or Rejected.
- Only the **author** can fix and resubmit their rejected page. "Resubmit for review" sends it back to the review list as pending; the same completeness and list rules apply as on first submission (R3, R4, R5). Saving a rejected page without resubmitting it is not offered.
- Once resubmitted, the old note is no longer shown. A new rejection shows the new note.
- A rejected page and its photo are visible only to the author and to admins. Everyone else gets "not found", never "no access": an anonymous visitor, a pending account, a rejected account and every other approved contributor. An admin can read it but not change or resubmit it.
- An approved page can no longer be changed from "My submissions"; the server refuses it. Changing a published page is "Suggest an update" in E05.

**Nothing leaks (R1, M3)**

- A pending or rejected page that has never been approved has no public address: `/instruments/<name>` and its photo address answer "not found" to an anonymous visitor, in the browser and through the server.
- Only the photo of a published page is public. A photo replaced while fixing a rejected page, or uploaded and never published, stays "not found" to the public, also after the page is approved.

**The shared safety page form (the E03 known gaps)**

- When a photo is shown and changing it fails, the error is announced on the photo control that keyboard and screen-reader users can reach, and the error summary's "Photo" link moves focus to it (S03.1 F1).
- When a photo upload fails after an earlier failed submit, only the photo's error is shown; the old submit-failure message disappears (S03.1 B1).
- Failure messages never name a button the form doesn't have. On the new-page form, the edit form and the fix form, "submit again" becomes "try again": "Couldn't reach LabSafe. Your page is still here; check your connection and try again." and "Your session has ended. Log in again in another tab, then try again here." (S03.2 note).

## Scope

- "Pages to review" in the admin area: pending new pages, oldest first, marked "New", with contributor and date; the empty message.
- The admin's preview, identical to the public page, with Approve, and Reject with a required note.
- Approving: publishing at once, the last-approved date and approver, the public address; the "already reviewed" and "changed since you opened it" refusals.
- The public safety page at `/instruments/<name>`: every §4.1 field, the four sections in order, the emergency information, and the first-screen rule on a phone.
- "My submissions" with Pending, Approved (linked to the public page) and Rejected (with the note); fixing and resubmitting a rejected page.
- The refusals under Rules, proven by automated tests that call the server directly: the admin actions and someone else's rejected page (NFR4), and the anonymous checks for pending and rejected pages and their photos (the E04 part of M3).
- The three E03 known gaps in the shared form: S03.1 F1, S03.1 B1 and the "submit again" wording.
- Every new page works at 375 px with no sideways scrolling (NFR2, cross-cutting).

## Out of scope

- Suggesting an update to a published page, the "Update" mark in the review list, the live version next to an update in the preview, and deleting pages (all E05: US8, US13, R6).
- Search, filters, and any public list of published pages; until E06 a student reaches a page only by its address (E06: US1, US2). The Lighthouse score (M5) and the full accessibility check (NFR3) are E06.
- The assistant (E07).
- Admins editing a page's content, a list of past rejections, change history, or showing earlier notes (change history is OUT in PRD §6).
- Withdrawing or deleting your own pending or rejected page.
- Email or any other notification of the outcome (PRD §6); the contributor checks "My submissions".
- A four-eyes rule; an admin may approve their own page (PRD §7).
- Other known gaps: S03.1 F2, the second S03.2 note ("Edit safety page" shows briefly while loading), S03.3 F1 (waiting on the user), and the E02 gaps (S02.1 F2, S02.2 F2–F4 and the QA observation, S02.3 F1 and B1). They stay in the brief.

## Acceptance criteria

- [x] **C1** An admin opens "Pages to review" in the admin area. It lists every pending page oldest first, each with its name, "New", the contributor's name and the date it was submitted. With nothing pending it shows "No pages waiting for review."
- [x] **C2** The admin opens the pending "Rotary evaporator". The preview shows the page exactly as the public page in C8 does, with the contributor, the submission date, Approve and Reject above it.
- [x] **C3** Rejecting with an empty note, or a note of only spaces, is refused and asks for a note. Rejecting with the note "The photo is blurry; add the waste step to Safe operation." shows a confirmation, and the page leaves the list.
- [x] **C4** The contributor's "My submissions" shows "Rotary evaporator" as "Rejected" with the admin's note word for word. Opening it shows the form filled in with what was submitted, the note above it, and "Resubmit for review".
- [x] **C5** The contributor changes the photo and the Safe operation text and presses "Resubmit for review". A confirmation appears, "My submissions" shows "Pending" with no note, and the page is back in "Pages to review" with the resubmission date. Resubmitting with a required field cleared is refused in the same way as on the new-page form.
- [x] **C6** The admin approves the resubmitted page. A confirmation links to the public page, and the page leaves the list. The contributor's "My submissions" shows "Approved" with a link to the public page and no longer offers to edit it.
- [x] **C7** While the page was pending, and again while it was rejected, an anonymous visitor in a private window got "not found" at `/instruments/rotary-evaporator`, at the page's photo address and through the server. After approval, the photo replaced in C5 is still "not found" to them. An automated test checks all of it (M3).
- [x] **C8** After approval, an anonymous visitor in a private window opens `/instruments/rotary-evaporator` and sees every field the contributor filled in, the hazard level as a word with an icon, the GHS pictograms with their names, the four guideline sections in the order Before use, Safe operation, Do NOT, Emergency & first aid, the Emergency section starting with the phone number and listing the six equipment items with their location or "Not applicable", and "Last approved <today's date> by <the admin's name>".
- [x] **C9** At 375 × 812, on a page with 4 hazards and 4 protective equipment items, the hazard level, training required, the hazard names, the protective equipment names and the emergency phone number are visible without scrolling, and nothing scrolls sideways. An automated browser test checks it.
- [x] **C10** An approved contributor who opens "Pages to review" or a preview address in the browser is refused and sees no page content.
- [x] **C11** Automated tests that call the server directly show that an anonymous visitor, a pending account, a rejected account and an approved contributor (also the page's own author) are refused the review list, the preview, approve and reject; nothing changes, and no page content is returned.
- [x] **C12** Automated tests that call the server directly show that an anonymous visitor, a pending account, a rejected account and a second approved contributor get "not found" when they read someone else's rejected page or its photo, or try to change or resubmit it. The author can; an admin can read it but not change or resubmit it.
- [x] **C13** Automated tests that call the server directly show that an approved page can't be changed through "My submissions", and that approving or rejecting a page that has already been reviewed is refused with "This page has already been reviewed." and changes nothing.
- [x] **C14** An admin opens the preview, then the author saves a change to the pending page. The admin's approval is refused with "This page changed since you opened it. Review it again." and nothing is published; after reopening the preview, approving works. Checked by an automated test.
- [x] **C15** An admin submits a page as a contributor, finds it in "Pages to review" and approves it; it is published.
- [x] **C16** On the fix form with a photo shown, changing the photo to a PDF renamed to `.jpg` is announced on the photo control a keyboard user reaches, and the error summary's "Photo" link moves focus to that control (S03.1 F1).
- [x] **C17** After a submit fails while offline, the contributor goes online and uploads a photo that is refused. Only the photo's error is shown; the old submit-failure message is gone (S03.1 B1).
- [x] **C18** On the new-page form, the edit form and the fix form, a failed save or submit while offline says "Couldn't reach LabSafe. Your page is still here; check your connection and try again."; no failure message says "submit again".
- [x] **C19** "Pages to review", the preview, the fix form, "My submissions" and the public safety page work at 375 px with no sideways scrolling. `pnpm e2e` runs the journey C2–C8 at both widths.
- [x] **C20** `pnpm verify` and `pnpm e2e` pass.

## Requirement changes

None.

## Stories

| ID  | Story | Delivers | Covers | Status |
| --- | ----- | -------- | ------ | ------ |
| S04.1 | [See what's waiting for review and preview it](S04.1-review-queue-preview/story.md) | C1, C2 (preview), C10, C11 (list, preview), C19 | US11, US12, US4 | done |
| S04.2 | [Approve and publish; anyone can open the page](S04.2-approve-publish/story.md) | C2, C6, C7 (pending), C8, C9, C11 (approve), C13, C14, C15, C19 | US12, US3, US4, US9, R1 | done |
| S04.3 | [Reject with a note, then fix and resubmit](S04.3-reject-fix-resubmit/story.md) | C2–C5, C7, C11 (reject), C12, C13 (reject), C19 | US12, US9, R1 | done |
| S04.4 | [Clearer photo and failure messages in the form](S04.4-form-messages/story.md) | C16, C17, C18 | US9 | done |

## Build report

/build-epic E04 · 2026-11-25 to 2026-11-26 · all 4 stories done.

### Stories

| Story | Tickets | Review rounds | QA | Known gaps |
| ----- | ------- | ------------- | -- | ---------- |
| S04.1 See what's waiting for review and preview it | 6 (BE-01–02, FE-01–04) | 1 | run 1 PASS | F1, F2, B1 (F3 fixed in S04.2) |
| S04.2 Approve and publish; anyone can open the page | 8 (BE-01–04, FE-01–04) | 1 | run 1 PASS | F1, F2, F3 |
| S04.3 Reject with a note, then fix and resubmit | 5 (BE-01–02, FE-01–03) | 1 | run 1 PASS | F1, F2, B1 |
| S04.4 Clearer photo and failure messages in the form | 2 (FE-01–02) | 1 | run 1 PASS | F1, F2 |

### Acceptance criteria

| Criterion | Delivered | By |
| --------- | --------- | -- |
| C1 "Pages to review", oldest first, empty message | yes | S04.1 |
| C2 the preview matches the public page, with Approve and Reject | yes | S04.1, S04.2, S04.3 |
| C3 reject needs a note; confirmation | yes | S04.3 |
| C4 My submissions shows Rejected with the note; fix form | yes | S04.3 |
| C5 change photo and text, resubmit; back in the queue | yes | S04.3 |
| C6 approve; public link; My submissions shows Approved | yes | S04.2 |
| C7 nothing public while pending or rejected; replaced photo stays private | yes | S04.2, S04.3 |
| C8 the public page shows every field and "Last approved … by …" | yes | S04.2 |
| C9 at 375 × 812 the key safety facts are on the first screen | yes | S04.2 |
| C10 a contributor sees "No access" on the review pages | yes | S04.1 |
| C11 admin actions refuse every other role (server tests) | yes | S04.1, S04.2, S04.3 |
| C12 someone else's rejected page is "not found" (server tests) | yes | S04.3 |
| C13 approved pages can't be changed; reviewing twice is refused | yes | S04.2, S04.3 |
| C14 approving a page changed since the preview is refused | yes | S04.2 |
| C15 an admin can review their own page | yes | S04.2 |
| C16 photo errors reach keyboard users (E03 gap S03.1 F1) | yes | S04.4 |
| C17 the old failure message clears on a new photo (E03 gap S03.1 B1) | yes | S04.4 |
| C18 "try again" instead of "submit again" | yes | S04.4 |
| C19 375 px everywhere; the C2–C8 journey at both widths | yes | S04.1–S04.3 |
| C20 `pnpm verify` and `pnpm e2e` pass | yes | final checks below (no story lists it) |

### Findings and bugs

- **Fixed:** S04.1 F3 (`apps/api/CLAUDE.md` module list, by S04.2 BE-04); E03 gaps S03.1 F1, S03.1 B1 and the "submit again" wording (S04.4).
- **Disputed:** none.
- **Known gaps (minor, not fixed):**
  - S04.1 F1: an unused label helper (`emergencyEquipmentLabel`).
  - S04.1 F2: the e2e photo check also passes on a broken image.
  - S04.1 B1: an unknown preview id shows "Loading…" for about 1 s, because a 404 is retried once (app-wide `retry: 1`).
  - S04.2 F1: an out-of-date comment in `photos.controller.ts`.
  - ~~S04.2 F2: the 400 for a page address over 200 characters isn't in the contract text~~ → fixed at `/complete-epic`.
  - S04.2 F3: if "Reload the page" itself fails, the old preview stays with no message.
  - S04.3 F1: a rejection that arrives while the author has the edit form open stays hidden; saving resubmits and clears the note.
  - ~~S04.3 F2: `design.md` says reject locks `FOR UPDATE`; it is a conditional update~~ → fixed at `/complete-epic`.
  - S04.3 B1: an old confirmation on `/contribute` survives a reload (it lives in the browser history entry; since S03.1).
  - S04.4 F1: "Change photo" is disabled while uploading, so a keyboard user loses focus (since E03).
  - S04.4 F2: a photo message can be announced twice (error summary and the photo's live region).

### Migrations

- `1795653173748-AddReviewAndPublishing` (S04.2 BE-02): adds `slug` and `published_revision_id` to `instruments`, and `reviewed_by`, `reviewed_at`, `review_note` and `version` to `instrument_revisions`, with their checks, the composite foreign key and two indexes. Reviewed and approved by the user; **ran on the development database** on 2026-11-26.

### Differences from the design recorded by the developers

- The review CHECK is stricter than S04.2 AC3's list: a pending revision may not keep a reviewer or review date (fits E04-D5).
- The migration's slug unique constraint was renamed by hand to `instruments_slug_key`; the composite foreign key needed no fallback.
- Approving a rejected page is also 409 `ALREADY_REVIEWED`. Reject uses one conditional update instead of a `FOR UPDATE` lock; a test proves only one of two simultaneous rejects wins.
- A page address over 200 characters gets 400 (the shared schema's limit); the web shows "Page not found" without a request.
- New contract fields (`slug`, `version`, `reviewNote`) required fixture-only additions in the web tests (twice, by frontend-dev) and in a few API tests' expected bodies.
- Existing tests changed without loosening (each accepted in review): S03.2's "no longer pending" test now expects the author's resubmit (and checks 404 for more callers); one S04.1 test now checks no Approve/Reject button inside the page view rather than on the whole preview; the "submit again" texts in five web tests and the network-drop spec.
- Moved code: the content mapping into `instruments/`, `formatDate` and `ghs-symbols.ts` into `apps/web/src/components/`.
- The edit page decides edit or fix once, when the form first shows; an open form is never replaced by a background refresh (E03-D7).
- The preview's heading is always "Review a new page"; updates arrive in E05.

### Where to look first

- `apps/api/src/modules/review/review.service.ts`: approve (locks, version, slug) and reject.
- `apps/api/src/modules/submissions/submissions.service.ts` (`update`): edit, resubmit and the 409 for approved pages.
- `apps/api/src/modules/photos/photos.service.ts` and `instruments/published-instruments.query.ts`: what becomes public, and nothing else.
- `apps/web/src/components/safety-page-view/SafetyPageView.tsx`: one view for the preview and the public page.
- `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx`: edit and fix modes (S04.3 F1).
- `apps/web/src/components/safety-page-form/PhotoField.tsx`: the photo control fixes (S04.4 F1, F2).

### Checks (final, 2026-11-26)

- `pnpm verify`: pass — shared 181, API unit 139, web 377, API integration 406 tests; docs-check OK.
- `pnpm e2e`: 72 passed (36 at 1280 px, 36 at 375 px).
- `node .claude/tools/docs-check.mjs`: OK (118 docs, 8 epics).

### How to try it

Run `pnpm qa:serve` and open `http://localhost:4100`. The setup admin is `setup.admin@labsafe.test` / `setup-admin-password`.

1. **Contributor:** sign up and have the admin approve you, then submit a page "Rotary evaporator" with `e2e/fixtures/instrument.jpg`.
2. **Admin:** open "Pages to review" → the page is listed as "New". Open it → the preview shows the page as the public will see it. Press "Reject" with an empty note → refused; write a note and reject → confirmation, and the row is gone.
3. **Contributor:** "My submissions" shows "Rejected" with the note. Open it → "Fix safety page" with the note above the form. Change the photo and Safe operation, press "Resubmit for review" → "Pending".
4. **Admin, two windows:** open the preview; as the contributor, save a small change; then press "Approve" → "This page changed since you opened it." Reload and approve → confirmation with "Open the public page".
5. **Anyone, private window:** open `/instruments/rotary-evaporator` → the page, its new photo and "Last approved <today> by Setup Admin". The old photo's address is "not found".
6. **Phone:** open the public page at 375 px wide → hazard level, training, hazards, PPE and the emergency number are visible without scrolling, and nothing scrolls sideways.
7. **Contributor:** in the edit form, turn the network off and save → "…check your connection and try again."; choose a PDF renamed to `.jpg` → the message is read on "Change photo", and the old failure message is gone.

## Verification

**GREEN** · 2026-11-26

No defect is open. The code on `epic/E04-review-publish` (no commits beyond `master`; all E04 work is uncommitted) matches [design.md](design.md), the four stories and the [design doc](../../technical-design/design-doc.md) after the updates listed under "Changes".

- **Stories:** S04.1, S04.2, S04.3 and S04.4 are `done`, each with review round 1 APPROVE, QA run 1 PASS and architect **GREEN** ([S04.1](S04.1-review-queue-preview/story.md), [S04.2](S04.2-approve-publish/story.md), [S04.3](S04.3-reject-fix-resubmit/story.md), [S04.4](S04.4-form-messages/story.md)). Every AC of the four stories (9 + 15 + 11 + 4) has at least one test titled `S04.x AC<n>` in `apps/api/test`, `apps/web/src`, `packages/shared/src` or `e2e/tests` (S04.1 AC9 and S04.2 AC5 in combined e2e titles). There is no `epic-review.md`; the epic had no feedback round.
- **Criteria C1–C20:** delivered as mapped in the story table and the build report; C20 by the final `pnpm verify` (shared 181, API unit 139, web 377, API integration 406, docs-check OK, 118 docs) and `pnpm e2e` (72 passed, 36 per width).
- **Access (NFR4, R1):** `@Admin()` on the whole `AdminReviewController` (`admin-review.controller.ts:20`) for the queue, the preview, approve and reject; `@Public()` on `InstrumentsController` (`instruments.controller.ts:8`), which reads only through `PublishedInstrumentsQuery` (`published-instruments.query.ts:27-55`); `GET /photos/:id` serves a non-admin only its own photo or a published revision's photo (`photos.service.ts:67-97`); `PUT /submissions/:id` locks `id AND submitted_by = me`, 409 for the author of an approved page, 404 for everyone else (`submissions.service.ts:133-192`). Refusal matrices over HTTP in `review-queue`, `review-approve` and `review-reject.int.test.ts` (C11), `rejected-pages.int.test.ts` (C12), `public-page.int.test.ts` and the C2–C8 journey in `e2e/tests/review-journey.spec.ts` (C7, M3).
- **Data rules:** where design.md "Data models" now puts them: approve in one `dataSource.transaction` that locks the revision and the instrument, checks status and `version` and picks the slug under `pg_advisory_xact_lock` (`review.service.ts:80-123`); reject as one conditional update (`review.service.ts:133-150`); every author save adds 1 to `version` under the row lock and a resubmission clears the review columns in the same `UPDATE` (`submissions.service.ts:157-175`). The CHECKs, the composite foreign key and the indexes are in `1795653173748-AddReviewAndPublishing.ts`, mirrored by the entities with identical names (schema builder and `down` checked in `review-tables.int.test.ts`); the user approved it and it ran on the development database on 2026-11-26.
- **Nothing leaks:** `PublishedSafetyPage` carries the approver's name only; the note is returned only for a rejected page (`noteOf` and `slugOf` in `submission.response.ts`); texts render as React text; the `tel:` link only for a dialable number (`EmergencyPhone.tsx`).
- **Web:** the routes in `apps/web/src/App.tsx` match the page list in `apps/web/CLAUDE.md` (`/instruments/:slug` outside every gate; `/admin/review` and `/admin/review/:id` under `RequireAccount level="admin"`); one `SafetyPageView` for the preview and the public page.
- **Deviations recorded:** in the tickets' implementation notes and the build report, now also in design.md, the design doc, S04.2's contract and both `CLAUDE.md` files (see "Changes"). S04.2 F2 and S04.3 F2 are fixed by those updates; the E03 gaps S03.1 F1, S03.1 B1 and the S03.2 "submit again" note are marked fixed by S04.4 in [S03.1](../E03-write-submit-page/S03.1-write-submit-page/story.md) and [S03.2](../E03-write-submit-page/S03.2-edit-pending-page/story.md).
- **Open minor gaps (not defects):** S04.1 F1, F2, B1; S04.2 F1, F3; S04.3 F1, B1; S04.4 F1, F2.
- **For the user to decide (acceptance criteria are frozen):** S03.1 AC17 still quotes the two old "submit again" texts, which E04 C18 replaced; a "Changes" line in S03.1 records it, the AC text was not edited.
- **For the product-manager:** `docs/BRIEF.md` still lists S03.1 F1, S03.1 B1 and the S03.2 "submit again" note as open. NFR4 can be accepted for E04; E05 must add delete to the same refusal tests.
- **For the main session:** the build report's "Known gaps" still list S04.2 F2 and S04.3 F2, which are now fixed.

## Open questions

1. **Do the three E03 known gaps in the safety page form belong in E04?** Chosen: yes, all three. Fixing a rejected page sends the contributor back through the same form, and an admin's note will often ask for a better photo, so the photo path (S03.1 F1, B1) becomes a main path, not an edge case. The "submit again" wording must be settled anyway now that a third button, "Resubmit for review", appears. All three are small. The other known gaps stay in the brief.
2. **What should the failure messages say instead of "submit again"?** Chosen: "try again" on all three forms (C18), so the same messages fit any button. The alternative, naming each form's own button, means three sets of texts for one meaning.
3. **What if the author changes a pending page while an admin is reviewing it?** Chosen: the approval is refused and the admin reviews it again (C14). Otherwise an admin could publish text they never saw, which breaks R1's "nothing is published without admin approval". The simpler alternative, locking a page against edits once an admin opens it, would block the author with no way to know why. If you'd rather accept this risk for a small lab, C14 can be dropped.
4. **Does the public page name the approving admin?** Chosen: yes, by name only ("Last approved <date> by <name>"), because US3 asks for every §4.1 field and §4.1 lists the approver. No email is shown. The contributor is not named, as the contributor is not a §4.1 field.
5. **Can the contributor save a fix to a rejected page without resubmitting it?** Chosen: no. Saving a rejected page is resubmitting it. A saved-but-rejected state would be a new status that the PRD doesn't ask for.
6. **Where does a resubmitted page sit in the review list?** Chosen: by its resubmission date, so it goes to the end. It is a new request for review; and the oldest-first order stays simple to explain.
7. **What does "visible without scrolling" cover for a page with many hazards?** Chosen: the hazard and protective equipment *names* (not their notes) on a 375 × 812 screen, for a page with up to 4 hazards and 4 items, which covers a typical instrument like the rotary evaporator. A page with more may push the last names below the first screen.
8. **Can a student find approved pages before search exists?** Chosen: only by the page address. A public list of pages would be a stopgap that search replaces in E06; it is not built.

## Changes

- 2026-11-25 · Goal, requirements, rules, scope, out of scope, acceptance criteria C1–C20 and open questions written from the epic list's goal, scope and exit criteria (`/design-epic`, first design). The old exit criteria became C2–C6 (queue, preview, reject, fix and resubmit, approve), C8 (public page), C9 (375 px), C7 (anonymous "not found") and C20. The old scope's `SafetyPageView` and "published pointer in one transaction" are technical choices left to the architect's design.md; this epic states only what the user sees and that the preview matches the public page. The old "Change requests" section was dropped. Known gaps S03.1 F1, S03.1 B1 and the S03.2 "submit again" note moved into scope (open question 1). No requirement changes.
- 2026-11-25 · Technical design ([design.md](design.md)), stories S04.1–S04.4 with their tickets, and the story table added (`/design-epic`, first design). C20 (`pnpm verify` and `pnpm e2e` pass) is met by every story's checks.
- 2026-11-26 · `/complete-epic`: deviations recorded. [design.md](design.md): reject is a conditional update, not `FOR UPDATE` (S04.3 F2), and approving a rejected page is 409; the approve sequence also locks the instrument; `GET /instruments/:slug` lists the 400 for a slug over 200 characters (S04.2 F2), also in [S04.2](S04.2-approve-publish/story.md)'s contract; constraint and index names as built; the slug CHECK without a length limit; `PublishedInstrumentsQuery` also filters `APPROVED`; `ReviewModule`'s imports; public photos keep `private, no-cache`; the approved edit page's h1 and the edit-or-fix choice; the composite foreign key risk closed; the migration run. [Design doc](../../technical-design/design-doc.md) §2, §3 (`reviewed_at`, `version`, slug rules, I2, I9, I11), §4 (`GET /admin/submissions/:id`, approve by version, `PUT` on rejected and approved pages) and §8 (`ALREADY_REVIEWED`, `SUBMISSION_CHANGED`). `apps/api/CLAUDE.md` (`review` also rejects) and `apps/web/CLAUDE.md` (S04.4 on the form pages; the page list was otherwise complete). E03: S03.1 F1, B1 and the S03.2 note marked fixed by S04.4; S03.1 AC17's superseded texts noted, AC unchanged. No acceptance criterion changed. Verification written: GREEN.
- 2026-11-26 · `/complete-epic` (product-manager): C1–C20 ticked from the story Verifications, the `S04.x AC<n>` tests (every AC of the four stories has one; S04.1 AC9 and S04.2 AC5 in combined e2e titles), QA run 1 of each story (PASS) and the final checks (`pnpm verify` pass, `pnpm e2e` 72 passed, docs-check OK). Acceptance log entry E04 GREEN added to the [PRD](../../prd/PRD.md) §8: US3, US4, US11, US12, US9 and NFR4 accepted; R1 met for pending and rejected pages and stays partly met until pending updates (E05), search (E06) and the assistant (E07) have shown 0 leaks. No requirement changes. S03.1 AC17's superseded texts left for the user to decide.
