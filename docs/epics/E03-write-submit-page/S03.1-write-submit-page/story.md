---
id: S03.1
epic: E03
title: Write and submit a new safety page
type: feature
status: done
covers: [US7, R3, R4, R5]
updated: 2026-11-26
---

# S03.1 Write and submit a new safety page

**As an** approved contributor **I want** to write a complete safety page with a photo and submit it **so that** an admin can review it, while nobody else can see it · Delivers: C1–C8, C10, C11 (photo), C12, C13, C14, C15 (submitting offline), C16 (new form, My submissions), C17 · Design: [design.md](../design.md)

**Try it:** `pnpm qa:serve`, sign up, approve yourself as the setup admin (`e2e/test-env.ts`), open "Contributor area" → "New safety page", fill in a "Rotary evaporator" page with a JPEG and submit it.

## Acceptance criteria

- **AC1** Given an approved contributor or an admin on `/contribute`, When they follow "New safety page", Then `/contribute/new` shows h1 "New safety page" and the form in five groups with headings Identity, Risk at a glance, Hazards and protection, Guidelines and Emergency info, holding every PRD §4.1 field and no last-approved date or approver; the guideline sections appear in the order Before use, Safe operation, Do NOT, Emergency & first aid, each with its PRD §4.1 prompt as its hint; and the Low, Medium and High definitions of R5 appear word for word next to the hazard level choice.
- **AC2** Given the form, When its list fields are shown, Then category, hazard types, PPE items and GHS pictograms offer exactly the PRD §4.2 values in PRD order with their labels, the lab room offers exactly the rooms of `GET /api/meta/lists`, no list has a free-text entry, every hazard level is labelled in words, and every GHS pictogram shows its symbol and its name.
- **AC3** Given the form, When "Training required before first use" is Yes, Then a required "Who gives the training" input appears, and When it is No, the input is hidden and its value is not sent; each ticked hazard type shows a required "How does this hazard arise?" note; each ticked PPE item shows an optional note; and each of the six emergency items has a location input and a "Not applicable" checkbox that clears and disables the location.
- **AC4** Given the photo field, When the contributor chooses a JPEG or PNG of at most 5 MB, Then the field shows "Uploading photo…", the server answers 201 `Photo` and stores a JPEG at most 1600 px on its longer side, and the field shows the stored photo (from `GET /api/photos/:id`) with a "Change photo" button.
- **AC5** Given a file larger than 5 MB (5,242,880 bytes), When it is chosen, Then the browser does not upload it and shows "The photo must be at most 5 MB." next to the field; When such a file is sent straight to `POST /api/photos`, Then the server answers 413 `PHOTO_TOO_LARGE` with that message and stores nothing.
- **AC6** Given a PDF renamed to `.jpg` (or any file whose content is not a JPEG or PNG), When it is uploaded, Then the server answers 415 `PHOTO_TYPE` "Only JPEG or PNG photos are accepted.", stores nothing, and the field shows that message; a request with no file answers 400 `VALIDATION_FAILED` with a `fields` entry for `photo`.
- **AC7** Given a JPEG whose metadata holds GPS coordinates and camera data, When it is uploaded and its owner downloads it again from `GET /api/photos/:id`, Then the bytes are a JPEG with no EXIF block (so no GPS) and no XMP or IPTC data, and an EXIF orientation of the original is already applied to the pixels.
- **AC8** Given a complete "Rotary evaporator" page with an uploaded photo, When the contributor presses "Submit for review", Then the button reads "Submitting…" and is disabled while it is sent; the server answers 201 `Submission` with kind `NEW` and status `PENDING`, writing the instrument, the revision and its hazard and PPE rows in one transaction; and the browser shows `/contribute` with `status` "Rotary evaporator was submitted and is waiting for review." and My submissions lists "Rotary evaporator", today's date and "Status: Pending".
- **AC9** Given the empty form, When the contributor presses "Submit for review", Then nothing is sent, focus moves to one `alert` "Your page can't be submitted yet. Fix these fields:" that lists, each as a link to its input, Name, Photo, Category, Lab room, Short description, the responsible person's name and contact, Hazard level, Training required before first use, Hazards, PPE, Before use, Safe operation, Do NOT, Emergency & first aid, Emergency phone number and each of the six emergency items; and each input shows its own message. A body of `{}` sent straight to `POST /api/submissions` gets 400 `VALIDATION_FAILED` with a `fields` entry for every one of these at once, and nothing is written. A text of only spaces counts as missing.
- **AC10** Given a form whose only gaps are any of: no hazard type and no "No significant hazards", a hazard type without its note, no PPE item and no "No PPE beyond standard lab attire", an emergency item with neither a location nor "Not applicable", and training required without who gives it, When it is submitted, Then the summary and the server's `fields` name exactly those gaps with the messages of the API contract, and nothing else.
- **AC11** Given a hazard type ticked together with "No significant hazards", or a PPE item together with "No PPE beyond standard lab attire", When the page is submitted, Then it is refused in the form and by the server with "Choose hazards or 'No significant hazards', not both." or "Choose PPE items or 'No PPE beyond standard lab attire', not both.".
- **AC12** Given training required and hazard level Low, When the page is submitted, Then the form and the server refuse it with "A page that requires training can't have a Low hazard level." on `hazardLevel`, and the database refuses such a row even when it is written directly.
- **AC13** Given a body sent straight to the server with a category, hazard type, PPE item or GHS pictogram outside PRD §4.2, a hazard type or pictogram listed twice, a lab room id that is not in `lab_rooms`, a photo id that does not exist or was uploaded by someone else, or a text longer than its limit, When it is submitted, Then the server answers 400 `VALIDATION_FAILED` with a `fields` entry naming that field, and nothing is written; a value outside the fixed lists written directly to the database is refused by its CHECK.
- **AC14** Given an anonymous visitor, a pending account and a rejected account, When they call `POST /api/photos`, `POST /api/submissions` or `GET /api/submissions/mine`, Then the anonymous visitor gets 401 `UNAUTHENTICATED`, the others 403 `FORBIDDEN`, and nothing is stored; an admin may upload and submit (201).
- **AC15** Given an uploaded photo, submitted with a page or not, When `GET /api/photos/:id` is called, Then its owner and an admin get 200 `image/jpeg` with `Cache-Control: private, no-cache`, and an anonymous visitor, a pending account, a rejected account and another approved contributor get 404 `NOT_FOUND` with the same body as an id that does not exist.
- **AC16** Given two approved contributors, one of whom has submitted pages, When each opens `/contribute`, Then `GET /api/submissions/mine` returns only the caller's own submissions, newest first; the first sees their pages and the second sees "You haven't submitted any pages yet."; while the list loads it shows `status` "Loading your submissions…", and when it fails, `alert` "Couldn't load your submissions, try again." with a Retry button.
- **AC17** Given a filled-in form, When submitting fails, Then every typed value and the photo stay in the form, the page is not replaced by a login or a notice, and an `alert` says: for a network error, also while offline, "Couldn't reach LabSafe. Your page is still here; check your connection and submit again."; for a 500, "Something went wrong on our side. Your page is still here; try again."; for a 401, "Your session has ended. Log in again in another tab, then submit again here."; for a 403, "Your account can't submit pages.". A photo upload that fails with a network error or a 500 keeps the form the same way and shows "Couldn't upload the photo. Check your connection and try again." next to the photo field; a 401 or 403 there shows the messages above.
- **AC18** Given `/contribute/new`, When the lists from `GET /api/meta/lists` are loading, Then it shows `status` "Loading…", and When they fail, `alert` "Couldn't load the form, try again." with a Retry button.
- **AC19** Given a submitted pending "Rotary evaporator", When an anonymous visitor in a fresh browser context opens `/instruments/rotary-evaporator` and the page's photo address `/api/photos/<id>`, Then both show "not found" (h1 "Page not found" and 404 `NOT_FOUND`), and `GET /api/instruments/rotary-evaporator` answers 404.
- **AC20** Given a 375 px and a 1280 px wide window, When `/contribute/new` and `/contribute` are shown, Then nothing scrolls sideways, and `pnpm e2e` runs at both widths: log in as an approved contributor → fill in and submit "Rotary evaporator" with a JPEG → the confirmation and the row in My submissions → a second approved contributor sees the empty list → AC19's anonymous checks.

