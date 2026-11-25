# QA: S03.3

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-25 · verdict: PASS

`pnpm e2e`: 58 passed

Browser checks on `pnpm qa:serve` (http://localhost:4100), as a contributor signed up through the app and approved by the setup admin. Offline was simulated with the browser context's offline switch, a `visibilitychange` event for the focus change, and routes on `/api/auth/me` that abort or answer 500.

| Check                                                                                                           | Role                 | Result | Screenshot |
| --------------------------------------------------------------------------------------------------------------- | -------------------- | ------ | ---------- |
| AC1 offline, window refocus, online again: form, typed text, name, links and "Log out" stay                      | approved contributor | ✅     | —          |
| AC1 refresh of `me` fails with a 500 (two tries): page stays, no "Couldn't load" alert, header unchanged         | approved contributor | ✅     | —          |
| AC1 refresh of `me` fails with a network error (two tries): same                                                 | approved contributor | ✅     | —          |
| AC2 `me` never loaded and fails: alert "Couldn't load, try again.", Retry, header "Log in"; Retry then loads the form | approved contributor | ✅     | —          |
| AC2 a refresh returns `{user: null}`: gate redirects to `/login?next=/contribute/new`, header "Log in"          | approved contributor | ✅     | —          |
| AC2 changed status or role (S02.1 AC8–AC10, S02.2 AC10)                                                         | —                    | not run in the browser; covered by web tests and the passing e2e suite | — |
| AC3 half filled form, offline, refocus, online: form and header intact                                         | approved contributor | ✅     | —          |
| AC3 complete page, press "Submit for review" while offline: form stays filled, alert "Couldn't reach LabSafe. Your page is still here; check your connection and submit again." | approved contributor | ✅     | —          |
| AC3 submit once online: confirmation "Rotary evaporator was submitted and is waiting for review.", listed as Pending | approved contributor | ✅     | —          |
| 375 px: `/contribute/new` and the load error state, no sideways scroll (scrollWidth 375)                          | approved contributor | ✅     | —          |
| Keyboard: Retry reachable and activated with Enter; form fields reached in order; focus outline 2px visible      | approved contributor | ✅     | —          |
| Console: only the errors caused by the deliberately failed `/api/auth/me` requests                              | approved contributor | ✅     | —          |

Notes:

- AC3 as written (review F1) has the contributor submit a half-filled form offline, which can only show validation errors (seen: "Your page can't be submitted yet"). The network message was checked by completing the page first and then submitting offline, as agreed.
- The signed-up test account lives only in the throwaway `labsafe_test` database.

No bugs.
