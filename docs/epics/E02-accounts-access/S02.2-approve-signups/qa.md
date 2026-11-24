# QA: S02.2

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-24 · verdict: PASS

`pnpm e2e`: 42 passed (desktop and mobile projects)

| Check                                                                                          | Role                | Result | Screenshot |
| ---------------------------------------------------------------------------------------------- | ------------------- | ------ | ---------- |
| AC3 header shows "Sign-ups", link reaches /admin/sign-ups                                      | setup admin         | ✅     | —          |
| AC4 pending only, oldest first, name, email, "24 Nov 2026", Approve and Reject                 | admin               | ✅     | —          |
| AC5 empty "No pending sign-ups"; list 500 gives alert "Couldn't load, try again." and Retry reloads (loading state seen briefly during one retry) | admin | ✅ | —          |
| AC6 Approve: "Approved <name>.", row gone; pending person with a live session reloads /contribute and sees the contributor area | admin, new person | ✅ | —          |
| AC7 Reject: confirm text, Cancel changes nothing, "Yes, reject" gives "Rejected <name>."; rejected person sees "Your sign-up was not approved."; sign-up again with same email shows "An account with this email already exists" | admin, rejected | ✅ | —          |
| AC8 stale row: alert "This sign-up was already handled." and list reloads; API 409 USER_NOT_PENDING, 404 NOT_FOUND, 400 for non-UUID and for status other than PENDING | admin | ✅ | —          |
| AC10 anonymous sent to /login?next=/admin/sign-ups and lands on it after admin login; pending sees waiting notice; rejected sees not-approved notice; contributor sees "No access" and no "Sign-ups" link | all roles | ✅ | —          |
| AC11 failed approve (network abort) shows alert "Couldn't save, try again." and the row stays   | admin               | ✅     | —          |
| Approved contributor reaches /contribute                                                       | contributor         | ✅     | —          |
| 375 px: /admin/sign-ups (long name and email), "No access", /contribute, no sideways scroll    | admin, contributor  | ✅     | —          |
| Keyboard: header links, Approve, Reject reachable with visible focus; confirm, Reject by keys, focus returns after Cancel | admin | ✅ | —          |
| Browser console: no errors from the pages (only the 4xx from my deliberate bad API calls)      | all                 | ✅     | —          |

Not checked in the browser: AC1 and AC2 (start-up settings, covered by integration tests; the qa:serve copy did create the setup admin), AC9 over HTTP for the refused roles (covered by integration tests), AC11 401/403 gate switch.

No bugs found.
