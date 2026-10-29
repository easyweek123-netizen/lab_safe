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
