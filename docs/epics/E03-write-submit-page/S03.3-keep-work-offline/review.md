# Review: S03.3

<!-- architect. blocker: an acceptance criterion broken, a refused role gets in, data lost or leaked, a test weakened.
     major: a named rule, edge case or screen state wrong, or a criterion without a real test.
     minor: anything else; it becomes a known gap. -->

## Round 1 · 2026-11-25 · verdict: APPROVE

`pnpm verify`: ✅ (exit 0, run by the main session: shared 129, API unit 133, web 230, integration 283, docs-check OK); `pnpm e2e` 58 passed (reported by FE-01). The two component test files were re-run during the review: 47 passed.

AC1–AC3 are built as written, and each has a real test titled `S03.3 AC<n>`. `RequireAccount` now decides from `data` whenever it exists. Without data it shows the error and Retry only when the query has failed and is idle, and "Loading…" otherwise, so S02.1 AC15 and the Retry-shows-loading behaviour are unchanged. `AccountMenu` reads `data?.user`: a failed refresh keeps the cached name, links and "Log out", and a first load that fails still shows "Log in". A refresh that succeeds replaces `data`, so `{user: null}`, a REJECTED status and a removed admin role all re-decide (AC2). This is decision E03-D7. `src/api/auth.ts` is untouched, as the ticket asks. No E02 test was changed: the only removed lines in the two test files are import lines that were widened. The new tests use MSW network errors and 500s and trigger the refresh through `focusManager` and `onlineManager`. They wait until the query has really settled in `error` before they assert, so they would fail against the old components. The "error and fetching at once" test covers the case where the old gate showed "Loading…" and unmounted the form. The page's other query (`useMetaLists`) has `staleTime: Infinity`, so a focus change cannot refetch it and replace the form either.

Main-session points:
- **1, AC3's step order in `network-drop.spec.ts`:** it still proves AC3, and a little more. The first part follows the wording: offline, focus away and back, online. The spec checks that the reconnect refresh answers 200 and that the half-filled values and the name are still there. As the notes say, TanStack pauses an offline refresh rather than failing it, so this part alone would also pass on the old code. The forced 500 (both tries, matching `retry: 1` in `main.tsx`) is what makes the browser test fail on a regression, and FE-01 checked that it did against the old components. A real drop often looks like that too: `navigator.onLine` stays true while requests fail. Completing the page before the offline submit is needed, because client validation stops a half-filled form before any request. Without that step the network message cannot appear at all. So the gap is in AC3's wording, not in the code (F1). The 500 ms wait before the second check is acceptable. A regression would leave the alert on screen for good, so the assertions after it would catch it.
- **2, `renderApp` returns its `queryClient`:** accepted, no finding. The change only adds to the return value and is listed under "Files changed". The tests use the client only to wait until the refresh has settled; every assertion is still about what the user sees.

- F1 [minor][docs] `docs/epics/E03-write-submit-page/S03.3-keep-work-offline/story.md:21`: AC3 says to press "Submit for review" on the half-filled form while offline and to complete the page only afterwards. A half-filled form shows validation errors, never S03.1 AC17's network message. Fix: acceptance criteria are frozen, so the user decides; the proposal for `/complete-epic` is to reword AC3 to "complete the page, submit offline → the network message and the form stays; submit online → the confirmation", with a "Changes" line. No code change.

No blocker or major is open.

Where to look first: `apps/web/src/components/RequireAccount.tsx` (when the gate shows loading, the error or the page), `apps/web/src/components/RequireAccount.test.tsx` (the failed-refresh and re-decide tests), `e2e/tests/network-drop.spec.ts` (the forced 500 and the offline submit)
