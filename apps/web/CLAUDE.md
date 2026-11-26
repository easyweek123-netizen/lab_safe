# Web coding rules (`apps/web`)

React 19, React Router 8, TanStack Query 5, Tailwind 4, Zod 4 from `@labsafe/shared`, built with Vite 8.

## Pages

Every route is in `src/App.tsx`. Add a row when you add a page.

| Route | Folder | Story | Note |
| ----- | ------ | ----- | ---- |
| `/` | `src/pages/home/` | S01.2 | Lab rooms and hazard types; replaced by search in E06 |
| `/signup` | `src/pages/signup/` | S02.1 | Sign-up form; a signed-in visitor goes to `/contribute` |
| `/login` | `src/pages/login/` | S02.1 | Login form; goes to a local `next` path or `/contribute` |
| `/contribute` | `src/pages/contribute/` | S02.1, S03.1, S03.2, S04.2, S04.3 | Contributor area behind `RequireAccount` (contributor level): "New safety page" link, the submit or save confirmation from the router state, and My submissions (`GET /api/submissions/mine`, each name links to its edit page, an approved one to `/instruments/<slug>`; a rejected row adds "Admin's note: <note>" with its line breaks); PENDING and REJECTED accounts see the notice at this address |
| `/contribute/new` | `src/pages/new-safety-page/` | S03.1, S04.4 | New safety page form (`SafetyPageForm`), behind `RequireAccount` (contributor level); a submitted page goes to `/contribute` with the confirmation in the router state; the failure texts say "try again" (`failure-messages.ts`), choosing a photo clears the old failure `alert`, and with a photo shown "Change photo" carries the photo field's id, hint and message |
| `/contribute/submissions/:id` | `src/pages/edit-safety-page/` | S03.2, S04.2, S04.3, S04.4 | Edit a pending page: `SafetyPageForm` filled once from `GET /api/submissions/:id`, "Save changes" sends `PUT`, behind `RequireAccount` (contributor level); unknown, malformed or someone else's id (an admin's included) shows "Page not found"; a save goes to `/contribute` with the confirmation in the router state; an approved page shows "This page was approved and can't be changed here." with "Open the public page" and no form, but a form already open stays and a 409 on save shows the server's message; a rejected page is the fix form: h1 "Fix safety page" ("Edit safety page" until loaded), `ReviewNote` (h2 "Admin's note" and the text) above the form, "Resubmit for review" / "Resubmitting…" with the same `PUT`, confirmation "<name> was resubmitted and is waiting for review."; edit or fix is fixed when the form is first shown, so a refresh never changes it |
| `/admin/sign-ups` | `src/pages/admin-sign-ups/` | S02.2 | Pending sign-ups with Approve and Reject, behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/admin/accounts` | `src/pages/admin-accounts/` | S02.3 | Approved accounts with "Make admin" or "Remove admin", behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/admin/review` | `src/pages/admin-review/` | S04.1, S04.2 | Pages to review: every pending page from `GET /api/admin/review-queue` in the server's order (oldest first), each name a link to `/admin/review/<id>`, with "New" or "Update", the submitter and the date; the confirmation from the router state, with "Open the public page" for an `/instruments/` `publicPath`; a failed background refresh keeps the list; behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/admin/review/:id` | `src/pages/admin-review-submission/` | S04.1, S04.2, S04.3 | Preview of one submission from `GET /api/admin/submissions/:id`: h1 "Review a new page", "Submitted by <name> on <date>", then `DecisionPanel` ("Approve" sends the loaded `version`; "Note for the contributor" and "Reject" send the note checked with `RejectSubmissionRequest`, its message and a server `fields: note` next to the field with focus; success goes to `/admin/review` with the confirmation and public path in the router state; one `alert` at a time for a failure, see `decision-messages.ts`) or, for a page no longer pending, "This page has already been reviewed.", then `SafetyPageView` with `headingLevel` 2; unknown or malformed id (no request) shows "Page not found"; a failed background refresh keeps the preview; behind `RequireAccount` (admin level); an approved contributor sees "No access" |
| `/instruments/:slug` | `src/pages/safety-page/` | S04.2 | The published page for anyone, outside every `RequireAccount`: `GET /api/instruments/:slug` (`usePublishedPage`) in `SafetyPageView` with `headingLevel` 1 (its title is the h1) and "Last approved <date> by <name>"; status "Loading safety page…" and the alert "Couldn't load this safety page, try again." with Retry under a hidden h1; an unknown or unpublished slug, or one outside `InstrumentSlugParam` (no request), shows "Page not found"; a failed background refresh keeps the page |
| `*` | `src/pages/not-found/` | S01.2 | Every unknown address |

## Layout

```
src/
  App.tsx              routes, all under the AppShell layout
  api/                 client.ts and one TanStack Query hook file per resource
  assets/ghs/          the nine GHS pictogram SVGs (public domain, source in components/ghs-symbols.ts)
  components/          UI shared by several pages; ghs-symbols.ts (form and view), format-date.ts
                       (the "25 Nov 2026" date of My submissions, the queue and "Last approved")
    safety-page-form/  SafetyPageForm (used by /contribute/new and /contribute/submissions/:id),
                       its sections, PhotoField, ErrorSummary, form-values.ts, field-labels.ts
    safety-page-view/  SafetyPageView (a SafetyPageDisplay as the public page shows it; the
                       admin's preview renders it with headingLevel 2, the public page with 1),
                       its parts, and labels.ts (the PRD list labels by value)
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
- **End-to-end tests:** `e2e/tests/*.spec.ts` with Playwright, run at desktop width and at 375 px. Every new page gets a no-sideways-scroll check. Shared steps (sign up, log in, log in as the setup admin from `e2e/test-env.ts`, approve, change role) are in `e2e/helpers/accounts.ts`; every test uses its own unique email, because both widths share one database. Safety-page steps (`openNewSafetyPage`, `fillCompletePage(page, name?)`, `submitCompletePage(page, name)`, `openSubmission`) are in `e2e/helpers/safety-page.ts`, with the photo `e2e/fixtures/instrument.jpg` (`INSTRUMENT_JPEG`); `fillCompletePage` names the page "Rotary evaporator" unless given a name, and the E03 specs expect that page to stay unpublished. Review steps (`uniquePageName`, `todayInBrowser`, `openReviewQueue`, `reviewRow`, `openReviewSubmission`, `approveFromPreview`, `rejectFromPreview(page, name, note)`, `expectedSlug`) are in `e2e/helpers/review.ts`; every review test gives its page a unique name (`Rotary evaporator <unique>`), because other specs leave pending pages in the list. To set up a page without the browser, `apiContributor(testInfo)` signs up and approves a contributor in Playwright `request` contexts and its `submit(name, { hazards?, protectiveEquipment? })` uploads the photo and submits a page; `approveThroughApi(id)` approves it as the setup admin with the preview's `version` and returns the slug. `browser.newContext()` does not take the project's viewport: pass `viewport: page.viewportSize()` (or a fixed 375 × 812) when its checks depend on the width.
- **Titles** start with the story and acceptance criterion: `S02.1 AC7 shows "Page not found"`. E01's tests keep their `TC-…` titles.
- Find elements by role or label; assert what the user sees.

## Commands

- `pnpm --filter @labsafe/web test`: component tests.
- `pnpm dev`: API on :3000, web on :5173.
- `pnpm e2e`: end-to-end tests (never at the same time as `pnpm verify`).
