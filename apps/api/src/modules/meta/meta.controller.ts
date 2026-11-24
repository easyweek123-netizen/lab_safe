import type { MetaListsResponse } from '@labsafe/shared';
import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/access';
import { MetaService } from './meta.service';

/**
 * Public route (E01 design §9): anyone may call it, also without an account. Marked `@Public()`
 * for the deny-by-default `AccessGuard` (E02-D2).
 */
@Controller('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  /** `GET /api/meta/lists` (the `api` prefix comes from `configureApp`). Takes no input. */
  @Public()
  @Get('lists')
  getLists(): Promise<MetaListsResponse> {
    return this.metaService.getLists();
  }
}
