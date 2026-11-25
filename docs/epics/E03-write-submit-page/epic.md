---
id: E03
title: Write and submit a safety page
status: done
covers: [US7, R3, R4, R5]
depends_on: [E02]
branch: epic/E03-write-submit-page
updated: 2026-11-25
---

# E03 Write and submit a safety page

## Goal

A contributor can write a complete safety page for an instrument, with nothing important left out, and submit it. The page waits as "pending" and nobody except its author and the admins can see it.

## Requirements

| Requirement | In this epic | Roles | The user sees |
| ----------- | ------------ | ----- | ------------- |
| US7 Add a new safety page | The new-page form with every PRD §4.1 field, the photo upload, submitting, and a first "My submissions" list that shows pending pages. The contributor can open their own pending page again and correct it. Approved and rejected statuses, the admin's note and resubmitting come with US9 in E04. | Approved contributor, admin (writing as a contributor) | A "New safety page" form in the contributor area, grouped as Identity, Risk at a glance, Hazards and protection, Guidelines, Emergency info. After submitting: a confirmation, and the page in "My submissions" with its name, the submission date and "Pending". With nothing submitted yet: "You haven't submitted any pages yet." |
| R3 A page cannot be submitted incomplete | Every ✓ field of PRD §4.1 is required. "No significant hazards" and "No PPE beyond standard lab attire" must be chosen explicitly. The server refuses an incomplete page too, not only the form. | Approved contributor, admin | Submitting with gaps shows one message that names every missing field at once. Nothing is saved until the page is complete. |
| R4 Fixed lists only | Hazard types, PPE items, GHS pictograms and categories come only from PRD §4.2; lab rooms come only from the initial data. Free text is allowed only in the notes and text fields. | Approved contributor, admin | Each list field offers exactly the fixed values, with no "other" or free-text entry. |
| R5 Hazard level definitions | The Low / Medium / High definitions are shown next to the hazard level field. A page with "training required" cannot be Low. | Approved contributor, admin | The three definitions, word for word from R5, beside the field. Choosing Low with training required is refused with "A page that requires training can't have a Low hazard level." |

This epic also closes two parts that E02 left open:

- **NFR4, "someone else's draft":** the server refuses anyone other than the author (and admins, for reading) every action on a pending page and its photo. US9 (fixing a rejected page) in E04 adds the rest.
- **US6, "cannot create pages until approved":** now that pages exist, the server refuses page creation and photo upload for pending and rejected accounts.

## Rules

**What a page must contain (R3, PRD §4.1)**

- Required: name, photo, category, lab room, short description, responsible person (a name and a contact), hazard level, training required (yes or no), hazards, PPE, all four guideline sections, the emergency phone number, and an answer for each of the six emergency equipment items.
- Optional: manufacturer, model, GHS pictograms, and the note on each PPE item.
- If training is required, "who gives it" is required too. If training is not required, it is not asked.
- **Hazards:** either one or more hazard types, each with a short note on how the hazard arises (the note is required), or "No significant hazards", chosen explicitly. Not both, and not neither.
- **PPE:** either one or more PPE items, each with an optional note, or "No PPE beyond standard lab attire", chosen explicitly. Not both, and not neither.
- **Emergency equipment:** eyewash, safety shower, fire extinguisher, spill kit, first-aid kit and emergency stop each get a location or an explicit "not applicable". Leaving one blank counts as missing.
- Each guideline section shows its prompt from PRD §4.1, and the four always appear in the order Before use, Safe operation, Do NOT, Emergency & first aid.
- A text field that holds only spaces counts as missing.
- The last-approved date and the approver are not on the form. E04 sets them on approval.

**Fixed lists (R4) and hazard level (R5)**

- A value that is not in the fixed lists, or a lab room that is not in the initial data, is refused by the server, even when the browser is bypassed.
- Training required and hazard level Low can't be combined. The server refuses it too.
- The hazard level is never shown by colour alone, and every GHS pictogram shows its name as well as its symbol (NFR3).

**Photo**

- Exactly one photo per page, JPEG or PNG, at most 5 MB. The file's real content decides the type, not its name: a renamed PDF is refused.
- A stored photo carries no location data (GPS) or other camera metadata (NFR5).

**Who may do what**

