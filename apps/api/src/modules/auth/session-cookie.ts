import type { AccessRequest } from '../../common/access';
import { SESSION_TTL_MS } from './sessions.service';

/** Name of the session cookie (E02 design "Endpoints"). It holds only the random token. */
export const SESSION_COOKIE_NAME = 'labsafe_session';

/** The part of the Express response the cookie functions use. */
export interface CookieResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: CookieOptions): unknown;
}

interface CookieOptions {
  httpOnly: boolean;
  sameSite: 'lax';
  path: string;
  secure: boolean;
  maxAge?: number;
}

/** The attributes shared by setting and clearing, so the browser matches the same cookie. */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', path: '/', secure };
}

/** `labsafe_session=<token>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax[; Secure]`. */
export function setSessionCookie(response: CookieResponse, token: string, secure: boolean): void {
  response.cookie(SESSION_COOKIE_NAME, token, { ...baseOptions(secure), maxAge: SESSION_TTL_MS });
}

/** Clears the session cookie with the same attributes it was set with. */
export function clearSessionCookie(response: CookieResponse, secure: boolean): void {
  response.clearCookie(SESSION_COOKIE_NAME, baseOptions(secure));
}

/** The session token of the request, or undefined when there is no usable session cookie. */
export function sessionTokenOf(request: AccessRequest): string | undefined {
  const token = request.cookies?.[SESSION_COOKIE_NAME];
  return typeof token === 'string' && token !== '' ? token : undefined;
}

/** True if the request carries a session cookie at all, usable or not. */
export function hasSessionCookie(request: AccessRequest): boolean {
  return request.cookies?.[SESSION_COOKIE_NAME] !== undefined;
}
