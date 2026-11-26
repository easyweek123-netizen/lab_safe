import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentRevision } from './instrument-revision.entity';
import { Instrument } from './instrument.entity';
import { InstrumentsController } from './instruments.controller';
import { PublishedInstrumentsQuery } from './published-instruments.query';

/**
 * Public reading of published pages (S04.2, design doc I1). Exports `PublishedInstrumentsQuery`
 * for `PhotosService`, which serves a published page's photo to anyone (E04-D7). Imports no
 * feature module, so `PhotosModule` can import it without a cycle.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Instrument, InstrumentRevision])],
  controllers: [InstrumentsController],
  providers: [PublishedInstrumentsQuery],
  exports: [PublishedInstrumentsQuery],
})
export class InstrumentsModule {}