- Only **approved contributors and admins** can upload a photo, submit a page or edit a pending page. These are refused by the server: an anonymous visitor, a pending account and a rejected account.
- A pending page and its photo are visible only to the **author** and to **admins**. Everyone else gets "not found", never "no access", so nobody learns that the page exists: an anonymous visitor, a pending account, a rejected account and every other approved contributor.
- Only the **author** can edit their pending page. Another contributor gets "not found". An admin can read it (for the review in E04) but not edit it.
- "My submissions" lists only the signed-in person's own pages.
- Editing a pending page keeps it pending, so it is still invisible to the public. The same completeness and list rules apply as on first submission.
- A pending page never appears on any public page or at its future public address (`/instruments/<name>`), which shows "not found".

**Not losing the contributor's work**

- A short loss of connection while the form is open must not replace the form with an error or sign the contributor out on screen. Everything typed stays. (This is known gap S02.1 F4, fixed in this epic.)
- If submitting or saving fails because of a network or server error, the form stays filled in and says what went wrong and that the contributor can try again.

## Scope

- The "New safety page" form in the contributor area with every PRD §4.1 field, the §4.1 prompts for the guideline sections, and the R5 definitions beside the hazard level.
- Photo upload with the size and type checks; location data removed.
- Submitting a page as pending, with every missing field named (R3), fixed lists only (R4) and the training/Low rule (R5), checked by the server as well as the form.
- The lab rooms in the initial data, as placeholders (PRD §7 open question).
- "My submissions": the signed-in person's own pages with name, submission date and "Pending". Opening one shows the form filled in with what was submitted, including the photo, and the author can correct it and save it.
- The refusals listed under Rules, proven by automated tests that call the server directly (NFR4 draft part, US6, the E03 part of M3).
- Fixing known gap S02.1 F4, because from now on the page editor sits behind the account gate.
- Every new page works at 375 px wide (NFR2, cross-cutting).

## Out of scope

- The review queue, approving and rejecting, the admin's preview, the public safety page, the last-approved date, and "approved" or "rejected" in "My submissions" (all E04, US9, US11, US12, US3, US4).
- Fixing and resubmitting a rejected page (E04, US9).
- Suggesting an update to a published page, and deleting pages (E05).
- Search and filters (E06); the assistant (E07).
- Saving an unfinished page without submitting it, autosave, and a warning when leaving the form with unsaved changes. A page is either submitted complete or not saved.
- Withdrawing or deleting your own pending page.
- More than one photo per page; editing the fixed lists or the lab rooms in the app (PRD §6).
- Checking that a phone number or contact has a particular format.
- Other known gaps from E02 (S02.1 F2, S02.2 F2–F4 and the QA observation, S02.3 F1 and B1). They stay in the brief.

## Acceptance criteria

- [x] **C1** An approved contributor opens "New safety page" from the contributor area. The form shows every PRD §4.1 field under Identity, Risk at a glance, Hazards and protection, Guidelines and Emergency info, the four guideline sections in order with their prompts, and the R5 definitions next to the hazard level.
- [x] **C2** The category, hazard type, PPE and GHS pictogram choices offer exactly the PRD §4.2 lists, and the lab room choice offers exactly the rooms from the initial data, with no free-text option.
- [x] **C3** The contributor fills in a "Rotary evaporator" page with a JPEG photo and submits it. A confirmation appears, and "My submissions" shows "Rotary evaporator" with today's date and "Pending".
- [x] **C4** Submitting an empty form shows one message naming every required field, and nothing is saved. Submitting with only some gaps names exactly those, including: no hazards and no "No significant hazards", a hazard without its note, no PPE and no "No PPE beyond standard lab attire", an emergency equipment item with neither a location nor "not applicable", and training required without who gives it.
- [x] **C5** Choosing "No significant hazards" together with a hazard type, or "No PPE beyond standard lab attire" together with a PPE item, is refused.
- [x] **C6** Training required together with hazard level Low is refused with "A page that requires training can't have a Low hazard level."
- [x] **C7** Uploading a file larger than 5 MB is refused with a message that names the 5 MB limit. Uploading a PDF renamed to `.jpg` is refused with a message that only JPEG or PNG photos are accepted.
- [x] **C8** A JPEG with GPS coordinates in its metadata is uploaded. The photo the author downloads again contains no GPS data (checked by an automated test, or by hand with an EXIF viewer).
- [x] **C9** The author opens their pending "Rotary evaporator" from "My submissions" and sees the form filled in with what they submitted, including the photo. They change the description and save. It is still "Pending", and opening it again shows the new description. Clearing a required field while editing is refused in the same way as in C4.
- [x] **C10** In a private window with no login, opening `/instruments/rotary-evaporator` and the pending page's photo address both show "not found".
- [x] **C11** Automated tests that call the server directly, with no browser, show that an anonymous visitor, a pending account, a rejected account and a second approved contributor get "not found" when they read the pending page or its photo, or try to change it. The author can read and change it; an admin can read it but not change it.
- [x] **C12** Automated tests that call the server directly show that an anonymous visitor, a pending account and a rejected account are refused when they upload a photo or submit a page.
- [x] **C13** Automated tests that call the server directly show that a page with any required field missing, a value outside the fixed lists or the initial lab rooms, or training required with Low, is refused, and that the refusal names the field.
- [x] **C14** A second approved contributor's "My submissions" does not list the first contributor's page and shows "You haven't submitted any pages yet."
- [x] **C15** With the form half filled in, the contributor switches the browser offline, clicks away from the window and back, then goes online again. The form and everything typed are still there, and the header still shows their name. Submitting while offline keeps the form filled in and shows a message to try again.
- [x] **C16** The new-page form, the edit form and "My submissions" work at 375 px with no horizontal scrolling. `pnpm e2e` runs the submit journey (C3) at both widths.
- [x] **C17** `pnpm verify` and `pnpm e2e` pass.

