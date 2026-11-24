# Web coding rules (`apps/web`)

React 19, React Router 8, TanStack Query 5, Tailwind 4, Zod 4 from `@labsafe/shared`, built with Vite 8.

## Pages

Every route is in `src/App.tsx`. Add a row when you add a page.

| Route | Folder | Story | Note |
| ----- | ------ | ----- | ---- |
| `/` | `src/pages/home/` | S01.2 | Lab rooms and hazard types; replaced by search in E06 |
| `/signup` | `src/pages/signup/` | S02.1 | Sign-up form; a signed-in visitor goes to `/contribute` |
| `/login` | `src/pages/login/` | S02.1 | Login form; goes to a local `next` path or `/contribute` |
| `/contribute` | `src/pages/contribute/` | S02.1 | Contributor area behind `RequireAccount` (contributor level); PENDING and REJECTED accounts see the notice at this address |
| `/admin/sign-ups` | `src/pages/admin-sign-ups/` | S02.2 | Pending sign-ups with Approve and Reject, behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/admin/accounts` | `src/pages/admin-accounts/` | S02.3 | Approved accounts with "Make admin" or "Remove admin", behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `*` | `src/pages/not-found/` | S01.2 | Every unknown address |

## Layout

```
src/
  App.tsx              routes, all under the AppShell layout
  api/                 client.ts and one TanStack Query hook file per resource
  components/          UI shared by several pages
  pages/<name>/        <Name>Page.tsx, its own components, and their tests
  test/                MSW handlers, render helper, setup
```

## Coding rules

- **Components:** function components only; one component per file, named like the file (`LoginForm.tsx`). A component used by one page lives in that page's folder.
- **Server data:** only through TanStack Query hooks in `src/api/`. Query keys are arrays (`['pages', id]`). Changes use `useMutation` and then `invalidateQueries`. Never copy server data into `useState`.
- **Network:** only `src/api/client.ts` calls `fetch`, and it validates every response with the shared Zod schema.
- **State:** `useState` for local UI state. No global state library.
- **Effects:** no `useEffect` for fetching data or computing values; compute them during render.
- **Forms:** validate with the shared schema on submit; show the server's `fields` errors next to their inputs.
- **Types:** no `any`; props are typed; data types come from `@labsafe/shared`.
- **Lists:** keys are stable ids, never the index.
- **Routing:** routes only in `App.tsx`; links with `<Link>`. A page that needs an account goes under the `RequireAccount` layout route (`level="contributor"` or `"admin"`); it shows the log-in redirect or the notice at the same address. The server still decides every action; the gate and hidden links are only for display.
- **Styling:** Tailwind classes only; no inline styles and no other CSS files besides `src/index.css`.
- **States:** every page handles loading (`role="status"`), empty, error (`role="alert"`) and success.
- **Accessibility:** a label on every input, alt text on every image, one `h1` per page and headings in order, everything reachable by keyboard with a visible focus.
- **Phone first:** at 375 px nothing scrolls sideways, text is at least 16 px, buttons are easy to tap.
- **Hazards** are never shown by colour alone; always add text. All text is English.

## Tests

- **Component tests:** `*.test.tsx` next to the component, with Vitest and Testing Library. Render pages with `renderApp(path)` from `src/test/render.tsx`. Mock the network with MSW (`src/test/msw.ts`); unhandled requests fail.
- **End-to-end tests:** `e2e/tests/*.spec.ts` with Playwright, run at desktop width and at 375 px. Every new page gets a no-sideways-scroll check. Shared steps (sign up, log in, log in as the setup admin from `e2e/test-env.ts`, approve, change role) are in `e2e/helpers/accounts.ts`; every test uses its own unique email, because both widths share one database.
- **Titles** start with the story and acceptance criterion: `S02.1 AC7 shows "Page not found"`. E01's tests keep their `TC-…` titles.
- Find elements by role or label; assert what the user sees.

## Commands

- `pnpm --filter @labsafe/web test`: component tests.
- `pnpm dev`: API on :3000, web on :5173.
- `pnpm e2e`: end-to-end tests (never at the same time as `pnpm verify`).
