import { z } from 'zod';

// The shared error format (design doc §8). Later epics add their codes here.
// REQUEST_REJECTED: any other 4xx that has no specific code yet (for example 405, or 413 from
// the JSON body parser).
export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'REQUEST_REJECTED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
  // E02 accounts and access (S02.1).
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'INVALID_CREDENTIALS',
  'EMAIL_TAKEN',
  // S02.2: approve or reject an account that is no longer pending.
  'USER_NOT_PENDING',
  // S02.3: change the role of an account that is not approved; demote the last admin.
  'USER_NOT_APPROVED',
  'LAST_ADMIN',
  // S03.1: photo upload larger than 5 MB; content not a JPEG or PNG.
  'PHOTO_TOO_LARGE',
  'PHOTO_TYPE',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const FieldError = z.object({
  path: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldError>;

export const ErrorResponse = z.object({
  statusCode: z.int(),
  code: ErrorCode,
  message: z.string(),
  fields: z.array(FieldError).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