## Requirement changes

None.

## Stories

| ID  | Story | Delivers | Covers | Status |
| --- | ----- | -------- | ------ | ------ |
| S03.1 | [Write and submit a new safety page](S03.1-write-submit-page/story.md) | C1–C8, C10, C11 (photo), C12, C13, C14, C15 (offline submit), C16, C17 | US7, R3, R4, R5 | done |
| S03.2 | [Correct my pending page; nobody else can](S03.2-edit-pending-page/story.md) | C9, C11, C13 (editing), C16 (edit form), C17 | US7, R3, R4, R5 | done |
| S03.3 | [Keep my work when the connection drops](S03.3-keep-work-offline/story.md) | C15, C17 | US7 | done |

## Build report

/build-epic E03 · 2026-11-24 to 2026-11-25 · all 3 stories done.

### Stories

| Story | Tickets | Review rounds | QA | Known gaps |
| ----- | ------- | ------------- | -- | ---------- |
| S03.1 Write and submit a new safety page | 9 (BE-01–04, FE-01–05) | 1 | run 1 PASS | F1, F2, F3, B1 |
| S03.2 Correct my pending page; nobody else can | 3 (BE-01, FE-01–02) | 1 (no findings) | run 1 PASS | 2 notes |
| S03.3 Keep my work when the connection drops | 1 (FE-01) | 1 | run 1 PASS | F1 |

### Acceptance criteria

| Criterion | Delivered | By |
| --------- | --------- | -- |
| C1 the form, its groups, guideline order and R5 definitions | yes | S03.1 |
| C2 only the fixed lists and the initial rooms | yes | S03.1 |
| C3 submit "Rotary evaporator" with a photo; listed as Pending | yes | S03.1 |
| C4 one message naming every missing field and each gap | yes | S03.1 |
| C5 "none" choices refused together with an item | yes | S03.1 |
| C6 training with Low refused | yes | S03.1 |
| C7 over 5 MB and wrong-type photos refused | yes | S03.1 |
| C8 GPS metadata removed | yes | S03.1 |
| C9 the author edits a pending page; it stays Pending | yes | S03.2 |
| C10 anonymous gets "not found" for the page and its photo | yes | S03.1, S03.2 |
| C11 others get "not found"; the author edits, an admin reads | yes | S03.1 (photo), S03.2 |
| C12 anonymous, pending and rejected can't upload or submit | yes | S03.1 |
| C13 the server refuses bad pages and names the field | yes | S03.1, S03.2 |
| C14 another contributor's "My submissions" stays empty | yes | S03.1 |
| C15 a network drop keeps the form and the name | yes | S03.1 (offline submit), S03.3 |
| C16 375 px with no sideways scroll | yes | S03.1, S03.2 |
| C17 `pnpm verify` and `pnpm e2e` pass | yes | final checks below |

### Findings and bugs