## API contract

Shared schemas (schema and type share a name, exported from `src/index.ts`):

**`lists.ts`** gains Zod enums `HazardType`, `ProtectiveEquipmentItem`, `HazardPictogram`, `Category` built from the existing constants, and `EMERGENCY_EQUIPMENT` = `EYEWASH` Eyewash · `SAFETY_SHOWER` Safety shower · `FIRE_EXTINGUISHER` Fire extinguisher · `SPILL_KIT` Spill kit · `FIRST_AID_KIT` First-aid kit · `EMERGENCY_STOP` Emergency stop (PRD order) → `EmergencyEquipmentItem`.

**`schemas/photos.ts`:** `PHOTO_MAX_BYTES` = 5,242,880 · `PHOTO_UPLOAD_FIELD` = `photo` · `Photo { id: uuid, width: int, height: int }` · `PhotoIdParam { id: uuid }`.

**`schemas/safety-page.ts`:** `SafetyPageContent`, every text trimmed first; an empty optional text becomes null. Messages in quotes; "≤ n" is the limit, with "<Field> must be at most n characters".

| Field | Rule | Message when missing or invalid |
| --- | --- | --- |
| `name` | text 1–120 | "Enter the instrument's name" |
| `photoId` | uuid | "Upload a photo" |
| `manufacturer`, `model` | text ≤ 120 or null | — |
| `category` | `Category` | "Choose a category" |
| `labRoomId` | uuid | "Choose a lab room" |
| `description` | text 1–500 | "Enter a short description" |
| `responsibleName` | text 1–100 | "Enter the responsible person's name" |
| `responsibleContact` | text 1–200 | "Enter the responsible person's email or phone extension" |
| `hazardLevel` | `HazardLevel` | "Choose a hazard level"; with training required and `LOW`: "A page that requires training can't have a Low hazard level." |
| `trainingRequired` | boolean | "Choose whether training is required" |
| `trainingGivenBy` | text 1–200 when `trainingRequired`, else dropped (null) | "Enter who gives the training" |
| `hazards` | array of `{ type: HazardType, note: text 1–300 }`, each type once | neither: "Choose at least one hazard, or 'No significant hazards'" · note: `hazards.<i>.note` "Describe how this hazard arises" · twice: "Each hazard type can be chosen once" |
| `noSignificantHazards` | boolean | with hazards: "Choose hazards or 'No significant hazards', not both." |
| `pictograms` | array of `HazardPictogram`, each once, may be empty | "Each pictogram can be chosen once" |
| `protectiveEquipment` | array of `{ item: ProtectiveEquipmentItem, note: text ≤ 200 or null }`, each item once | neither: "Choose at least one PPE item, or 'No PPE beyond standard lab attire'" · twice: "Each PPE item can be chosen once" |
| `standardLabAttireOnly` | boolean | with PPE items: "Choose PPE items or 'No PPE beyond standard lab attire', not both." |
| `beforeUse`, `safeOperation`, `doNot`, `emergency` | text 1–4,000 each | "Fill in Before use" · "Fill in Safe operation" · "Fill in Do NOT" · "Fill in Emergency & first aid" |
| `emergencyPhone` | text 1–50 | "Enter the emergency phone number" |
| `emergencyEquipment` | object with all six `EmergencyEquipmentItem` keys; each `{ kind: 'LOCATION', location: text 1–200 }` or `{ kind: 'NOT_APPLICABLE' }` | `emergencyEquipment.<KEY>`: "Give a location or choose 'Not applicable'" |

