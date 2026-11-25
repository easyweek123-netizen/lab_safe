# Web coding rules (`apps/web`)

React 19, React Router 8, TanStack Query 5, Tailwind 4, Zod 4 from `@labsafe/shared`, built with Vite 8.

## Pages

Every route is in `src/App.tsx`. Add a row when you add a page.

| Route | Folder | Story | Note |
| ----- | ------ | ----- | ---- |
| `/` | `src/pages/home/` | S01.2 | Lab rooms and hazard types; replaced by search in E06 |
| `/signup` | `src/pages/signup/` | S02.1 | Sign-up form; a signed-in visitor goes to `/contribute` |
| `/login` | `src/pages/login/` | S02.1 | Login form; goes to a local `next` path or `/contribute` |
| `/contribute` | `src/pages/contribute/` | S02.1, S03.1, S03.2 | Contributor area behind `RequireAccount` (contributor level): "New safety page" link, the submit or save confirmation from the router state, and My submissions (`GET /api/submissions/mine`, each name links to its edit page); PENDING and REJECTED accounts see the notice at this address |
| `/contribute/new` | `src/pages/new-safety-page/` | S03.1 | New safety page form (`SafetyPageForm`), behind `RequireAccount` (contributor level); a submitted page goes to `/contribute` with the confirmation in the router state |
| `/contribute/submissions/:id` | `src/pages/edit-safety-page/` | S03.2 | Edit a pending page: `SafetyPageForm` filled once from `GET /api/submissions/:id`, "Save changes" sends `PUT`, behind `RequireAccount` (contributor level); unknown, malformed or someone else's id (an admin's included) shows "Page not found"; a save goes to `/contribute` with the confirmation in the router state |
| `/admin/sign-ups` | `src/pages/admin-sign-ups/` | S02.2 | Pending sign-ups with Approve and Reject, behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/admin/accounts` | `src/pages/admin-accounts/` | S02.3 | Approved accounts with "Make admin" or "Remove admin", behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `*` | `src/pages/not-found/` | S01.2 | Every unknown address |

## Layout

```
src/
  App.tsx              routes, all under the AppShell layout
  api/                 client.ts and one TanStack Query hook file per resource
  assets/ghs/          the nine GHS pictogram SVGs (public domain, source in ghs-symbols.ts)
  components/          UI shared by several pages
    safety-page-form/  SafetyPageForm (used by /contribute/new and /contribute/submissions/:id),
                       its sections, PhotoField, ErrorSummary, form-values.ts, field-labels.ts
  pages/<name>/        <Name>Page.tsx, its own components, and their tests
  test/                MSW handlers, render helper, setup
```

**Shared inputs:** `TextField`, `TextArea` in `src/components/`; `SectionFieldset`, `SelectField`, `RadioGroup`, `Checkbox`, `CheckboxWithNote`, `ChoiceGroup` in `src/components/safety-page-form/`. The form's field names are the contract's (`SafetyPageContent`), so a server `fields` path is a form field, and `fieldId(path)` gives its input id. Multipart uploads go through `apiSendForm` in `client.ts`.

## Coding rules

- **Components:** function components only; one component per file, named like the file (`LoginForm.tsx`). A component used by one page lives in that page's folder.
- **Server data:** only through TanStack Query hooks in `src/api/`. Query keys are arrays (`['pages', id]`). Changes use `useMutation` and then `invalidateQueries`. Never copy server data into `useState`. A mutation that must fail at once while offline (submit, save, photo upload) sets `networkMode: 'always'`; once a query has data, a failed background refresh keeps showing that data instead of an error (E03-D7; the gate, the header and the edit page do this).
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

- **Component tests:** `*.test.tsx` next to the component, with Vitest and Testing Library. Render pages with `renderApp(path)` from `src/test/render.tsx`. Mock the network with MSW (`src/test/msw.ts`); unhandled requests fail. Its default handlers answer `GET /api/submissions/mine` with an empty list; `uploadedFile(request, field)` reads a multipart upload (the setup swaps in Node's `FormData`, `File` and `Blob`, which jsdom's `fetch` can't send). `renderApp` also returns its `queryClient`, to wait for a background refresh to settle.
- **End-to-end tests:** `e2e/tests/*.spec.ts` with Playwright, run at desktop width and at 375 px. Every new page gets a no-sideways-scroll check. Shared steps (sign up, log in, log in as the setup admin from `e2e/test-env.ts`, approve, change role) are in `e2e/helpers/accounts.ts`; every test uses its own unique email, because both widths share one database. Safety-page steps (`openNewSafetyPage`, `fillCompletePage`, `openSubmission`) are in `e2e/helpers/safety-page.ts`, with the photo `e2e/fixtures/instrument.jpg` (`INSTRUMENT_JPEG`).
- **Titles** start with the story and acceptance criterion: `S02.1 AC7 shows "Page not found"`. E01's tests keep their `TC-…` titles.
- Find elements by role or label; assert what the user sees.

## Commands

- `pnpm --filter @labsafe/web test`: component tests.
- `pnpm dev`: API on :3000, web on :5173.
- `pnpm e2e`: end-to-end tests (never at the same time as `pnpm verify`).
