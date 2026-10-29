import type { MetaListsResponse } from '@labsafe/shared';
import { Controller, Get } from '@nestjs/common';
import { MetaService } from './meta.service';

/**
 * Public route (E01 design §9): anyone may call it, also without an account. When E02 adds the
 * deny-by-default guard, this handler needs `@Public()`.
 */
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  /** `GET /api/meta/lists` (the `api` prefix comes from `configureApp`). Takes no input. */
  @Get('lists')
  getLists(): Promise<MetaListsResponse> {
    return this.metaService.getLists();
  }
}
