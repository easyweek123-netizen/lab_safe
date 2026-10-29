import type { ErrorResponse } from '@labsafe/shared';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { AppException } from './app.exception';

/** The part of the Express response the filter uses. */
interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): unknown;
}

/**
 * The client-error status of an exception: an `HttpException`'s status, or the numeric
 * `status`/`statusCode` that Express middleware sets (for example body-parser's
 * `PayloadTooLargeError`, 413). `undefined` unless it is a 4xx.
 */
function clientErrorStatus(exception: unknown): number | undefined {
  let status: unknown;
  if (exception instanceof HttpException) {
    status = exception.getStatus();
  } else if (typeof exception === 'object' && exception !== null) {
    const candidate = exception as { status?: unknown; statusCode?: unknown };
    status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode;
  }
  return typeof status === 'number' && Number.isInteger(status) && status >= 400 && status < 500
    ? status
    : undefined;
}

/**
 * Turns every error into the shared `ErrorResponse` (E01 design §4, design doc §8).
 * A client error (4xx) keeps its status; one without a specific code yet becomes
 * `REQUEST_REJECTED` with a generic message and a server-side warning.
 * Unexpected errors become a generic 500; their details are only logged on the server.
 * Later epics add their codes (401, 403, 409, 413, 415, 429) here.
 */
@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toBody(exception);
    host.switchToHttp().getResponse<JsonResponse>().status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorResponse {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        ...(exception.fields ? { fields: exception.fields } : {}),
      };
    }
    const status = clientErrorStatus(exception);
    if (status === 404) {
      return { statusCode: 404, code: 'NOT_FOUND', message: 'Not found.' };
    }
    if (status === 400) {
      return { statusCode: 400, code: 'VALIDATION_FAILED', message: 'The request is not valid.' };
    }
    if (status !== undefined) {
      this.logger.warn(
        `${status} ${exception instanceof Error ? exception.message : String(exception)}`,
      );
      return { statusCode: status, code: 'REQUEST_REJECTED', message: 'The request was rejected.' };
    }
    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    );
    return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong.' };
  }
}