The cross-field rules (hazards, PPE, training, training with Low) are reported in the same response as every other problem. An unknown `labRoomId` or a `photoId` that is not the caller's own upload is answered by the service with 400 and the same messages.

**`schemas/submissions.ts`:** `REVISION_KINDS` = `NEW`, `UPDATE` → `RevisionKind` · `REVISION_STATUSES` = `PENDING`, `APPROVED`, `REJECTED` → `RevisionStatus` · `Submission { id: uuid, kind, status, submittedAt: ISO date-time, updatedAt: ISO date-time, submittedBy: { id: uuid, name }, content: SafetyPageContent }` · `SubmissionSummary { id, name, status, submittedAt }` · `MySubmissions { submissions: SubmissionSummary[] }`.

New `ErrorCode` values: `PHOTO_TOO_LARGE`, `PHOTO_TYPE`.

| Method | Path | Who may call | Request → Response | Errors |
| ------ | ---- | ------------ | ------------------ | ------ |
| POST | /api/photos | Contributor | `multipart/form-data`, one file in `photo` → 201 `Photo` | 400 `VALIDATION_FAILED` (`fields: photo` "Choose a photo"); 401; 403; 413 `PHOTO_TOO_LARGE` "The photo must be at most 5 MB."; 415 `PHOTO_TYPE` "Only JPEG or PNG photos are accepted." |
| GET | /api/photos/:id | Public (the service allows the owner and admins) | `PhotoIdParam` → 200 `image/jpeg` bytes | 400 malformed id; 404 `NOT_FOUND` |
| POST | /api/submissions | Contributor | `SafetyPageContent` → 201 `Submission` | 400 `VALIDATION_FAILED` with every field; 401; 403 |
| GET | /api/submissions/mine | Contributor | none → 200 `MySubmissions` | 401; 403 |

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| `/contribute` | My submissions: `status` "Loading your submissions…" | "You haven't submitted any pages yet." | `alert` "Couldn't load your submissions, try again." + "Retry" | h1 "Contributor area", link "New safety page", h2 "My submissions" with rows (name, "Submitted 24 Nov 2026", "Status: Pending"); after a submit the `status` confirmation of AC8 |
| `/contribute/new` | `status` "Loading…"; submit "Submitting…", disabled | the empty form | `alert` "Couldn't load the form, try again." + "Retry"; the error summary (AC9); the messages of AC17 | → `/contribute` with the confirmation |
| photo field | "Uploading photo…", "Submit for review" disabled until it ends | hint "JPEG or PNG, at most 5 MB" | the AC5, AC6 or AC17 message next to the field | the stored photo (alt "Photo of the instrument") + "Change photo" |

