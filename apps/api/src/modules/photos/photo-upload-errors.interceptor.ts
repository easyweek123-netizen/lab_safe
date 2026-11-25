import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { catchError, type Observable, throwError } from 'rxjs';
import { AppException } from '../../common/app.exception';

/**
 * Gives multer's errors the contract's codes (E03 design "Risks"). Listed before Nest's
 * `FileInterceptor`, so it sees what that interceptor throws while reading the upload:
 * - a file over `PHOTO_MAX_BYTES` (`PayloadTooLargeException`) → 413 `PHOTO_TOO_LARGE`;
 * - a file in another field or a second file (`BadRequestException`) → 400 `VALIDATION_FAILED`
 *   on `photo`, like a request without a file.
 * Every other error, including the `AppException`s of the handler, passes through unchanged.
 */
@Injectable()
export class PhotoUploadErrorsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(catchError((error: unknown) => throwError(() => toContractError(error))));
  }
}

function toContractError(error: unknown): unknown {
  if (error instanceof PayloadTooLargeException) {
    return new AppException(413, 'PHOTO_TOO_LARGE', 'The photo must be at most 5 MB.');
  }
  if (error instanceof BadRequestException) {
    return new AppException(400, 'VALIDATION_FAILED', 'Some fields are missing or invalid.', [
      { path: 'photo', message: 'Choose a photo' },
    ]);
  }
  return error;
}
