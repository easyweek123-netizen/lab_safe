# QA: S04.2

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-26 · verdict: PASS

`pnpm e2e`: 70 passed

| Check | Role | Result | Screenshot |
| --- | --- | --- | --- |
| AC1 approve from the preview → back on "Pages to review", `status` "Rotary evaporator was approved and published." with link to `/instruments/rotary-evaporator`, row gone; "Approving…" with disabled buttons while sent | admin | ✅ | — |
| AC2 slugs: "Rotary evaporator" → `rotary-evaporator`, second one → `rotary-evaporator-2`, "Büchi R-300 / Rotavapor" → `buchi-r-300-rotavapor`, "!!!" → `instrument` (`-3`, 80 characters and simultaneous approvals not tried here; integration tests cover them) | admin | ✅ | — |
| AC3 database rules | — | not checked in the browser (integration tests) | — |
| AC4 public page: every field, "Last approved 26 Nov 2026 by Setup Admin"; API 200 with only `slug` and `page`, no contributor, email, note or `version`; photo 200 `image/jpeg`; no contributor name on screen | anonymous | ✅ | — |
| AC5 preview text equals public text, same order, except the "Last approved" line | admin, anonymous | ✅ | — |
| AC6 "Loading safety page…", "Page not found" (unknown, pending, 201-character slug), `alert` "Couldn't load this safety page, try again." and "Retry" loads the page | anonymous | ✅ | — |
| AC7 4 hazards and 4 PPE items at 375 × 812: level, training, all names and emergency 112 visible without scrolling; no sideways scroll | anonymous | ✅ | — |
| AC8 second approval 409 `ALREADY_REVIEWED`; second window shows `alert` "This page has already been reviewed." with "Back to pages to review"; preview of a reviewed page shows the message and no Approve button (two admins at the same instant not tried here) | admin | ✅ | — |
| AC9 stale preview → `alert` "This page changed since you opened it. Review it again." with "Reload the page"; `version` 1 → 2, `submittedAt` unchanged; after reload approving works and the public page shows the correction | admin, contributor | ✅ | — |
| AC10 "My submissions": "Status: Approved", name links to the public page, pending rows keep the edit link; approved submission page shows "This page was approved and can't be changed here." with link and no form; author `PUT` 409 `ALREADY_REVIEWED`; another contributor and an anonymous caller 404; open edit form saved after approval shows "This page has already been reviewed." and the form stays | contributor | ✅ | — |
| AC11 approve: anonymous 401; approved contributor (also the author) 403; admin: malformed id 400, unknown id 404, `version` 0 or 1.5 400 `VALIDATION_FAILED`, foreign `Origin` 403 (pending and rejected accounts not tried here) | anonymous, contributor, admin | ✅ | — |
| AC12 pending: page, API and photo "not found"; after approval all three answer; another pending page and its photo stay "not found" | anonymous | ✅ | — |
| AC13 an admin submits a page, approves it from "Pages to review"; public page "Last approved 26 Nov 2026 by Setup Admin" | admin | ✅ | — |
| AC14 `alert` above the buttons for network failure, 401, 403, 500 and an answer outside the contract; page stays, button enabled again | admin | ✅ | — |
| AC15 public page and "My submissions" at 375 and 1280 px: no sideways scroll; journey covered by `pnpm e2e` | anonymous, contributor | ✅ | — |
| 375 px: public page, preview with decision panel, "My submissions" | anonymous, admin, contributor | ✅ | — |
| Keyboard: public page (links reachable, focus ring 2 px); preview (Approve reached after the header, focus visible, Enter starts approving) | anonymous, admin | ✅ | — |
| Console: no unexpected errors (only the browser's lines for the 404, 409 and 500 answers that the checks caused) | all | ✅ | — |

No bugs found.

- Minor observation, not logged as a bug: `GET /api/instruments/<201-character slug>` answers 400 rather than 404; the browser still shows "Page not found".
