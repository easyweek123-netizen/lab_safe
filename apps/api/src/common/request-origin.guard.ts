import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { AccessRequest } from './access';
import { AppException } from './app.exception';

/** Methods that change data and so must come from our own pages. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Content types a cross-site HTML form cannot send without a CORS preflight, except multipart. */
const ALLOWED_CONTENT_TYPES = new Set(['application/json', 'multipart/form-data']);

/** The first value of a header, or undefined. */
function header(request: AccessRequest, name: string): string | undefined {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

/** `application/json; charset=utf-8` → `application/json`. */
function mediaType(contentType: string | undefined): string | undefined {
  return contentType?.split(';')[0]?.trim().toLowerCase() || undefined;
}

/** The `host[:port]` of an `Origin` header, or undefined if it is not a URL (for example `null`). */
function originHost(origin: string): string | undefined {
  try {
    return new URL(origin).host.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Refuses cross-site requests that change data (E02 design "Cross-site requests", design doc §5).
 * A POST, PUT, PATCH or DELETE passes only if its `Content-Type` is `application/json` or
 * `multipart/form-data` and, when an `Origin` header is present, its host equals the `Host`
 * header. Otherwise 403 `FORBIDDEN`. Other methods always pass. Global, and runs before
 * `AccessGuard`.
 */
@Injectable()
export class RequestOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AccessRequest>();
    if (!MUTATING_METHODS.has(request.method.toUpperCase())) return true;

    const type = mediaType(header(request, 'content-type'));
    if (type === undefined || !ALLOWED_CONTENT_TYPES.has(type)) {
      throw forbidden();
    }

    const origin = header(request, 'origin');
    if (origin !== undefined) {
      const host = header(request, 'host')?.toLowerCase();
      if (host === undefined || originHost(origin) !== host) {
        throw forbidden();
      }
    }
    return true;
  }
}

function forbidden(): AppException {
  return new AppException(403, 'FORBIDDEN', 'This request is not allowed.');
}
