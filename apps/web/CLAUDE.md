# Web coding rules (`apps/web`)

React 19, React Router 8, TanStack Query 5, Tailwind 4, Zod 4 from `@labsafe/shared`, built with Vite 8. Design: `docs/technical-design/design-doc.md` and `docs/epics/E01-foundation/design.md`.

## List of web pages

Every route of the app, in `src/App.tsx`. Each epic adds its rows when it adds a page.

| Route | Page folder           | Epic | Story | Note |
| ----- | --------------------- | ---- | ----- | ---- |
| `/`   | `src/pages/home/`      | E01  | S01.2 | The lab rooms and hazard types from `GET /api/meta/lists`; replaced by search in E06 |
| `*`   | `src/pages/not-found/` | E01  | S01.2 | Every unknown address, inside the app shell |

## Code layout

- **Pages:** one folder per route in `src/pages/<name>/`, with `<Name>Page.tsx` and its test. Every page is a child of the `AppShell` layout route in `src/App.tsx`, so the header is always shown.
- **Shared UI:** in `src/components/`.

## Data access

- **Only through TanStack Query hooks in `src/api/`.** A hook calls `apiGet` from `src/api/client.ts`, which validates every response with the shared Zod schema from `@labsafe/shared`; a body that does not match is an error.
- **Never call `fetch` directly from a component** or a page.
- **Forms** are validated with the shared schemas.

## Screens

- **Every page handles loading, empty, error and success** explicitly (see the story's "UI states" table). Status text uses `role="status"`; errors use `role="alert"`.
- **Mobile-first at 375 px:** nothing scrolls sideways, text is at least 16 px, buttons are easy to tap.
- **Accessible markup:** a label on every input, alt text on every image, headings in order (one `h1` per page), everything reachable by keyboard with a visible focus.
- **Hazard information is never shown by colour alone;** always add text.
- **All interface text is English.**
- **Tailwind only,** no other CSS framework and no other CSS files besides `src/index.css`.

## Tests

- **Component tests:** `*.test.tsx` next to the code, with Vitest and Testing Library. Render pages with `renderApp(path)` from `src/test/render.tsx` (the real routes in a memory router).
- **Network:** MSW handlers in `src/test/msw.ts`, with fixtures built from the shared schemas (`Schema.parse({…})`). Unhandled requests fail the test; override a handler per test with `server.use(…)`.
- **Find elements by role or label,** and assert what the user sees.
- **Names:** every test title starts with its test-case identifier, for example `it('TC-7.1 shows "Page not found" …', …)`.

## Commands

- `pnpm --filter @labsafe/web test`: the web component tests.
- `pnpm dev`: the API on :3000 and the web app on :5173 (the Vite proxy forwards `/api`).
- `pnpm verify`: the whole quality gate (format check, lint, type check, unit tests, integration tests, build, docs check). It must pass before a ticket is done.
