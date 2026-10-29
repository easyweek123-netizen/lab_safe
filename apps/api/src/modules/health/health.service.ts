import type { HealthResponse } from '@labsafe/shared';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '../../common/app.exception';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  /** Answers ok only when the database answers `SELECT 1`; otherwise 503 (AC5). */
  async check(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new AppException(503, 'SERVICE_UNAVAILABLE', 'The database is unreachable.');
    }
    return { status: 'ok', database: 'ok' };
  }
}
