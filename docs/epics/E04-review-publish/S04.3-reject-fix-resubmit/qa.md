# QA: S04.3

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-26 · verdict: PASS

`pnpm e2e`: 72 passed

Journey on `pnpm qa:serve` (http://localhost:4100): contributor "Rotary evaporator QA26a" submitted → admin rejected with a two-line note → My submissions shows Rejected and the note → fix form → name cleared (error summary) → photo and Safe operation changed → resubmitted → Pending, no note → back in Pages to review → approved → anonymous visitor sees the public page with the new photo.

| Check | Role | Result | Screenshot |
| ----- | ---- | ------ | ---------- |
| AC1 reject with note: back on "Pages to review", `status` "Rotary evaporator QA26a was rejected. The contributor can see your note.", row gone, decision panel (Approve, note, Reject) above the page | admin | ✅ | — |
| AC2 empty note and spaces-only note: nothing sent (0 POSTs), "Enter a note for the contributor" shown, focus on the note field; 1,001 characters: "The note must be at most 1000 characters", nothing sent | admin | ✅ | — |
| AC3 reject API: anonymous 401, approved contributor 403, foreign origin 403, malformed id 400, unknown id 404, already rejected 409, empty note 400, 1,001 characters 400 | anonymous, contributor, admin | ✅ | — |
| AC4 My submissions: "Status: Rejected", "Admin's note: …" word for word, line break kept (`white-space: pre-wrap`), name links to the fix form | contributor | ✅ | — |
| AC5 fix form: h1 "Fix safety page", note above the form, form filled with what was submitted, "Resubmit for review" | contributor | ✅ | — |
| AC6 resubmit: `/contribute` with "Rotary evaporator QA26a was resubmitted and is waiting for review.", "Status: Pending", no note; listed again in "Pages to review" with the new photo and text | contributor, admin | ✅ | — |
| AC7 name cleared and resubmitted: error summary "Name: Enter the instrument's name", stays on the fix form | contributor | ✅ | — |
| AC8 someone else's rejected page: author GET 200 with `reviewNote`; admin GET 200; anonymous, pending account and another approved contributor GET 404; other contributor PUT 404; admin PUT 404; other contributor's "mine" list is empty | anonymous, contributor, admin | ✅ | — |
| AC9 while rejected: page, API and photo 404 for anonymous; after approval the new photo answers 200 `image/jpeg`, the replaced photo 404 for anonymous and 200 for its owner; public page shows the new photo and the new Safe operation text | anonymous, contributor | ✅ | — |
| AC10 "Loading…", "Page not found" for another's page, load failure with "Retry", failure messages on resubmit | contributor | not run (offline and failure states are covered by web tests) | — |
| AC11 375 px: queue, preview with note field (also with 120 unbroken characters), My submissions with a rejected row, fix form and its error summary: nothing scrolls sideways; 1280 px: same pages fine | admin, contributor | ✅ | — |
| 375 px and keyboard: Approve, note field and Reject reachable in order and reject sent with Enter; fix form fields tab in order; after an invalid resubmit by keyboard focus moves to the error summary; focus outline 2 px solid on every control checked | admin, contributor | ✅ | — |
| Browser console on every page visited | all | ✅ no errors | — |

- B1 [minor][fe] Steps: as the contributor, resubmit a rejected page (arrive on `/contribute` with "…was resubmitted and is waiting for review."), have the admin approve it, reload `/contribute` → expected the confirmation is gone, or at least does not contradict the row / actual the `status` message "Rotary evaporator QA26a was resubmitted and is waiting for review." is still shown above a row saying "Status: Approved" (the message survives a reload, likely from the router's navigation state; the same happens after a first submit, so it predates this story).
