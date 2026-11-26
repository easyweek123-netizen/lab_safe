import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstrumentRevision } from '../instruments/instrument-revision.entity';
import { Instrument } from '../instruments/instrument.entity';
import { AdminReviewController } from './admin-review.controller';
import { ReviewService } from './review.service';

/** The admin's review of submitted pages: the queue and the preview (S04.1), approving (S04.2). */
@Module({
  imports: [TypeOrmModule.forFeature([InstrumentRevision, Instrument])],
  controllers: [AdminReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
