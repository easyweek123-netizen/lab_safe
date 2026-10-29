import { ErrorResponse, type ErrorCode } from '@labsafe/shared';
import type { z } from 'zod';

/** A failed API call: an error status, a network error (status 0), or a body that breaks the contract. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: ErrorCode;

  constructor(message: string, status: number, code?: ErrorCode) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** `/api` + `path` as an absolute URL, so it also works under jsdom in the component tests. */
function apiUrl(path: string): URL {
  return new URL(`/api${path}`, window.location.origin);
}

/**
 * GET `/api` + `path` and validate the body with the shared `schema`. The only way the web app
 * reads from the API: a non-2xx status, a network error or a body that does not match the
 * contract all throw `ApiError`.
 */
export async function apiGet<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('Network error', 0);
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => undefined);
    const parsed = ErrorResponse.safeParse(body);
    throw parsed.success
      ? new ApiError(parsed.data.message, res.status, parsed.data.code)
      : new ApiError(`Request failed with status ${res.status}`, res.status);
  }

  const body: unknown = await res.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('The response does not match the contract', res.status);
  }
  return parsed.data;
}
