---
id: S03.3
epic: E03
title: Keep my work when the connection drops
type: feature
status: done
covers: [US7]
updated: 2026-11-25
---

# S03.3 Keep my work when the connection drops

**As an** approved contributor writing a long safety page **I want** a short network drop to leave my form and my login on screen **so that** I never lose what I typed · Delivers: C15, C17 · Design: [design.md](../design.md) · Fixes known gap S02.1 F4

**Try it:** `pnpm qa:serve`, log in as an approved contributor, half fill in "New safety page", switch the browser's network to offline in the developer tools, click into another window and back, switch online again: the form, the typed text and your name in the header are all still there.

## Acceptance criteria

- **AC1** Given a signed-in approved contributor whose account has loaded, When a background refresh of `GET /api/auth/me` fails with a network error or a 500 (for example on window focus or reconnect), Then the account gate keeps showing the page, so a form under it stays mounted with every typed value, and the header keeps the person's name, their links and "Log out".
- **AC2** Given the account has never loaded, When `GET /api/auth/me` fails, Then the gate still shows `alert` "Couldn't load, try again." with Retry and the header "Log in" (S02.1 AC15); and Given a refresh that succeeds with `{user: null}` or a changed status or role, Then the gate and the header re-decide as in S02.1 AC8–AC10 and S02.2 AC10.
- **AC3** Given `/contribute/new` half filled in, When the contributor switches the browser offline, moves focus away from the window and back, and goes online again, Then the form and everything typed are still there and the header still shows their name; When they press "Submit for review" while offline, Then the form stays filled in with S03.1 AC17's network message; and When they complete the page and submit once online, Then the S03.1 confirmation appears.

## API contract

No API change. The gate and the header read `GET /api/auth/me` (`SessionResponse`), as since S02.1.

## UI states

| Route | Loading | Empty | Error | Success |
| ----- | ------- | ----- | ----- | ------- |
| every page under `RequireAccount` | `status` "Loading…" only before the account has loaded once | — | `alert` "Couldn't load, try again." + Retry only when there is no account data at all | the page, also while a refresh fails |
| header | nothing account-related before the first load | "Log in" for an anonymous visitor | "Log in" only when `me` never loaded | name, links, "Log out", also while a refresh fails |

## Approach

- **Web:** `src/components/RequireAccount.tsx` and `src/components/AccountMenu.tsx` decide from the cached `me` data whenever it exists, and show their error state only without data (S02.1 review F4's fix, design decision E03-D7). Follow the TanStack Query states already used in `HomePage.tsx`.
- **e2e:** `e2e/tests/network-drop.spec.ts`: Playwright's `context.setOffline`, a focus change (for example a `visibilitychange` event, which TanStack Query listens to), and the S03.1 helpers.
- At `/complete-epic` the architect marks S02.1 F4 as fixed by this story.

## Tickets

1. [FE-01 Keep the account and the form through a failed refresh](fe/FE-01-keep-account-on-refresh-error.md)

## Out of scope

- Keeping the typed page across a new login after the session ends (epic open question 9).
- Saving drafts or autosave (epic "Out of scope").
- Other E02 known gaps, for example S02.1 F2 (a failed logout shows no message).

## Known gaps

- F1 (minor, review round 1): AC3 has the contributor submit the half-filled form while offline, which can only show validation errors, never the S03.1 AC17 network message. The e2e test and QA run 1 complete the page before the offline submit. Proposed rewording at `/complete-epic` (needs the user's approval, since acceptance criteria are frozen).

## Verification

**GREEN** · 2026-11-25 · architect review round 1 APPROVE ([review.md](review.md)), one minor finding (F1, AC3's step order in the wording; a rewording for the user to decide at `/complete-epic`). `pnpm verify` exit 0 (shared 129, API unit 133, web 230, integration 283, docs-check OK). `pnpm e2e` 58 passed, with `network-drop.spec.ts` at 1280 px and 375 px. Every AC has a test titled `S03.3 AC<n>`: AC1 web (gate and header; network error and 500; focus and reconnect; error while refetching); AC2 web (first-load error with Retry and "Log in"; `{user: null}`, REJECTED, removed admin role); AC3 e2e.

## Changes
