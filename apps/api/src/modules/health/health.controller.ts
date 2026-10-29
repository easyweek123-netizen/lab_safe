import type { HealthResponse } from '@labsafe/shared';
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Public route (E01 design §9): anyone may call it, also without an account. When E02 adds the
 * deny-by-default guard, this handler needs `@Public()`.
 */
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** `GET /api/health` (the `api` prefix comes from `configureApp`). Takes no input. */
  @Get('health')
  check(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