## Approach

- **Shared:** `lists.ts` and the three schema files above; follow `schemas/auth.ts` (constants feed the database CHECKs) and the `when` pattern in `apps/api/src/common/config.ts` for rules that must also run when other fields fail.
- **API:** a `photos` module (`Photo` entity, `PhotosService`, `PhotosController`; exports `PhotosService` for the ownership check) and a `submissions` module (`SubmissionsService`, `SubmissionsController`) using the entities in `src/modules/instruments/` (`Instrument`, `InstrumentRevision`, `RevisionHazard`, `RevisionProtectiveEquipment`). Follow `users` for the thin controller, `to…Response` mapping and transactions, `user.entity.ts` for CHECKs built from constants, and `admin-sign-ups.int.test.ts` for the refusal matrix with `test/auth-helpers.ts`.
- **Web:** `src/api/client.ts` gains a multipart sender next to `apiSend`; `src/api/photos.ts` and `src/api/submissions.ts` hold the hooks. The form lives in `src/components/safety-page-form/` (used by the new page here and the edit page in S03.2); the page in `src/pages/new-safety-page/`. Follow `SignUpPage.tsx` (react-hook-form with the shared schema, server `fields` on their inputs), `TextField.tsx`, and `HomePage.tsx` for loading and error states.
- **e2e:** `e2e/tests/safety-page.spec.ts` with a helper that fills in a complete page, using `e2e/helpers/accounts.ts` for accounts.

## Tickets

1. [BE-01 Safety page contract](be/BE-01-safety-page-contract.md)
2. [BE-02 Safety page tables and entities](be/BE-02-safety-page-tables.md)
3. [BE-03 Photo upload and serving](be/BE-03-photo-upload.md)
4. [BE-04 Submit a page and list my submissions](be/BE-04-submit-and-list.md)
5. [FE-01 Photo field and submission hooks](fe/FE-01-photo-field-hooks.md)
6. [FE-02 Identity, Risk at a glance and Guidelines sections](fe/FE-02-identity-risk-guidelines.md)
7. [FE-03 Hazards and protection, and Emergency info sections](fe/FE-03-hazards-emergency.md)
8. [FE-04 New safety page: submit, error summary and failures](fe/FE-04-new-page-submit.md)
9. [FE-05 My submissions and the submit journey](fe/FE-05-my-submissions-journey.md)

## Out of scope

- Opening and correcting a submitted page, and reading one submission (S03.2).
- Keeping the form when a background refresh of the account fails (S03.3, S02.1 F4).
- The public safety page, the review, approved and rejected statuses (E04).
- Saving an unfinished page, autosave, a warning when leaving the form (epic "Out of scope").

## Known gaps

