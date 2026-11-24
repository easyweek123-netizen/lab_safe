import { z } from 'zod';

// Accounts (S02.1 API contract, E02 design "Data"). The database CHECKs on `users.role` and
// `users.status` are built from these constants (design doc I5).

export const ROLES = ['CONTRIBUTOR', 'ADMIN'] as const;
export const Role = z.enum(ROLES);
export type Role = z.infer<typeof Role>;

export const ACCOUNT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const AccountStatus = z.enum(ACCOUNT_STATUSES);
export type AccountStatus = z.infer<typeof AccountStatus>;

const EMAIL_MESSAGE = 'Enter a valid email address';

/**
 * Trimmed and lower-cased before it is checked, so `Sara@Lab.TEST` and `sara@lab.test` are the
 * same account (E02-D1). Too long or not an address: one issue with one message.
 */
export const Email = z
  .string({ error: EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .max(254, { error: EMAIL_MESSAGE, abort: true })
  .pipe(z.email({ error: EMAIL_MESSAGE }));
export type Email = z.infer<typeof Email>;

const NAME_REQUIRED = 'Enter your name';
const PASSWORD_TOO_SHORT = 'Password must be at least 8 characters';
const PASSWORD_TOO_LONG = 'Password must be at most 128 characters';

/** Has no role or status: extra keys are stripped, so nobody picks their own (AC4). */
export const SignUpRequest = z.object({
  name: z
    .string({ error: NAME_REQUIRED })
    .trim()
    .min(1, NAME_REQUIRED)
    .max(100, 'Name must be at most 100 characters'),
  email: Email,
  password: z
    .string({ error: PASSWORD_TOO_SHORT })
    .min(8, PASSWORD_TOO_SHORT)
    .max(128, PASSWORD_TOO_LONG),
});
export type SignUpRequest = z.infer<typeof SignUpRequest>;

const PASSWORD_REQUIRED = 'Enter your password';

export const LoginRequest = z.object({
  email: Email,
  password: z
    .string({ error: PASSWORD_REQUIRED })
    .min(1, PASSWORD_REQUIRED)
    .max(128, PASSWORD_TOO_LONG),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

/** The signed-in account as the API returns it. Never has a password or hash field. */
export const CurrentUser = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  role: Role,
  status: AccountStatus,
});
export type CurrentUser = z.infer<typeof CurrentUser>;

/** `GET /api/auth/me`: `user` is null for an anonymous caller (E02-D3). */
export const SessionResponse = z.object({
  user: CurrentUser.nullable(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;
