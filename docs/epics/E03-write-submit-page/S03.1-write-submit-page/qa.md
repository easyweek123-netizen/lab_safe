# QA: S03.1

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-24 · verdict: PASS

`pnpm e2e`: 54 passed (desktop and mobile projects)

Method: `pnpm qa:serve` on http://localhost:4100. Accounts signed up through the app's sign-up endpoint and approved or rejected by the setup admin (one approved contributor A, one approved contributor B, one pending, one rejected). Server-side checks were made with curl; UI checks in a real browser at 1280 px and 375 px.

| Check | Role | Result | Screenshot |
| ----- | ---- | ------ | ---------- |
| AC1 /contribute/new: h1, five groups, every PRD 4.1 field, no approver/date, guideline order and prompts, R5 definitions word for word | contributor | ✅ | — |
| AC2 lists equal PRD 4.2 in order, rooms equal `GET /api/meta/lists`, no free-text list, levels in words, GHS names | contributor | ✅ | — |
| AC3 training input appears/hides and is not sent when No; hazard notes required; PPE notes optional; six emergency items, "Not applicable" clears and disables | contributor | ✅ | — |
| AC4 JPEG upload shows stored photo from `/api/photos/:id` and "Change photo"; server stores JPEG at most 1600 px (2400x1000 became 667x1600 after orientation) | contributor | ✅ | — |
| AC5 file over 5 MB: no request sent, message next to field; direct POST gives 413 `PHOTO_TOO_LARGE` | contributor | ✅ | — |
| AC6 fake JPEG gives 415 `PHOTO_TYPE` and message in field; no file gives 400 with `photo` field | contributor | ✅ | — |
| AC7 stored photo has no EXIF/GPS/XMP/IPTC, orientation applied to pixels | contributor | ✅ | — |
| AC8 submit "Rotary evaporator": button "Submitting…" and disabled, confirmation `status`, My submissions row with today's date and "Status: Pending" | contributor | ✅ | — |
| AC9 empty submit: nothing sent, one `alert` with 22 links to existing inputs, focus on the alert, each input has a message; `{}` to API gives 400 with every field; spaces count as missing | contributor | ✅ | — |
| AC10 only-gap cases (hazards, PPE, emergency item, training) name exactly those gaps with contract messages | contributor | ✅ | — |
| AC11 hazards or PPE together with the "none" choice refused in form and by server | contributor | ✅ | — |
| AC12 training required with Low refused in form and by server (database CHECK covered by `pnpm e2e` and integration tests, not re-run by hand) | contributor | ✅ | — |
| AC13 out-of-list category, hazard, PPE, pictogram, duplicates, unknown room, unknown or foreign photo, over-long text: 400 with named field | contributor | ✅ | — |
| AC14 anonymous 401; pending and rejected 403; admin 201 on photos, 400 (valid) on submissions, 200 on mine | anonymous, pending, rejected, admin | ✅ | — |
| AC15 photo 200 `image/jpeg`, `Cache-Control: private, no-cache` for owner and admin; anonymous, pending, rejected and other contributor get the same 404 body as an unknown id | all roles | ✅ | — |
| AC16 contributor B sees empty message; A sees own row; loading `status`; 500 gives `alert` and Retry that recovers | two contributors | ✅ | — |
| AC17 submit failures (network, offline, 500, 401, 403) keep values and photo, right messages; photo upload failures (network, 500, 401, 403) show the right message next to the photo | contributor | ✅ (see B1) | — |
| AC18 /contribute/new loading `status` "Loading…", failure `alert` with Retry that recovers | contributor | ✅ | — |
| AC19 anonymous fresh context: `/instruments/rotary-evaporator` shows "Page not found"; `/api/photos/<id>` 404; `GET /api/instruments/rotary-evaporator` 404 | anonymous | ✅ | — |
| AC20 375 px: no sideways scroll on `/contribute`, `/contribute/new`, and the new page with the error summary open | contributor | ✅ | — |
| Keyboard only on /contribute/new | contributor | ✅ every control reached in a logical order (73 stops), focus outline visible on each | — |
| Browser console | contributor | ✅ only error was the expected 415 from the deliberate wrong-type upload (plus aborted or mocked requests I injected) | — |

Notes (not bugs): the hazard note label reads "How does the <hazard> hazard arise?" and the PPE note "Note for <item>, optional", more specific than the AC wording and acceptable. No screenshot was saved because no check failed.

- B1 [minor][fe] Steps: on `/contribute/new` with a filled form, press "Submit for review" while offline (or with a 500) so the submit `alert` appears, then choose a photo again → expected the old submit-failure alert to be cleared when a new action starts / actual the alert "Couldn't reach LabSafe. Your page is still here; check your connection and submit again." stays next to a different photo message (observed when the new upload failed with 401, 403, 500 or a network error; the success case was not checked).
