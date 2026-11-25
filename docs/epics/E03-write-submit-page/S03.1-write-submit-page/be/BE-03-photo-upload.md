---
id: BE-03
story: S03.1
layer: be
status: done
depends_on: [BE-01, BE-02]
covers: [AC4, AC5, AC6, AC7, AC14, AC15, AC19]
updated: 2026-11-24
---

# BE-03 Photo upload and serving

**Goal:** `POST /api/photos` stores a re-encoded photo without metadata, and `GET /api/photos/:id` serves it only to its owner and admins. **Contract:** [story.md](../story.md#api-contract)

## Files

- create `apps/api/src/modules/photos/photos.module.ts`, `photos.controller.ts`, `photos.service.ts`, `photo.response.ts`
- change `apps/api/src/app.module.ts`
- change `apps/api/package.json` (`sharp`; dev `@types/multer`), `pnpm-workspace.yaml` (`allowBuilds:` `sharp`)
- create `apps/api/test/photos.int.test.ts` (and small fixtures under `apps/api/test/fixtures/` if needed)

## Constraints

- `POST` is `@Contributor()`; `GET /:id` is `@Public()` and the service decides (decision E03-D4): owner or approved admin → bytes, everyone else and unknown ids → the same 404 `NOT_FOUND`. A malformed id is 400 through `PhotoIdParam`.
- The guards run before the upload is read, so refused callers never get their file buffered. The file stays in memory (no disk), with the limit `PHOTO_MAX_BYTES` and one file.
- Nest turns multer's size error into a `PayloadTooLargeException`; it must reach the client as 413 `PHOTO_TOO_LARGE` with the contract message, not `REQUEST_REJECTED` (design "Risks"). No file → 400 `VALIDATION_FAILED` with `fields: photo`.
- `sharp` reads the format from the bytes; only `jpeg` and `png` pass, anything else, including an unreadable image, is 415 `PHOTO_TYPE`. The file's name and stated type are ignored. Keep sharp's input pixel limit on.
- Re-encoding as in decision E03-D8: auto-rotate, fit inside 1600 × 1600 without enlarging, flatten on white, JPEG quality 80, no metadata kept. Store width and height of the result.
- `GET` sends `Content-Type: image/jpeg`, `Cache-Control: private, no-cache`, `X-Content-Type-Options: nosniff`. The controller stays thin; return the bytes through Nest, not by writing to the response by hand.
- `PhotosService` also offers the check "is this photo id an upload of this user", for BE-04. `PhotosModule` exports only that service.
- Integration tests (titles `S03.1 AC<n>`): JPEG and PNG accepted with size limits of the result (AC4); 5 MB + 1 byte → 413 with the message and no row (AC5); a PDF named `.jpg` with type `image/jpeg` → 415, no file → 400 (AC6); a JPEG built with GPS and camera EXIF comes back with no EXIF, XMP or IPTC (AC7, for example built and inspected with `sharp` itself); anonymous 401, pending and rejected 403 on `POST` with no row (AC14); the `GET` matrix of AC15 with the headers; an anonymous `GET` of a submitted page's photo is 404 (AC19, once BE-04 exists, or with a row inserted by the test).
- Never log file contents. Schema change: no.

## Out of scope

Showing a photo of a published page to the public (E04 extends the visibility check). Deleting unsubmitted photos (epic open question 8).

## Implementation notes

**Files changed:**

- apps/api/src/modules/photos/photos.module.ts
- apps/api/src/modules/photos/photos.controller.ts
- apps/api/src/modules/photos/photos.service.ts
- apps/api/src/modules/photos/photo.response.ts
- apps/api/src/modules/photos/photo-upload-errors.interceptor.ts
- apps/api/src/app.module.ts
- apps/api/package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- apps/api/test/photos.int.test.ts

**Differences from the ticket:**

- One extra file, `photo-upload-errors.interceptor.ts`: an interceptor listed before Nest's `FileInterceptor` on `POST /api/photos` only. It turns multer's `PayloadTooLargeException` into 413 `PHOTO_TOO_LARGE` and multer's `BadRequestException` (a file in another field, or a second file) into the same 400 `VALIDATION_FAILED` on `photo` "Choose a photo" as a request without a file. The global `ErrorFilter` is unchanged, so the JSON body parser's 413 stays `REQUEST_REJECTED`.
- No test fixtures on disk: the test builds every image with `sharp` (a JPEG with camera EXIF, a GPS block, XMP and orientation 6; a transparent PNG; a GIF; a truncated JPEG).
- Multer keeps the file in memory because no `dest` or `storage` is given; `multer` itself is not a direct dependency. The controller has `import type {} from 'multer'` so the global `Express.Multer.File` type of `@types/multer` loads (the tsconfig limits `types` to `node`).
- A readable image in another format (for example a GIF) and a JPEG or PNG that fails to decode are both 415 `PHOTO_TYPE`. Only sharp's error message is logged as a warning, never the file.
- `PhotosService.isOwnedBy(photoId, userId)` is the check for BE-04. `read()` answers 404 without a query for anonymous, pending and rejected callers; for an approved contributor it selects only their own photo, and for an approved admin any photo.
- AC19 is tested with a pending revision inserted straight into the tables, because BE-04 does not exist yet.
- Versions: `sharp` ^0.35.5, `@types/multer` ^2.3.0 (dev).
