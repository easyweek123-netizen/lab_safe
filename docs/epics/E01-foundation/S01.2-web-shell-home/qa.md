# QA: S01.2

Tick (`[x]`) the bugs `/fix` should handle. Add instructions as `> note` lines under a bug.

## Run 1 · 2026-10-29 · verdict: PASS

Application: `pnpm dev` (development database, already migrated; `pnpm qa:serve` is not available yet, it comes with S01.3) · Address: `http://localhost:5173` (web, Vite proxy) and `http://localhost:3000` (API). For the API-stopped checks only `pnpm dev:web` was running (the proxy answered 502), then `pnpm dev:api` was started again for the Retry. Browser: Chromium through the Playwright browser tools, 1280 × 900 and 375 × 812. All routes are public, so every check ran as an anonymous visitor (TC-9.1 as the developer, TC-10.1 as the user).

| TC      | Role      | Result                     | Screenshot |
| ------- | --------- | -------------------------- | ---------- |
| TC-1.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-1.2  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-1.3  | —         | ✅ auto (`pnpm verify`)    | — |
| TC-2.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-3.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-3.2  | —         | ✅ auto (`pnpm verify`); also seen live: `lang="en"`, title "LabSafe", phone viewport | — |
| TC-3.3  | anonymous | ✅ manual: home (loaded and error) and not found are all English and read naturally; one `main` (max width 1024 px, 16 px side padding) | [img](qa/run1-TC-3.3-not-found-keyboard.png) |
| TC-4.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-5.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-6.1  | anonymous | ✅ auto (`pnpm verify`); also seen live with the API stopped | [img](qa/run1-TC-8.1-api-stopped-375.png) |
| TC-6.2  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-6.3  | anonymous | ✅ auto (`pnpm verify`); also seen live: Retry with the API down shows the error again, Retry after starting the API shows the lists and no alert | [img](qa/run1-TC-8.1-retry-success-375.png) |
| TC-7.1  | anonymous | ✅ auto (`pnpm verify`)    | — |
| TC-7.2  | anonymous | ✅ auto (`pnpm verify`); also seen live with the keyboard only (Tab, Enter on "Go to the home page" → home with the rooms) | [img](qa/run1-TC-3.3-not-found-keyboard.png) |
| TC-8.1  | anonymous | ✅ manual at 375 × 812: `/`, `/does-not-exist` and `/` with the API stopped have `scrollWidth` 375 (no sideways scroll), no text under 16 px, Retry is 80 × 44 px | [home](qa/run1-TC-8.1-home-375.png) · [not found](qa/run1-TC-8.1-not-found-375.png) · [API stopped](qa/run1-TC-8.1-api-stopped-375.png) · [Retry focus](qa/run1-TC-8.1-retry-focus-375.png) |
| TC-9.1  | developer | ✅ manual: home shows the four rooms (LAB-101, LAB-102, LAB-201, LAB-202) and the 15 hazard types; the request went to `http://localhost:5173/api/meta/lists` (Vite proxy) → 200 | [img](qa/run1-TC-9.1.png) |
| TC-10.1 | user      | ✅ manual: `apps/web/CLAUDE.md` has every bullet of design §10 (page list with `/` and `*`, hooks in `src/api` validating with the shared schemas, four UI states, mobile-first 375 px and accessible markup, Tailwind only, MSW component tests, test naming) | — |

Also checked: keyboard only, the header link, "Go to the home page" and "Retry" are reachable with Tab, show a visible 2 px focus outline and work with Enter. The pages have no forms yet. The focus loss after pressing Retry (review F3) and the offline case (review F4) were seen but are accepted findings, so they are not filed again.

Bugs:

- [ ] B1 [minor][fe] Steps: stop the API (run only `pnpm dev:web`), open `/` (any width) → expected the error page to keep a level-1 heading like every other page (`apps/web/CLAUDE.md`, Screens: "headings in order (one `h1` per page)") / actual the loading and error states of `HomePage.tsx` render no heading at all, only the `alert`, the Retry button and the header link, so screen-reader heading navigation finds nothing on the page.
- [ ] B2 [minor][fe] Steps: open any page (`/` or `/does-not-exist`) with the browser console open → expected no console errors / actual `Failed to load resource: 404 (Not Found)` for `http://localhost:5173/favicon.ico` on every full page load; `apps/web/index.html` declares no icon and `apps/web/public/` has none.

Specs added: none (S01.2 has no `auto: e2e` test cases) · `pnpm e2e`: not available yet (comes with S01.3)

`pnpm verify` (run step by step, see below): format check ✅ (excluding `.playwright-mcp/`), lint ✅, typecheck ✅, unit tests ✅ (18 shared + 41 api + 9 web), integration tests ✅ (15), build ✅, docs check ✅.