- ~~F1~~ fixed by [S04.4](../../E04-review-publish/S04.4-form-messages/story.md) (E04 C16, 2026-11-26): with a photo shown, "Change photo" carries the field's id, hint and message, and the error summary's "Photo" link moves focus to it.
- F2 (minor, review round 1): `flatten` in `field-labels.ts` skips the keys `type` and `root`, so an error at `hazards.<i>.type` never reaches the error summary (the form can't produce that path today).
- ~~F3~~ fixed at `/complete-epic` (2026-11-25): `design.md` "Data" now gives the training CHECK's `IS NOT NULL`, the extra CHECKs and the `search_vector` deferral.
- ~~B1~~ fixed by [S04.4](../../E04-review-publish/S04.4-form-messages/story.md) (E04 C17, 2026-11-26): choosing a photo clears the old submit-failure alert.

## Verification

**GREEN** · 2026-11-24

Review [round 1](review.md) is APPROVE. `pnpm verify` exit 0 (main session: shared 125, API unit 133, web 195, integration 254, docs-check OK); `pnpm e2e` 54 passed (FE-05).

- **Acceptance criteria**, each built as written and each with tests titled `S03.1 AC<n>`:
  - AC1–AC3: `apps/web/src/components/safety-page-form/` (`SafetyPageForm.tsx` composes the five sections; `hazard-level-definitions.ts`; `ghs-symbols.ts`; `form-values.ts` `toContent` sends `trainingGivenBy` only with Yes). Tests `sections.test.tsx`, `hazards-emergency.test.tsx`, `NewSafetyPagePage.test.tsx:122,163`.
  - AC4–AC7: `apps/api/src/modules/photos/photos.service.ts` (format from the bytes, E03-D8 re-encoding), `photo-upload-errors.interceptor.ts` (413 `PHOTO_TOO_LARGE`, 400 on `photo`), `PhotoField.tsx`. Tests `apps/api/test/photos.int.test.ts:153-282`, `PhotoField.test.tsx:74-198`, `client.test.ts` (`apiSendForm`).
  - AC8: `apps/api/src/modules/submissions/submissions.service.ts:50-77` (references checked, then four tables in one `dataSource.transaction`); `NewSafetyPagePage.tsx`, `ContributorAreaPage.tsx`. Tests `submissions.int.test.ts:104-205`, `NewSafetyPagePage.test.tsx:170`, `MySubmissions.test.tsx:119,136`, `e2e/tests/safety-page.spec.ts:17`.
  - AC9–AC13: `packages/shared/src/schemas/safety-page.ts` (one parse names every gap; cross-field rules with `when`), used by the API pipe and the form's `zodResolver`; `ErrorSummary.tsx`, `field-labels.ts`; database CHECKs in `1795541562254-CreateSafetyPageTables.ts`. Tests `safety-page.test.ts`, `submissions.int.test.ts:207-400`, `safety-page-tables.int.test.ts:167-445`, `NewSafetyPagePage.test.tsx:194-350`, `field-labels.test.ts`.
  - AC14: `@Contributor()` on `photos.controller.ts:36` and `submissions.controller.ts:25,32`. Tests `photos.int.test.ts:284-315`, `submissions.int.test.ts:402-425,476-484`.
  - AC15, AC19: `photos.service.ts:63-75` (`@Public()` at the guard; owner or approved admin, else the same 404). Tests `photos.int.test.ts:318-360`, `submissions.int.test.ts:427`, `safety-page.spec.ts:81-98`.
  - AC16: `submissions.service.ts:83-90` (own rows, newest first, four columns), `MySubmissions.tsx`. Tests `submissions.int.test.ts:436-474`, `MySubmissions.test.tsx:42-117`, `safety-page.spec.ts:66-79`.
  - AC17: `failure-messages.ts`, `SafetyPageForm.tsx:93-114` (never resets), `networkMode: 'always'` in `apps/web/src/api/photos.ts` and `submissions.ts`. Tests `NewSafetyPagePage.test.tsx:377,395`, `PhotoField.test.tsx:201-273`, `submissions.test.tsx:66,77`.
  - AC18: `NewSafetyPagePage.tsx:28-44`. Tests `NewSafetyPagePage.test.tsx:411,428`.
  - AC20: `safety-page.spec.ts:29,32,59,76` in the `desktop` and `mobile` projects.
- **Refused callers:** anonymous 401, pending and rejected 403 on `POST /photos`, `POST /submissions` and `GET /submissions/mine`, with nothing stored. Anonymous, pending, rejected and another approved contributor get the same 404 as an unknown id on `GET /photos/:id`. All proven over HTTP.
- **Data rules** sit where [design.md](../design.md) "Data" puts them: the shared schema for completeness, lists and cross-field rules; CHECKs, foreign keys and composite keys in the database; room and photo owner in the service, inside the transaction. The entities match the migration (schema-builder check). The training CHECK is stricter than design.md first said (review F3, design.md updated 2026-11-25).
- **Left open:** review F1–F3 (minor), to be listed under "Known gaps".

## Changes

- 2026-11-26 · E04 `/complete-epic`: known gaps F1 and B1 marked fixed by S04.4. AC17's network and 401 texts ("…and submit again.", "…then submit again here.") are superseded by E04 C18 (S04.4 AC4): the app now says "try again". AC17 itself is frozen and was not edited.

- 2026-11-25 · `/complete-epic`: Verification references updated to the current lines of `submissions.controller.ts` and `submissions.service.ts` (moved by S03.2 BE-01); review F3 closed by the design.md update.
