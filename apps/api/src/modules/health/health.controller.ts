import type { HealthResponse } from '@labsafe/shared';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/access';
import { HealthService } from './health.service';

/**
 * Public route (E01 design §9): anyone may call it, also without an account. Marked `@Public()`
 * for the deny-by-default `AccessGuard` (E02-D2).
 */
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** `GET /api/health` (the `api` prefix comes from `configureApp`). Takes no input. */
  @Public()
  @Get('health')
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
