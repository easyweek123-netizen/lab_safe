---
id: FE-01
story: S03.1
layer: fe
status: done
depends_on: [BE-03, BE-04]
covers: [AC4, AC5, AC6, AC17]
updated: 2026-11-24
---

# FE-01 Photo field and submission hooks

**Goal:** the web app can upload a photo and send or list submissions, and the form has a photo field with its upload, preview and error states. **Contract:** [story.md](../story.md#api-contract)

## Files

- change `apps/web/src/api/client.ts`, `apps/web/src/api/client.test.ts`
- create `apps/web/src/api/photos.ts`, `apps/web/src/api/submissions.ts`
- create `apps/web/src/components/safety-page-form/PhotoField.tsx`, `PhotoField.test.tsx`
- change `apps/web/src/test/msw.ts` (photo, submission and list fixtures parsed with the shared schemas)

## Constraints

- `client.ts` gains one multipart sender next to `apiSend`, the only other place that calls `fetch`. It lets the browser set the `multipart/form-data` boundary (never set the header by hand), validates the response with the shared schema, and throws `ApiError` like the rest (status 0 for a network error).
- Hooks: `useUploadPhoto`, `useSubmitPage` (POST, invalidates the My submissions query on success) and `useMySubmissions` (query key `['submissions', 'mine']`). The two mutations use `networkMode: 'always'`, so offline they fail at once instead of waiting (decision E03-D7). A 401 or 403 does **not** invalidate `['auth', 'me']`: the form must stay on screen (AC17), unlike the admin hooks in `admin-users.ts`.
- `PhotoField` checks size (`PHOTO_MAX_BYTES`) before uploading, accepts `image/jpeg, image/png` in the picker, uploads at once (decision E03-D1), and reports the uploaded id to the form. Texts and states exactly as in the story's "UI states", AC4–AC6 and AC17's photo part; the server's message is shown for 413 and 415. The preview is `<img src="/api/photos/<id>">` with alt "Photo of the instrument".
- Accessible: a label "Photo", the hint and the message as the input's description (the `TextField.tsx` pattern), keyboard-reachable "Change photo".
- Component tests titled `S03.1 AC<n>` for AC4, AC5, AC6 and the photo part of AC17, with MSW.
- Schema change: no.

## Out of scope

The other form fields (FE-02, FE-03), submitting the page (FE-04).

## Implementation notes

**Files changed:**

- apps/web/src/api/client.ts
- apps/web/src/api/client.test.ts
- apps/web/src/api/photos.ts
- apps/web/src/api/submissions.ts
- apps/web/src/api/submissions.test.tsx
- apps/web/src/components/safety-page-form/PhotoField.tsx
- apps/web/src/components/safety-page-form/PhotoField.test.tsx
- apps/web/src/components/safety-page-form/failure-messages.ts
- apps/web/src/test/msw.ts
- apps/web/src/test/setup.ts

**Differences from the ticket:**

- The multipart sender is `apiSendForm(path, form, schema)` (POST only).
- `PhotoField` is controlled: `id`, `value` (the photo id or null), `onChange(photoId)` and `error` (the form's own `photoId` message). FE-02 wires it with react-hook-form's `Controller`. The error summary links to the input by `id`.
- "Submit for review disabled while uploading" uses a mutation key, not a callback. `useUploadPhoto` runs under `['photos', 'upload']`, and `useIsUploadingPhoto()` (`useIsMutating`) tells the form whether an upload is running.
- When a photo is already there, the file input gets the `hidden` attribute and "Change photo" opens its picker. A failed upload keeps the photo the form already had.
- New `failure-messages.ts` holds the AC17 texts (session ended, can't submit, photo upload failed, 5 MB) and `photoUploadMessage(error)`. FE-04 reuses the 401 and 403 texts for its submit alert. A 400 shows the server's `photo` field message.
- New `submissions.test.tsx` tests the hooks. It covers the list query, the POST body and the invalidation of `['submissions', 'mine']`. It also covers failing at once while offline, and that a 401 leaves `['auth', 'me']` alone.
- `src/test/setup.ts`: in jsdom, Node's `fetch` can't send jsdom's `FormData`, `File` and `Blob`. The file arrived as the text "[object File]" or the request failed. The setup now swaps in Node's own classes, and `msw.ts` gained `uploadedFile(request, field)`, which reads the multipart body as text, because MSW's `formData()` can't parse it under jsdom.
- `msw.ts` fixtures: `photoFixture`, `rotavapContent`, `rotavapSubmission`, `mySubmissionsFixture`, `mySubmissionsHandler`, and the `PHOTOS`, `PHOTO`, `SUBMISSIONS` and `MY_SUBMISSIONS` patterns. There are no default handlers for them, so each test states its answer.

**Verification (2026-11-24):** `pnpm verify` has not had a clean run yet. Two runs failed only on timeouts in `apps/api` tests that this ticket doesn't touch. In each run, one test sat for about 935 to 1,059 s of wall-clock time before hitting the 5 s limit, and the failing test was different each time, including a unit test with no database (`password.test.ts`). That points to the machine stalling, not to the code. Formatting, lint, type check, the web tests (140 passed), `pnpm build` and `pnpm docs:check` all pass. Rerun `pnpm verify` before the story review.
