---
id: BE-03
story: S01.1
layer: be
status: done
depends_on: [BE-02]
covers: [AC6, AC8]
updated: 2026-11-16
---

# BE-03 Error format and validation pipe

**Goal:** make every API error use the shared `ErrorResponse` shape and give later epics a `ZodValidationPipe` that returns 400 `VALIDATION_FAILED` with field errors. **Automates:** TC-6.2, TC-6.3, TC-8.1, TC-8.2. **Contract:** [story.md § API contract](../story.md#api-contract)

## Files

- create `apps/api/src/common/app.exception.ts`
- create `apps/api/src/common/error.filter.ts`, `apps/api/src/common/error.filter.test.ts`
- create `apps/api/src/common/zod-validation.pipe.ts`, `apps/api/src/common/zod-validation.pipe.test.ts`
- create `apps/api/src/app.setup.ts`
- change `apps/api/src/main.ts`

## Approach

1. **`app.exception.ts`:** `class AppException extends Error` with `status: number`, `code: ErrorCode`, `message`, optional `fields: FieldError[]` (types from `@labsafe/shared`). Services throw this for every expected error.
2. **`error.filter.ts`** (design §4, design doc §8): a global `@Catch()` filter, `ErrorFilter`, that always answers JSON parsed by `ErrorResponse`:
   - `AppException` → its status, code, message and fields;
   - Nest `HttpException` 404 (including unknown routes) → 404 `NOT_FOUND`, message `Not found.`;
   - Nest `HttpException` 400 (for example malformed JSON) → 400 `VALIDATION_FAILED`, message `The request is not valid.`;
   - anything else → 500 `INTERNAL_ERROR`, message `Something went wrong.`. Log the original error with Nest's `Logger` on the server; never put its message or stack in the response.
   Later epics add their codes (401, 403, 409, 413, 415, 429) to `ErrorCode` and to this filter.
3. **`zod-validation.pipe.ts`:** `new ZodValidationPipe(schema)` implements `PipeTransform`. It calls `schema.safeParse(value)`; on success it returns `data`; on failure it throws `AppException(400, 'VALIDATION_FAILED', 'Some fields are missing or invalid.', fields)`, with one `{ path: issue.path.join('.'), message: issue.message }` per Zod issue. No endpoint uses it in E01 (design §4).
4. **`app.setup.ts`:** `configureApp(app: INestApplication)`: `app.setGlobalPrefix('api')` and `app.useGlobalFilters(new ErrorFilter())`. `main.ts` calls it before `listen`; BE-05's `createTestApp` calls the same function, so tests run the real set-up.
5. **Tests:** `error.filter.test.ts` (TC-6.2, TC-6.3) uses a fake `ArgumentsHost` whose response records `status()` and `json()`; check the body with `ErrorResponse.parse`. `zod-validation.pipe.test.ts` (TC-8.1, TC-8.2) uses the schema given in the story. Titles start with the TC identifier.
6. **Proof of work:** `pnpm --filter @labsafe/api test`, `pnpm typecheck`, `pnpm build`.

## Out of scope

The integration test for an unknown route (TC-6.1, BE-05). Guards and error codes of later epics.

## Implementation notes

- `AppException(status, code, message, fields?)` in `apps/api/src/common/app.exception.ts`; types come from `@labsafe/shared`.
- `ErrorFilter` (`@Catch()`) in `apps/api/src/common/error.filter.ts` maps `AppException` (status, code, message, and `fields` only when present), Nest `HttpException` 404 → `NOT_FOUND` / `Not found.`, 400 → `VALIDATION_FAILED` / `The request is not valid.`, and everything else → 500 `INTERNAL_ERROR` / `Something went wrong.`. Only the 500 branch logs the original message and stack via Nest `Logger`. Any other `HttpException` status (for example 405 or 413 from Nest) also becomes 500, as step 2 says; later epics add their mappings.
- The filter types the response with a minimal local `JsonResponse` interface (`status()`, `json()`) instead of Express's `Response`, because `@types/express` is not a dependency and the ticket adds none.
- `ZodValidationPipe<Schema extends z.ZodType>` in `apps/api/src/common/zod-validation.pipe.ts` returns `z.output<Schema>`; fields are `{ path: issue.path.join('.'), message: issue.message }`.
- `configureApp(app)` in `apps/api/src/app.setup.ts` sets the `api` prefix and the global filter; `main.ts` calls it before `listen`.
- Tests: `error.filter.test.ts` (TC-6.2 ×2, TC-6.3 ×4; the `Logger.error` spy both silences and asserts the server-side log) and `zod-validation.pipe.test.ts` (TC-8.1 ×2 including a nested `room.code` path and an `undefined` body, TC-8.2).
- Proof of work: `pnpm --filter @labsafe/api test` (18 passed), `pnpm typecheck` and `pnpm build` exit 0. Extra manual smoke check of the built app with a dummy `DATABASE_URL` on port 3999 (no database is used yet): `GET /api/does-not-exist` → 404 `NOT_FOUND`; malformed JSON `POST` → 400 `VALIDATION_FAILED`, so body-parser errors do reach the filter.
- Note for S01.3: paths outside `/api` (for example `/nope`) also get the JSON 404 today; serving the web app there is S01.3's job.
- No deviations from the ticket or design. No migrations.
- Review fix F2 (2026-10-29): replaces the "any other `HttpException` status also becomes 500" behaviour above. Every 4xx, whether a Nest `HttpException` or an error with a numeric 4xx `status`/`statusCode` (for example body-parser's `PayloadTooLargeError`, 413), now keeps its status: 400 → `VALIDATION_FAILED`, 404 → `NOT_FOUND`, any other 4xx → new shared code `REQUEST_REJECTED` with `The request was rejected.`, logged only at `warn`. 5xx and everything else stay 500 `INTERNAL_ERROR` with an `error` log. `REQUEST_REJECTED` was added to `ErrorCode` in `packages/shared/src/errors.ts`; it is a deviation from step 1's enum and from design doc §8, which do not list it. Tests: six `F2 …` unit tests in `error.filter.test.ts` and one `F2 …` integration test in `test/foundation.int.test.ts` (a 200 kB JSON body → 413).
- Epic review fix F2 (2026-11-16): narrows the review fix above. A non-`HttpException` error keeps its 4xx `status`/`statusCode` only when it also has `expose === true` (the flag `http-errors` sets on Express request errors such as body-parser's). Any other object with a 4xx status, for example a later outbound SDK's 401, becomes 500 `INTERNAL_ERROR` with an `error` log. The existing `F2 …` unit tests now set `expose: true` on their non-Nest errors; a new `TC-6.2 …` unit test checks that `{ status: 401 }`, an `Error` with `status: 401`, and one with `expose: false` all give 500.