- **Fixed:** E02 known gap S02.1 F4 — a failed background refresh of the signed-in user no longer replaces the page or the header (S03.3).
- **Disputed:** none.
- **Known gaps (minor, not fixed):**
  - S03.1 F1: once a photo is shown, a failed photo change or a server `photoId` error isn't announced on any reachable control, and the error summary's "Photo" link does nothing.
  - S03.1 F2: the error summary skips errors at `hazards.<i>.type` (the form can't produce that path today).
  - ~~S03.1 F3~~: fixed at `/complete-epic` — design.md "Data" now has the training CHECK's `IS NOT NULL`, the extra CHECKs and the `search_vector` deferral.
  - S03.1 B1: after a failed submit, the submit-failure alert stays when a re-uploaded photo also fails.
  - S03.2 notes: the edit page's failure messages say "submit again" (S03.1 AC17 texts, required by AC6); while loading, h1 "Edit safety page" shows briefly even for a page that turns out not to be yours.
  - S03.3 F1: AC3's wording has the contributor submit a half-filled form offline, which can only show validation errors; the test completes the page first. Rewording needs your approval.

### Migrations

- `1795541562254-CreateSafetyPageTables` (S03.1 BE-02): creates `photos`, `instruments`, `instrument_revisions`, `revision_hazards` and `revision_protective_equipment`. Reviewed and approved by the user; **ran on the development database** on 2026-11-24.

### Differences from the design recorded by the developers

- Training CHECK: `training_given_by IS NOT NULL` added, because the design's version let "training required" with no trainer through (design.md to be updated).
- No `search_vector` column yet; left to the search epics E06 and E07.
- Contract choices left open by the ticket: message wording, issue paths for cross-field rules, and defaults for the lists and "none" choices (S03.1 BE-01 notes).
- Photo upload: an extra `photo-upload-errors.interceptor.ts` maps the upload library's size error to `PHOTO_TOO_LARGE` "The photo must be at most 5 MB."; dependencies `sharp` ^0.35.5 (with `allowBuilds`) and `@types/multer`.
- GHS pictograms: the nine UNECE symbols as public-domain SVGs from Wikimedia Commons (design open question 4); deleting `apps/web/src/assets/ghs/` falls back to names only.
- Submissions: `@Contributor()` per handler so `GET`/`PUT /submissions/:id` can be `@Public()` with the service deciding; hazards and PPE returned in PRD order.
- Web: the form uses the contract's field names; new shared components `TextArea`, `SectionFieldset`, `SelectField`, `RadioGroup`, `Checkbox`, `CheckboxWithNote`, `ChoiceGroup`; the test setup uses Node's `FormData`, `File` and `Blob`, and answers `/submissions/mine` with an empty list by default; `renderApp` also returns its `queryClient`.
- "Page not found" for an unknown submission id appears after one retry (about 1 s), because every query retries once.
- S03.3's e2e test forces a 500 on `/api/auth/me` and completes the page before the offline submit (see S03.3 F1).

### Where to look first

- `packages/shared/src/schemas/safety-page.ts`: the one schema for create and edit, browser and server.
- `apps/api/src/modules/photos/photos.service.ts`: re-encoding, metadata removal and who may see a photo.
- `apps/api/src/modules/submissions/submissions.service.ts`: submit, edit with the row lock, and the 404 rule.
- `apps/web/src/components/safety-page-form/PhotoField.tsx`: S03.1 F1.
- `apps/web/src/pages/edit-safety-page/EditSafetyPagePage.tsx`: filled once, kept through refresh failures.
- `apps/web/src/components/RequireAccount.tsx` and `AccountMenu.tsx`: the S02.1 F4 fix.

### Checks (final, 2026-11-25)

- `pnpm verify`: pass — shared 129, API unit 133, web 230, API integration 283 tests; docs-check OK.
- `pnpm e2e`: 58 passed (29 at 1280 px, 29 at 375 px).
- `node .claude/tools/docs-check.mjs`: OK (84 docs, 8 epics).

### How to try it

Run `pnpm qa:serve` and open `http://localhost:4100`. The setup admin is `setup.admin@labsafe.test` / `setup-admin-password`.

1. **Contributor:** sign up, then in a private window approve the account as the setup admin. Back in the first window, reload → the contributor area shows "New safety page" and an empty "My submissions".
2. **Contributor:** open "New safety page" and press "Submit for review" empty → one summary names every missing field. Tick "No significant hazards" plus a hazard, or choose training with Low → each is refused with its message.
3. **Contributor:** upload a photo over 5 MB, then a PDF renamed to `.jpg` → both refused. Upload `e2e/fixtures/instrument.jpg`, fill the page as "Rotary evaporator" and submit → confirmation, and the page is listed as Pending.
4. **Contributor:** click the name in "My submissions" → the form is filled in. Change the description and save → still Pending; reopening shows the change.
5. **Others:** in a private window with no login, open `/instruments/rotary-evaporator` → "Page not found". A second contributor's "My submissions" is empty.
6. **Network drop:** with the form half filled, turn the network off in the browser's developer tools, click away and back, turn it on → the form and your name stay. Complete the page, submit offline → "Couldn't reach LabSafe…", and the form stays filled.
7. **Phone:** open the form and "My submissions" at 375 px wide → nothing scrolls sideways.

## Verification

**GREEN** · 2026-11-25

No defect is open. The code on `epic/E03-write-submit-page` (no commits beyond `master`; all E03 work is uncommitted) matches [design.md](design.md), the three stories and the [design doc](../../technical-design/design-doc.md) after the updates listed under "Changes".

- **Stories:** S03.1, S03.2 and S03.3 are `done`, each with review round 1 APPROVE, QA run 1 PASS and architect **GREEN** ([S03.1](S03.1-write-submit-page/story.md), [S03.2](S03.2-edit-pending-page/story.md), [S03.3](S03.3-keep-work-offline/story.md)). Every AC of the three stories (20 + 8 + 3) has at least one test titled `S03.x AC<n>` in `apps/api/test`, `apps/web/src`, `packages/shared/src` or `e2e/tests`. There is no `epic-review.md`; the epic had no feedback round.
- **Criteria C1–C17:** delivered as mapped in the story table and the build report; C17 by the final `pnpm verify` (shared 129, API unit 133, web 230, API integration 283, docs-check OK) and `pnpm e2e` (58 passed, 29 per width).
- **Access (NFR4, US6):** `@Contributor()` per handler on `POST /photos` (`photos.controller.ts:36`), `GET /submissions/mine` and `POST /submissions` (`submissions.controller.ts:25,32`); `@Public()` with the service's single 404 on `GET /photos/:id` (`photos.service.ts:63-75`), `GET /submissions/:id` and `PUT /submissions/:id` (`submissions.service.ts:97-151`; `PUT` locks `id AND submitted_by = me AND status = 'PENDING'`, so an admin gets 404). The guards run before the upload interceptor, so a refused caller's file is never read. Refusal matrices run over HTTP in `photos.int.test.ts`, `submissions.int.test.ts` and `submission-edit.int.test.ts`.
- **Data rules:** where design.md "Data" now puts them: one shared `SafetyPageContent` for the form and both endpoints; the room and photo-owner checks and all writes inside one `dataSource.transaction`; CHECKs, foreign keys and composite keys in `1795541562254-CreateSafetyPageTables.ts`, mirrored by the entities (constraint names identical, schema-builder check in `safety-page-tables.int.test.ts`).
- **Privacy (NFR5):** every photo is re-encoded by `sharp` with no metadata kept (`photos.service.ts`); responses are built by `toSubmissionResponse`, `toSubmissionSummaryResponse` and `toPhotoResponse`, never entities, and carry no email or photo bytes.
- **Web:** the routes in `apps/web/src/App.tsx` match the page list in `apps/web/CLAUDE.md` (`/contribute`, `/contribute/new`, `/contribute/submissions/:id`, all under `RequireAccount level="contributor"`).
- **Open minor gaps (not defects):** S03.1 F1, F2, B1; the two S03.2 notes; S03.3 F1. S03.1 F3 is closed by the design.md update; E02's S02.1 F4 is fixed by S03.3 and marked in [S02.1](../E02-accounts-access/S02.1-signup-login/story.md).
- **For the user to decide (acceptance criteria are frozen):** S03.3 F1. AC3 has the contributor press "Submit for review" on a half-filled form while offline, which can only show the validation summary, never S03.1 AC17's network message; the e2e test completes the page before the offline submit. The proposed rewording, if you want it: "When they complete the page and press 'Submit for review' while offline, Then the form stays filled in with S03.1 AC17's network message; and When they submit once online, Then the S03.1 confirmation appears." Left unchanged until you approve it.
- **For the product-manager:** `docs/BRIEF.md` and the PRD acceptance log still list S02.1 F4 as open.

## Open questions

1. **Is known gap S02.1 F4 part of this epic?** Chosen: yes (scope, rule and C15). The page editor is the first long form behind the account gate, and a short network drop would throw away a whole typed page. The fix is small and belongs where the risk starts.
2. **Can the author edit a pending page in E03, or only from E04 with US9?** Chosen: in E03, as the epic list's scope says. It gives NFR4's "only your own draft" rule something to prove now, and the same form is used. Fixing a *rejected* page waits for E04.
3. **Can a contributor save an unfinished page and come back later?** Chosen: no. The PRD asks only for submitting a complete page, and a half-saved page would add a new status. The contributor keeps their work through C15 instead. A real draft feature needs `/change-request`.
4. **Is the note on each hazard required?** Chosen: yes. PRD §4.1 says each hazard comes "with a short note on how it arises" and marks only the PPE note as optional.
5. **Can two pages have the same name, for example two rotary evaporators in different rooms?** Chosen: yes, and nobody is refused. A lab can own two of the same instrument. The admin catches accidental duplicates in review (E04); the public address must still be unique, which is the architect's choice.
6. **May "No significant hazards" be combined with a Medium or High hazard level?** Chosen: allowed. The PRD has no rule against it, and the admin judges it in review. Adding a rule would need `/change-request`.
7. **How long can the short description and the text fields be?** Chosen: the short description is prompted as 1–3 sentences and limited to 500 characters. The other text fields get a generous limit, chosen by the architect, so normal content is never refused. Sentences are not counted.
8. **What happens to a photo that is uploaded but never submitted with a page?** Chosen: it stays stored, visible only to its owner and admins, and is never public. No clean-up is built.
9. **What if the 7-day session ends while the contributor is writing?** Chosen: the submit is refused with a message to log in again, and the form stays on screen. Keeping the typed page across a new login is not built; with a 7-day session this is rare.

## Changes

- 2026-11-24 · Goal, requirements, rules, scope, out of scope, acceptance criteria C1–C17 and open questions written from the epic list's goal, scope and exit criteria (`/design-epic`, first design). The old exit criteria became C3, C4, C6, C8, C10 and C17; the old "Change requests" section was dropped. The old scope's tables, re-encoding library and "both the shared schema and database constraints" are technical choices and are left to the architect's design.md; this epic states only that the server must refuse what the form refuses. Known gap S02.1 F4 moved into scope (open question 1).
- 2026-11-24 · Technical design ([design.md](design.md)), stories S03.1–S03.3 with their tickets, and the story table added (`/design-epic`, first design).
- 2026-11-25 · `/complete-epic`: deviations recorded. [design.md](design.md): the training CHECK with `IS NOT NULL`, the extra CHECKs (`photos` content type and size, `emergency_equipment` `jsonb_typeof`), `search_vector` left to E06/E07, `sql-list.ts`, the entities registered by `SubmissionsModule`, the extra 400/403/404 answers, per-handler access levels, the edit page's loading and one-retry "Page not found", the dependency versions and GHS SVG source (S03.1 F3 closed). [Design doc](../../technical-design/design-doc.md) §2, §3 (slug empty until first approval, E03-D3; columns per epic, E03-D6; `emergency_equipment` shape; I4), §4 (`GET`/`PUT /submissions/:id` and `GET /photos/:id` Public at the guard with the service deciding, E03-D4), §7 "Photos" and §8 (`PHOTO_TOO_LARGE`, `PHOTO_TYPE`). S03.1 verification references and known gap F3; S02.1 known gap F4 marked fixed by S03.3. `apps/api/CLAUDE.md` (modules, `sharp` and multer, `sql-list.ts`, the child-table entity exception, the Public-with-404 rule, `test/page-helpers.ts`) and `apps/web/CLAUDE.md` (`safety-page-form/`, `assets/ghs/`, shared inputs, `networkMode: 'always'` and keeping cached data, the MSW and render helpers, `e2e/helpers/safety-page.ts` and `e2e/fixtures/instrument.jpg`; the page list was already complete). S03.3 F1 (AC3 wording) left for the user. Verification written: GREEN.
- 2026-11-25 · `/complete-epic` (product-manager): C1–C17 ticked from the story Verifications, the `S03.x AC<n>` tests (every AC of the three stories has one), QA run 1 of each story (PASS) and the final checks (`pnpm verify` pass, `pnpm e2e` 58 passed, docs-check OK). Acceptance log entry E03 GREEN added to the [PRD](../../prd/PRD.md) §8. NFR4's draft part is now proven for pending pages and photos; NFR4 stays partly met until E04. C15 is met as built: the offline submit shows the network message once the page is complete (S03.3 F1 is about AC3's wording only). No requirement changes.
