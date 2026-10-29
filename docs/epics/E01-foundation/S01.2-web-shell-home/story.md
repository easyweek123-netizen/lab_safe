---
id: S01.2
epic: E01
title: Web app shell and home page
type: feature
status: done
covers: [NFR6, NFR2]
updated: 2026-10-29
---

# S01.2 Web app shell and home page

**As** a visitor **I want** to open LabSafe in my browser, also on a phone, and see the lab rooms and hazard types it knows, **so that** the whole chain from the browser to the database is proven to work. · Design: [design.md](../design.md) (sections 4, 8, 10)

**No role is refused in this story:** `GET /api/meta/lists`, `/` and the not-found page are public (design §9). Depends on [S01.1](../S01.1-workspace-api-quality-gate/story.md).

**Try it:** `pnpm db:up` → `pnpm db:migrate` (asks the user first) → `pnpm dev` → open `http://localhost:5173`, also in a 375 px wide window.

## Acceptance criteria

- **AC1** Given the API with a migrated database, When an anonymous visitor calls `GET /api/meta/lists`, Then the response is 200 `MetaListsResponse`: the five fixed lists exactly as defined in `@labsafe/shared` (same order) and the lab rooms from `lab_rooms` sorted by code.
- **AC2** Given reading the lab rooms fails, When anyone calls `GET /api/meta/lists`, Then the response is 500 `INTERNAL_ERROR` in the shared error format, with no internal detail.
- **AC3** Given any page of the web app, When it is shown, Then it has a header with the LabSafe wordmark linking to `/` and one main area with a maximum width; the document has `lang="en"`, the title "LabSafe" and a phone viewport; all interface text is English.
- **AC4** Given the lists request has not answered yet, When the home page is opened, Then a loading placeholder is shown and announced to screen readers.
- **AC5** Given the lists load, When the home page is shown, Then it shows the heading "LabSafe", a one-line purpose, every lab room (code and name) and every hazard type label.
- **AC6** Given the lists request fails (an error status, a network error, or a body that does not match `MetaListsResponse`), When the home page is shown, Then it shows "Couldn't load, try again." with a "Retry" button; When the visitor presses Retry and the API answers, Then the lists are shown.
- **AC7** Given an unknown address such as `/does-not-exist`, When it is opened, Then a "Page not found" page with a link to the home page is shown inside the app shell, and the link leads to the home page.
- **AC8** Given a 375 px wide window, When the home page and the not-found page are shown, Then nothing scrolls sideways and the text is readable without zooming.
- **AC9** Given the development database is up and migrated, When the developer runs `pnpm dev` and opens `http://localhost:5173`, Then the home page shows the rooms and hazard types, loaded from the API through the Vite proxy.
- **AC10** Given a developer agent starts a frontend ticket, When it opens `apps/web/CLAUDE.md`, Then it finds every rule listed for that file in design §10, including the list of web pages with `/` and `*`.

## Test cases

