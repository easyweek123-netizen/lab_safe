import { ErrorResponse } from '@labsafe/shared';
import {
  type ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppException } from './app.exception';
import { ErrorFilter } from './error.filter';

interface Recorded {
  status?: number;
  body?: unknown;
}

/** A fake `ArgumentsHost` whose response records `status()` and `json()`. */
function fakeHost(recorded: Recorded): ArgumentsHost {
  const response = {
    status(code: number) {
      recorded.status = code;
      return response;
    },
    json(body: unknown) {
      recorded.body = body;
      return response;
    },
  };
  return { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
}

function catchWith(exception: unknown): { status?: number; body: ErrorResponse } {
  const recorded: Recorded = {};
  new ErrorFilter().catch(exception, fakeHost(recorded));
  return { status: recorded.status, body: ErrorResponse.parse(recorded.body) };
}

describe('ErrorFilter', () => {
  let loggerError: ReturnType<typeof vi.spyOn>;
  let loggerWarn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loggerError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    loggerWarn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TC-6.2 answers an unexpected error with a generic 500 and no internal detail', () => {
    const error = new Error('secret db detail');

    const { status, body } = catchWith(error);

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
    const text = JSON.stringify(body);
    expect(text).not.toContain('secret db detail');
    expect(text).not.toMatch(/\bat\s.+:\d+:\d+/);
    expect(loggerError).toHaveBeenCalledWith('secret db detail', error.stack);
  });

  it('TC-6.2 answers a thrown non-Error value with a generic 500', () => {
    const { status, body } = catchWith('secret string');

    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong.',
    });
    expect(JSON.stringify(body)).not.toContain('secret string');
  });

  it('TC-6.3 passes an AppException through unchanged', () => {
    const { status, body } = catchWith(
      new AppException(503, 'SERVICE_UNAVAILABLE', 'The database is unreachable.'),
    );

    expect(status).toBe(503);
    expect(body).toEqual({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The database is unreachable.',
    });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('TC-6.3 keeps the fields of an AppException', () => {
    const fields = [{ path: 'name', message: 'Required' }];

    const { status, body } = catchWith(
      new AppException(400, 'VALIDATION_FAILED', 'Some fields are missing or invalid.', fields),
    );

    expect(status).toBe(400);
    expect(body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields are missing or invalid.',
      fields,
    });
  });

  it('TC-6.3 maps a Nest NotFoundException to 404 NOT_FOUND', () => {
    const { status, body } = catchWith(new NotFoundException('Cannot GET /api/does-not-exist'));

    expect(status).toBe(404);
    expect(body).toEqual({ statusCode: 404, code: 'NOT_FOUND', message: 'Not found.' });
  });

  it('TC-6.3 maps a Nest BadRequestException to 400 VALIDATION_FAILED', () => {
    const { status, body } = catchWith(new BadRequestException('Unexpected token } in JSON'));

    expect(status).toBe(400);
    expect(body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'The request is not valid.',
    });
  });

  describe('client errors without a specific code (review finding F2)', () => {
    const rejected = {
      code: 'REQUEST_REJECTED',
      message: 'The request was rejected.',
    } as const;

    it('F2 answers a Nest ForbiddenException (a guard returning false) with 403, not 500', () => {
      const { status, body } = catchWith(new ForbiddenException('Forbidden resource'));

      expect(status).toBe(403);
      expect(body).toEqual({ statusCode: 403, ...rejected });
      expect(loggerError).not.toHaveBeenCalled();
      expect(loggerWarn).toHaveBeenCalledWith('403 Forbidden resource');
    });

    it('F2 answers any other 4xx HttpException (for example 405) with its own status', () => {
      const { status, body } = catchWith(new HttpException('Method Not Allowed', 405));

      expect(status).toBe(405);
      expect(body).toEqual({ statusCode: 405, ...rejected });
      expect(loggerError).not.toHaveBeenCalled();
      expect(loggerWarn).toHaveBeenCalledTimes(1);
    });

    it("F2 answers body-parser's PayloadTooLargeError (not an HttpException) with 413", () => {
      const error = Object.assign(new Error('request entity too large'), {
        status: 413,
        statusCode: 413,
        expose: true,
        type: 'entity.too.large',
      });

      const { status, body } = catchWith(error);

      expect(status).toBe(413);
      expect(body).toEqual({ statusCode: 413, ...rejected });
      expect(JSON.stringify(body)).not.toContain('entity');
      expect(loggerError).not.toHaveBeenCalled();
      expect(loggerWarn).toHaveBeenCalledWith('413 request entity too large');
    });

    it('F2 reads statusCode when an error has no status', () => {
      const error = Object.assign(new Error('unsupported'), { statusCode: 415 });

      const { status, body } = catchWith(error);

      expect(status).toBe(415);
      expect(body).toEqual({ statusCode: 415, ...rejected });
    });

    it('F2 maps a non-Nest error with status 400 or 404 like the Nest exceptions', () => {
      const badJson = Object.assign(new Error('Unexpected token'), { status: 400 });
      const missing = Object.assign(new Error('gone'), { statusCode: 404 });

      expect(catchWith(badJson).body).toEqual({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'The request is not valid.',
      });
      expect(catchWith(missing).body).toEqual({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Not found.',
      });
    });

    it('F2 still answers a 5xx HttpException or a non-4xx status with a generic 500', () => {
      for (const exception of [
        new ServiceUnavailableException('db down'),
        Object.assign(new Error('odd status'), { status: 302 }),
        Object.assign(new Error('not a number'), { status: '403' }),
      ]) {
        const { status, body } = catchWith(exception);

        expect(status).toBe(500);
        expect(body).toEqual({
          statusCode: 500,
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong.',
        });
      }
      expect(loggerError).toHaveBeenCalledTimes(3);
      expect(loggerWarn).not.toHaveBeenCalled();
    });
  });
});
