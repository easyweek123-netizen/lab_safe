import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { AppException } from './app.exception';

/**
 * Parses a handler input with a shared Zod schema (E01 design §4). On failure it throws
 * 400 `VALIDATION_FAILED` with one field error per Zod issue; on success the handler gets
 * the parsed value (unknown keys of `z.object` are stripped).
 */
export class ZodValidationPipe<Schema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<Schema>
> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw new AppException(
      400,
      'VALIDATION_FAILED',
      'Some fields are missing or invalid.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
}
