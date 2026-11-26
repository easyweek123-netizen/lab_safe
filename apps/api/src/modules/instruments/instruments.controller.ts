import { InstrumentSlugParam, type PublishedSafetyPage } from '@labsafe/shared';
import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/access';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { PublishedInstrumentsQuery } from './published-instruments.query';

/** `GET /api/instruments/:slug` (S04.2 API contract): a published page for anyone. */
@Public()
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly publishedInstruments: PublishedInstrumentsQuery) {}

  /** → 200 `PublishedSafetyPage`; an unknown or unpublished slug is 404 `NOT_FOUND`. */
  @Get(':slug')
  read(
    @Param(new ZodValidationPipe(InstrumentSlugParam)) params: InstrumentSlugParam,
  ): Promise<PublishedSafetyPage> {
    return this.publishedInstruments.findBySlug(params.slug);
  }
}
