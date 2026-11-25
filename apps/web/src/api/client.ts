import { ErrorResponse, type ErrorCode, type FieldError } from '@labsafe/shared';
import type { z } from 'zod';

/** A failed API call: an error status, a network error (status 0), or a body that breaks the contract. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ErrorCode;
  /** The server's per-field messages (400 `VALIDATION_FAILED`, 409 `EMAIL_TAKEN`). */
  readonly fields?: FieldError[];

  constructor(message: string, status: number, code?: ErrorCode, fields?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** `/api` + `path` as an absolute URL, so it also works under jsdom in the component tests. */
function apiUrl(path: string): URL {
  return new URL(`/api${path}`, window.location.origin);
}

/** `fetch`, with a network error turned into `ApiError` status 0. */
async function request(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), init);
  } catch {
    throw new ApiError('Network error', 0);
  }
}

/** Throws the `ApiError` of a non-2xx response, keeping the server's code and `fields`. */
async function throwIfFailed(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  const body: unknown = await res.json().catch(() => undefined);
  const parsed = ErrorResponse.safeParse(body);
  throw parsed.success
    ? new ApiError(parsed.data.message, res.status, parsed.data.code, parsed.data.fields)
    : new ApiError(`Request failed with status ${res.status}`, res.status);
}

/** Reads the JSON body and validates it with the shared `schema`. */
async function parseBody<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await res.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('The response does not match the contract', res.status);
  }
  return parsed.data;
}

/**
 * GET `/api` + `path` and validate the body with the shared `schema`. The only way the web app
 * reads from the API: a non-2xx status, a network error or a body that does not match the
 * contract all throw `ApiError`.
 */
export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const res = await request(path, { headers: { Accept: 'application/json' } });
  await throwIfFailed(res);
  return parseBody(res, schema);
}

type SendMethod = 'POST' | 'PUT';

/**
 * POST or PUT `/api` + `path`. Always sends `Content-Type: application/json`, with `{}` when
 * there is no `body` (E02 design "Cross-site requests"). Without a `schema` the action answers
 * 204 and nothing is read; with one, the body is validated. Errors as in `apiGet`.
 */
export async function apiSend(method: SendMethod, path: string): Promise<void>;
export async function apiSend<T>(
  method: SendMethod,
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<T>;
export async function apiSend<T>(
  method: SendMethod,
  path: string,
  schema?: z.ZodType<T>,
  body: unknown = {},
): Promise<T | undefined> {
  const res = await request(path, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await throwIfFailed(res);
  if (!schema) {
    return undefined;
  }
  return parseBody(res, schema);
}

/**
 * POST `/api/` + `path` as `multipart/form-data` (S03.1 photo upload). The browser sets the
 * `Content-Type` with its boundary from the `FormData`, so it is never set here. The response
 * is validated with the shared `schema`; errors as in `apiGet` (status 0 for a network error).
 */
export async function apiSendForm<T>(
  path: string,
  form: FormData,
  schema: z.ZodType<T>,
): Promise<T> {
  const res = await request(path, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });
  await throwIfFailed(res);
  return parseBody(res, schema);
}
