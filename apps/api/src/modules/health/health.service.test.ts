import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { HealthService } from './health.service';

function serviceWith(query: ReturnType<typeof vi.fn>): HealthService {
  return new HealthService({ query } as unknown as DataSource);
}

describe('HealthService', () => {
  it('TC-5.1 throws 503 SERVICE_UNAVAILABLE when the database query fails', async () => {
    const service = serviceWith(vi.fn().mockRejectedValue(new Error('connection refused')));

    const error: unknown = await service.check().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'The database is unreachable.',
    });
  });

  it('TC-5.1 does not pass the database error message on', async () => {
    const service = serviceWith(vi.fn().mockRejectedValue(new Error('secret db detail')));

    const error: unknown = await service.check().catch((caught: unknown) => caught);

    expect(String((error as Error).message)).not.toContain('secret db detail');
  });

  it('AC4 returns ok when the database answers SELECT 1', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

    await expect(serviceWith(query).check()).resolves.toEqual({ status: 'ok', database: 'ok' });
    expect(query).toHaveBeenCalledWith('SELECT 1');
  });
});
