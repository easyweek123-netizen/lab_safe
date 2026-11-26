import type { PublishedSafetyPage } from '@labsafe/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { InstrumentRevision } from './instrument-revision.entity';
import { Instrument } from './instrument.entity';
import { toPublishedSafetyPageResponse } from './published-safety-page.response';

/**
 * The only public read of page content (design doc I1): what an instrument's
 * `published_revision_id` points to, and nothing else. Also answers whether a photo is public
 * (I11, E04-D7). E05 adds `deleted_at IS NULL` here.
 */
@Injectable()
export class PublishedInstrumentsQuery {
  constructor(
    @InjectRepository(InstrumentRevision)
    private readonly revisions: Repository<InstrumentRevision>,
  ) {}

  /**
   * The published page at `slug`, in one query: the instrument by its unique slug, joined
   * through `published_revision_id` with the hazard and PPE rows, the lab room and the
   * approver's name. Anything else, also a page that is only pending, is 404 `NOT_FOUND`.
   */
  async findBySlug(slug: string): Promise<PublishedSafetyPage> {
    const revision = await this.revisions
      .createQueryBuilder('revision')
      .innerJoin(
        Instrument,
        'instrument',
        'instrument.id = revision.instrument_id AND instrument.published_revision_id = revision.id',
      )
      .leftJoinAndSelect('revision.hazards', 'hazard')
      .leftJoinAndSelect('revision.protectiveEquipment', 'ppe')
      .innerJoinAndSelect('revision.labRoom', 'labRoom')
      .innerJoin('revision.reviewer', 'reviewer')
      .addSelect(['reviewer.id', 'reviewer.name'])
      .where('instrument.slug = :slug', { slug })
      .andWhere('revision.status = :status', { status: 'APPROVED' })
      .getOne();
    if (revision === null || revision.reviewedAt === null || revision.reviewer === null) {
      throw new AppException(404, 'NOT_FOUND', 'Not found.');
    }
    return toPublishedSafetyPageResponse(slug, {
      ...revision,
      reviewedAt: revision.reviewedAt,
      reviewer: revision.reviewer,
    });
  }

  /**
   * Whether `photoId` is the photo of a revision some instrument publishes (E04-D7). A replaced,
   * pending or never submitted photo is not. Uses the `photo_id` index, then the instrument's key.
   */
  async isPublishedPhoto(photoId: string): Promise<boolean> {
    return this.revisions
      .createQueryBuilder('revision')
      .innerJoin(
        Instrument,
        'instrument',
        'instrument.id = revision.instrument_id AND instrument.published_revision_id = revision.id',
      )
      .where('revision.photo_id = :photoId', { photoId })
      .andWhere('revision.status = :status', { status: 'APPROVED' })
      .getExists();
  }
}
