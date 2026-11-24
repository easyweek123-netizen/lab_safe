# QA: S02.1

<!-- qa-engineer. PASS only if pnpm e2e passed and no blocker or major bug is open. -->

## Run 1 · 2026-11-24 · verdict: PASS

`pnpm e2e`: 28 passed

Browser checks ran against `pnpm qa:serve` (http://localhost:4100). Server-side rules were also sent straight to the API (fetch from the page, curl for `Origin`, which a browser will not let a page forge). No bug found, no screenshots needed.

| Check | Role | Result | Screenshot |
| ----- | ---- | ------ | ---------- |
| AC1 sign-up with `Sara@Lab.TEST` lands on `/contribute`, "Waiting for approval" and "Your account is waiting for approval." | anonymous | ✅ | — |
| AC2 empty name, "bad" email, short password: three messages next to the inputs; API 400 with one `fields` entry per problem for a 101-character name and 129-character password | anonymous | ✅ | — |
| AC3 sign-up with the same email in another case: 409 `EMAIL_TAKEN`, "An account with this email already exists" next to the email input | anonymous | ✅ | — |
| AC4 sign-up body with `role: ADMIN`, `status: APPROVED` still gives `CONTRIBUTOR` / `PENDING` | anonymous | ✅ | — |
| AC5 login with upper-case email: header shows the name and "Log out" | contributor (pending) | ✅ | — |
| AC6 wrong password and unknown email: both 401 with the same message, no cookie; form shows "Email or password is wrong" | anonymous | ✅ | — |
| AC7 "Log out" clears the cookie (`Max-Age` expiry), header shows "Log in"; the replayed old cookie gives `{user: null}` | contributor (pending) | ✅ | — |
| AC8 `/contribute` as PENDING (link, typed URL, reload) | contributor (pending) | ✅ | — |
| AC8 `REJECTED`, `APPROVED` and admin views | rejected, approved, admin | ⏭ not checkable | — |
| AC9 anonymous on `/contribute` goes to `/login?next=/contribute` and back; `next=//evil.example` ignored | anonymous | ✅ | — |
| AC10 status or role changed in the database shows on the next `/auth/me` | contributor | ⏭ not checked in the browser | — |
| AC11 `/health` and `/meta/lists` public (200); logout without session 401 `UNAUTHENTICATED`; unknown cookie treated as anonymous and cleared by `/auth/me` | anonymous | ✅ | — |
| AC11 route with no access level answers 403 for everyone | admin | ⏭ not checkable (no such route is exposed) | — |
| AC12 foreign `Origin` on sign-up and login: 403, no account created; `text/plain` body: 403 | anonymous | ✅ | — |
| AC13 password and hash in responses; hash format and table read | — | ⏭ responses checked (no password or hash); the table was not read, no database access | — |
| AC14 cookie `labsafe_session` with `HttpOnly`, `SameSite=Lax`, `Path=/`; none visible to scripts | contributor | ✅ (columns not read) | — |
| AC15 sign-in 500: `alert` "Something went wrong, try again." and typed values kept; `/auth/me` failing: "Couldn't load, try again." and "Retry" | anonymous | ✅ | — |
| AC15 loading text and disabled "Signing up…" / "Logging in…" button | anonymous | ⏭ too brief to observe; covered by component tests | — |
| AC16 signed-in user on `/login` and `/signup` goes to `/contribute` | contributor (pending) | ✅ | — |
| AC17 `/signup`, `/login`, waiting notice, `/` at 375 px: no sideways scroll | anonymous, contributor | ✅ | — |
| 375 px and keyboard: header links, Log out, login fields and button reachable with Tab, 2 px outline on each; Enter on "Log out" logs out | anonymous, contributor | ✅ | — |
| Console errors | all | ✅ | — |

Notes:

- The only console errors were the browser's "Failed to load resource" lines for the 4xx, 500 and aborted requests I sent on purpose. No script error appeared.
- Not checkable until S02.2 (no way to approve or reject an account): the `APPROVED`, `REJECTED` and admin views of AC8, and everything that needs an admin.
- Logging out from `/contribute` ends on `/login?next=/contribute`, not on a page showing "Log in" in the header. The header does show "Log in". This matches the design, so I did not count it as a bug.

No bugs open.
