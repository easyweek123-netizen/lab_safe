# QA: S02.3

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-24 · verdict: PASS

`pnpm e2e`: 52 passed (desktop and mobile projects)

| Check                                                                                                                                                                  | Role                         | Result | Screenshot |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------ | ---------- |
| AC1 only approved accounts, sorted name then email (two "Adam Able" by email), role in words, "Make admin" / "Remove admin"; API `status=APPROVED` same order            | admin                        | ✅     | —          |
| AC2 "Loading…" status seen while the list is delayed; list 500 gives alert "Couldn't load, try again." and Retry reloads the list                                      | admin                        | ✅     | —          |
| AC3 "Make admin": status "Zoe Zeta is now an admin."; row shows "Admin" and "Remove admin"; Zoe's next load shows "Sign-ups" and "Accounts" and reaches /admin/sign-ups | admin, contributor           | ✅     | —          |
| AC4 "Remove admin" on another admin: status "Zoe Zeta is now a contributor."; Zoe's next load of /admin/sign-ups shows "No access", /contribute shows the contributor area | admin, contributor           | ✅     | —          |
| AC5 only admin removes self: alert "There must be at least one admin.", still admin                                                                                    | setup admin                  | ✅     | —          |
| AC6 simultaneous demotion                                                                                                                                              | —                            | not checked in the browser (covered by the integration test) | — |
| AC7 two admins, one removes self: page shows "No access", header has no "Sign-ups" or "Accounts"                                                                       | admin                        | ✅     | —          |
| AC8 API: pending and rejected 409 USER_NOT_APPROVED; unknown id 404; non-UUID, role OWNER, missing role, `status=REJECTED` and missing status 400; same role again 200 | admin                        | ✅     | —          |
| AC9 API: anonymous 401 UNAUTHENTICATED; pending, rejected and contributor 403 FORBIDDEN on GET and PUT (including contributor promoting someone); no role changed       | all roles                    | ✅     | —          |
| AC10 anonymous sent to /login?next=/admin/accounts and lands there after admin login; pending sees waiting notice; rejected sees "Your sign-up was not approved."; contributor sees "No access" with no "Accounts" link | all roles | ✅ | —          |
| AC11 button disabled while the request is pending (other rows stay enabled); network error and 500 give alert "Couldn't save, try again." and the row is unchanged; real 403 (admin demoted in another session) shows "No access" | admin | ✅ | —          |
| 375 px: /admin/accounts, no sideways scroll (scrollWidth 375), also after a role change                                                                                | admin                        | ✅     | —          |
| 1280 px: page renders and works (also covered by `pnpm e2e`)                                                                                                           | admin                        | ✅     | —          |
| Keyboard: header links and every row button reachable in order with visible 2px outline; Enter on "Make admin" works and focus stays on the row's new button          | admin                        | ✅     | —          |
| Browser console: no unexpected errors (only 4xx and 5xx from deliberate bad calls and stubs, and the one in B1)                                                        | all                          | ✅     | —          |

- B1 [minor][fe] Steps: log in as one of two admins, open /admin/accounts, press "Remove admin" on yourself → expected the page shows "No access" without a failing request / actual the page shows "No access" correctly, but the browser console logs `Failed to load resource: 403 (Forbidden)` for `GET /api/admin/users?status=APPROVED`, because the page reloads the list after the role change and the request is now refused.

Not checked in the browser: AC6 (needs two simultaneous requests; the integration test proves it) and the 401 branch of AC11 (the 403 branch was checked for real).
