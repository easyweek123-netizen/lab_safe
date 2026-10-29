import type { ErrorCode, FieldError } from '@labsafe/shared';

/**
 * Every expected error. Services throw this; `ErrorFilter` turns it into an `ErrorResponse`
 * (design doc §8).
 */
export class AppException extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldError[],
  ) {
    super(message);
    this.name = 'AppException';
  }
}
