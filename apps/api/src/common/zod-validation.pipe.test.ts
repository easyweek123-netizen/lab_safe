import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppException } from './app.exception';
import { ZodValidationPipe } from './zod-validation.pipe';

const pipe = new ZodValidationPipe(z.object({ name: z.string().min(1), count: z.number() }));

function appExceptionOf(value: unknown, target: ZodValidationPipe<z.ZodType> = pipe): AppException {
  try {
    target.transform(value);
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    return error as AppException;
  }
  throw new Error('transform did not throw');
}

describe('ZodValidationPipe', () => {
  it('TC-8.1 throws 400 VALIDATION_FAILED naming every invalid path', () => {
    const error = appExceptionOf({ name: '', count: 'x' });

    expect(error.status).toBe(400);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.message).toBe('Some fields are missing or invalid.');
    expect(error.fields?.map((field) => field.path).sort()).toEqual(['count', 'name']);
    for (const field of error.fields ?? []) {
      expect(field.message).not.toBe('');
    }
  });

  it('TC-8.1 joins nested paths with dots and reports a missing body', () => {
    const nested = new ZodValidationPipe(z.object({ room: z.object({ code: z.string() }) }));

    expect(
      appExceptionOf({ room: { code: 1 } }, nested).fields?.map((field) => field.path),
    ).toEqual(['room.code']);
    expect(appExceptionOf(undefined).fields).toHaveLength(1);
  });

  it('TC-8.2 returns the parsed value without unknown keys', () => {
    expect(pipe.transform({ name: 'a', count: 1, extra: true })).toEqual({ name: 'a', count: 1 });
  });
});
