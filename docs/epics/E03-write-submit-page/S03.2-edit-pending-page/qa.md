# QA: S03.2

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-25 · verdict: PASS

`pnpm e2e`: 56 passed

| Check                                                                 | Role                       | Result | Screenshot |
| --------------------------------------------------------------------- | -------------------------- | ------ | ---------- |
| AC1 edit page filled with everything submitted (texts, photo, lists, notes, N/A) | author          | ✅     | —          |
| AC2 "Saving…" disabled, 200 PENDING, same submittedAt, new updatedAt, removed hazard gone, confirmation, new value on reopen, photo replaced | author | ✅ | — |
| AC3 cleared required fields and no hazard: error summary and field messages; direct PUT 400 `VALIDATION_FAILED`, stored page unchanged | author | ✅ | — |
| AC4 GET: author and admin 200; anonymous, pending, rejected, other contributor 404 same as unknown id; malformed 400 | all five roles | ✅ | — |
| AC5 PUT: author 200; anonymous, pending, rejected, other contributor, admin 404 | all five roles | ✅ | — |
| AC6 Loading…, "Page not found" (unknown, malformed, other contributor, admin), load failure alert and Retry, save failures keep typed values, refocus keeps typed values | author, admin, other | ✅ | — |
| AC7 `/instruments/rotary-evaporator` and photo address still not found | anonymous | ✅ | — |
| AC8 no sideways scroll at 375 px (list, edit, edit with errors, not found) | author | ✅ | — |
| Keyboard alone (every control reachable, visible focus ring, Save changes with Enter) | author | ✅ | — |
| Browser console shows no unexpected errors | author, admin | ✅ | — |

No bugs found.

Notes (not bugs): while loading, the h1 "Edit safety page" is shown above "Loading…" even for a page that turns out not to be the person's own; no content is shown. An anonymous visitor on `/contribute/submissions/<id>` is sent to the login page, which AC6 does not cover.