| TC      | AC   | Role      | Preconditions / data | Steps | Expected | Type | Ticket |
| ------- | ---- | --------- | -------------------- | ----- | -------- | ---- | ------ |
| TC-1.1  | AC1  | anonymous | Test database migrated | 1. `GET /api/meta/lists` with no cookie | 200; body parses with `MetaListsResponse`; `hazardTypes`, `protectiveEquipment`, `hazardPictograms`, `categories`, `hazardLevels` deep-equal the shared constants (15, 14, 9, 8, 3 items) | auto: api | BE-01 |
| TC-1.2  | AC1  | anonymous | Same | 1. `GET /api/meta/lists` | `labRooms` is the four placeholder rooms, sorted by `code`, each with a UUID `id` | auto: api | BE-01 |
| TC-1.3  | AC1  | —         | Sample objects | 1. Parse with `MetaListsResponse` | Accepts a valid body; rejects a room without `code` and a room whose `id` is not a UUID | auto: unit | BE-01 |
| TC-2.1  | AC2  | anonymous | Test app; the `LabRoom` repository's `find` mocked to reject with `Error("relation secret")` | 1. `GET /api/meta/lists` | 500; body parses with `ErrorResponse`, code `INTERNAL_ERROR`; body does not contain `relation secret` | auto: api | BE-01 |
| TC-3.1  | AC3  | anonymous | Memory router at `/` | 1. Render the app | A `banner` containing a link "LabSafe" to `/`; exactly one `main` landmark | auto: web | FE-01 |
| TC-3.2  | AC3  | —         | `apps/web/index.html` | 1. Read the file | `<html lang="en">`; `<title>LabSafe</title>`; `<meta name="viewport" content="width=device-width, initial-scale=1">` | auto: web | FE-01 |
| TC-3.3  | AC3  | anonymous | `pnpm dev` running | 1. Read every text on home (loaded and error state) and on not found | All text is English and reads naturally | manual | — |
| TC-4.1  | AC4  | anonymous | MSW handler for `/api/meta/lists` that never answers | 1. Render `/` | `status` "Loading…" is shown; no room or hazard type yet | auto: web | FE-03 |
| TC-5.1  | AC5  | anonymous | MSW returns the fixture (shared lists and 2 rooms) | 1. Render `/` | Heading 1 "LabSafe"; the purpose line; "LAB-101 · Teaching lab 1" and the other room; every hazard type label of the fixture | auto: web | FE-03 |
| TC-6.1  | AC6  | anonymous | MSW returns 500 with an `ErrorResponse` body | 1. Render `/` | `alert` "Couldn't load, try again."; button "Retry"; no loading text | auto: web | FE-03 |
| TC-6.2  | AC6  | anonymous | MSW returns 200 `{ "hazardTypes": "oops" }` | 1. Render `/` | Same error state as TC-6.1 | auto: web | FE-03 |
| TC-6.3  | AC6  | anonymous | MSW answers a network error once, then the fixture | 1. Render `/` 2. Wait for the alert 3. Click "Retry" | The lists are shown; the alert is gone | auto: web | FE-03 |
| TC-7.1  | AC7  | anonymous | Memory router at `/does-not-exist` | 1. Render the app | Heading 1 "Page not found"; link "Go to the home page" to `/`; the header is still shown | auto: web | FE-02 |
| TC-7.2  | AC7  | anonymous | Memory router at `/does-not-exist`; MSW returns the fixture | 1. Click "Go to the home page" | Heading 1 "LabSafe" and the rooms are shown | auto: web | FE-03 |
| TC-8.1  | AC8  | anonymous | `pnpm dev`; browser window or device mode at 375 × 812 | 1. Open `/` 2. Open `/does-not-exist` 3. Open `/` with the API stopped | No sideways scrolling; text readable; the Retry button is easy to tap | manual | — |
| TC-9.1  | AC9  | developer | Dev database up and migrated; `.env` has the values of `.env.example` | 1. `pnpm dev` 2. Open `http://localhost:5173` | Home shows the four rooms and the hazard types | manual | — |
| TC-10.1 | AC10 | user      | — | 1. Read `apps/web/CLAUDE.md` | Every bullet of design §10 for `apps/web/CLAUDE.md` is there; the page list has `/` and `*` | manual | — |

## API contract

Shared schemas (`packages/shared/src/schemas/meta.ts`, exported from `src/index.ts`; schema and type share one name):

- `ListItem { value: string, label: string }`
- `LabRoom { id: uuid, code: string, name: string }`
- `MetaListsResponse { hazardTypes: ListItem[], protectiveEquipment: ListItem[], hazardPictograms: ListItem[], categories: ListItem[], hazardLevels: ListItem[], labRooms: LabRoom[] }`

| Method | Path | Auth | Request → Response | Status codes |
| ------ | ---- | ---- | ------------------ | ------------ |
| GET | /api/meta/lists | Public | none → `MetaListsResponse` | 200; 500 `INTERNAL_ERROR` |

## UI states

| Route | Screen | Loading | Empty | Error | Success |
| ----- | ------ | ------- | ----- | ----- | ------- |
| `/` | Home | `status` "Loading…" | None: the lists are never empty (design §8) | `alert` "Couldn't load, try again." and a "Retry" button | "LabSafe" heading, purpose line "Safety information for every instrument in our chemistry lab.", "Lab rooms" list (`LAB-101 · Teaching lab 1`), "Hazard types" list |
| `*` | Not found | — | — | — | Heading "Page not found", text "The page you are looking for does not exist.", link "Go to the home page" |

**App shell (every route):** a `header` with the wordmark link "LabSafe" to `/`; a `main` with a maximum width (`max-w-5xl`) and side padding; mobile-first, no horizontal scrolling at 375 px.

## Tickets

In build order (BE first; the first BE ticket implements the contract):

1. [BE-01 Meta lists contract and endpoint](be/BE-01-meta-lists-endpoint.md)
2. [FE-01 Web app scaffold and app shell](fe/FE-01-web-scaffold-shell.md)
3. [FE-02 Not-found page and web coding rules](fe/FE-02-not-found-web-rules.md)
4. [FE-03 Home page with the lists from the API](fe/FE-03-home-page.md)

## Out of scope

- Search and filters (E06 replaces the home page); a navigation menu, sign-in links (E02).
- Serving the web build from Nest, end-to-end tests at 375 px (S01.3).
- Caching headers for `/api/meta/lists`.

## Known gaps

Unticked by the user on 2026-10-29 (accepted, not fixed). Full text in [review.md](review.md) and [qa.md](qa.md).

- F2 [minor][fe] `apps/web/tsconfig.json` gives all of `src/` the Node types, so browser code using `process.env` or `node:*` would pass the type check.
- F3 [minor][fe] Pressing Retry removes the button, so keyboard focus falls back to the page body; after a second failure the user must Tab back to Retry.
- F4 [minor][fe] TanStack Query's default `networkMode: 'online'` pauses requests while the browser is offline, so an offline phone shows "Loading…" forever and Retry does nothing visible.
- B1 [minor][fe] The home page's loading and error states have no level-1 heading.
- B2 [minor][fe] Every full page load logs a 404 for `favicon.ico`; the app has no icon.

## Verification

**GREEN** · 2026-10-29

- **1. Acceptance criteria.** Each one is implemented as written.
  - AC1: `apps/api/src/modules/meta/meta.service.ts:28-37` returns the five shared lists in their defined order and the rooms sorted by `code`. Proved by `apps/api/test/meta.int.test.ts:36-84`.
  - AC2: the service does not catch the error (`meta.service.ts:24-29`), so `apps/api/src/common/error.filter.ts:77` answers 500 `INTERNAL_ERROR`. Proved by `meta.int.test.ts:92-106`, which also checks that "relation secret" does not leak.
  - AC3: `apps/web/src/components/AppShell.tsx:8-20` and `apps/web/index.html:2-6`; tests at `apps/web/src/App.test.tsx:8-26`.
  - AC4: `apps/web/src/pages/home/HomePage.tsx:11-17` shows `role="status"` "Loading…"; test at `HomePage.test.tsx:27-40`.
  - AC5: `HomePage.tsx:36-77`; test at `HomePage.test.tsx:42-65`.
  - AC6: the three kinds of failure become one `ApiError` (`apps/web/src/api/client.ts:28-48`); the alert and the Retry button are at `HomePage.tsx:19-34`; tests at `HomePage.test.tsx:67-119`.
  - AC7: `apps/web/src/pages/not-found/NotFoundPage.tsx:4-18` sits under the shell (`apps/web/src/App.tsx:13-16`); tests at `NotFoundPage.test.tsx:6-22` and `HomePage.test.tsx:121-128`.
  - AC8, AC9, AC10 and TC-3.3 are manual and passed in [qa.md](qa.md) Run 1 (TC-8.1, TC-9.1, TC-10.1). For AC10, `apps/web/CLAUDE.md:5-45` has every bullet of design §10, and its page list (lines 9-12) has `/` and `*`.
  - The user accepted F2, F3 and F4 ([review.md](review.md)) and B1 and B2 ([qa.md](qa.md)). None of them breaks an acceptance criterion as written: B1 matches the "UI states" table, where only the success state has a heading.
- **2. Contract.** `packages/shared/src/schemas/meta.ts:5-26` defines `ListItem`, `LabRoom` (`z.uuid()`) and `MetaListsResponse` exactly as in "API contract" above. Schema and type share one name, and they are exported at `packages/shared/src/index.ts:4`. `GET /api/meta/lists` is `apps/api/src/modules/meta/meta.controller.ts:9-17`: public, takes no input, and answers 200 or 500 `INTERNAL_ERROR`. The web app calls the same path and validates the body with the same schema (`apps/web/src/api/meta.ts:9`).
- **3. Tables and migrations.** No new migration, as E01 design §3 says. `apps/api/src/modules/meta/lab-room.entity.ts:8-21` matches `apps/api/src/db/migrations/1793232000000-CreateLabRooms.ts:13-17`, including the constraint names. `meta.int.test.ts:86-90` checks that the schema builder finds no pending change. `synchronize: false` is unchanged (`apps/api/src/db/data-source.ts:17`).
- **4. Data rules.**
  - The fixed lists come only from the shared constants (design §3, D15; `meta.service.ts:31-35`).
  - Rooms are returned as plain objects, never as entities (`meta.service.ts:36`).
  - No internal detail leaks on error (design §4; `error.filter.ts:77`).
  - Nothing changes the schema on connect: `data-source.ts:18-21` sets `installExtensions: false`.
- **5. Layering.**
  - API: thin controller → service → repository, as design-doc §2 says (`meta.controller.ts:15-17`, `meta.service.ts:22-29`); the module is registered at `apps/api/src/app.module.ts:22`.
  - Web: page → TanStack Query hook in `src/api` → `apiGet` → `fetch` (`HomePage.tsx:7`, `api/meta.ts:6-12`, `api/client.ts:30`), with no `fetch` in any component.
  - Tailwind only (`apps/web/src/index.css:1`). MSW fixtures are parsed with the shared schema (`apps/web/src/test/msw.ts:15`).
  - The tooling commands match E01 design §5: `pnpm dev` runs `dev:shared`, `dev:api` and `dev:web` (root `package.json:10-13`), and Vite runs on :5173 with an `/api` proxy (`apps/web/vite.config.ts:12-16`, `apps/web/package.json:7`).
- **6. Nothing built beyond the story.** No search, navigation, sign-in, serving from Nest or caching headers.
  - The extras are all recorded and needed: the two extra tests in BE-01, the `@testing-library/dom` and `@types/node` devDependencies, the ESLint Node block for `vite.config.ts` (`eslint.config.mjs:37-43`), and `allowBuilds` `msw: false` (`pnpm-workspace.yaml:9`).
  - The library majors match E01 design §1 (`apps/web/package.json:12-35`).
- **7. Differences from the plan are written down.**
  - BE-01 "Implementation notes": the `data-source.ts` options and the constraint names on the entity.
  - FE-01 notes: the layout route has `path: '/'`, plus the extra devDependencies, the tsconfig types, the alias that depends on `mode`, and the ESLint block.
  - FE-02 notes: the additions to `apps/web/CLAUDE.md`.
  - FE-03 notes: `role="alert"` on the message only, `safeParse` in `apiGet`, `allowBuilds` `msw: false`, and the F1 fix.
  - Not yet in the design documents, left for /eod: the "Loading…" step during Retry in the TC-6.3 row, and the E01 design §1/§2/§4/§6 details.

## Changes
