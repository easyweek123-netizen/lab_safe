import type { ReviewDecision, ReviewQueue, ReviewSubmission } from '@labsafe/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { InstrumentRevision } from '../instruments/instrument-revision.entity';
import { Instrument } from '../instruments/instrument.entity';
import { nextFreeSlug, slugify } from '../instruments/slug';
import {
  toApprovalDecisionResponse,
  toRejectionDecisionResponse,
  toReviewQueueItemResponse,
  toReviewSubmissionResponse,
} from './review.response';

/**
 * The one key of the transaction advisory lock under which a slug is chosen, so two approvals
 * never pick the same free address (E04-D3). Any fixed bigint; this one spells "LabSafe1".
 */
const SLUG_LOCK_KEY = '5503788329879364913';

/** The admin's review of submitted pages (E04 design "Flows", S04.1–S04.3). */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(InstrumentRevision)
    private readonly revisions: Repository<InstrumentRevision>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Every `PENDING` revision, oldest `submitted_at` first, then by id, in one query that selects
   * only the id, name, kind, date and the submitter's id and name: never the content, the photo
   * or an email (S04.1 AC1). The `(status, submitted_at)` index comes with S04.2's migration.
   */
  async queue(): Promise<ReviewQueue> {
    const revisions = await this.revisions
      .createQueryBuilder('revision')
      .select(['revision.id', 'revision.name', 'revision.kind', 'revision.submittedAt'])
      .innerJoin('revision.submitter', 'submitter')
      .addSelect(['submitter.id', 'submitter.name'])
      .where('revision.status = :status', { status: 'PENDING' })
      .orderBy('revision.submitted_at', 'ASC')
      .addOrderBy('revision.id', 'ASC')
      .getMany();
    return { items: revisions.map(toReviewQueueItemResponse) };
  }

  /**
   * Revision `id` of any status, with its hazard and PPE rows, its lab room and its submitter's
   * id and name, in one query (S04.1 AC4); an unknown id is 404 `NOT_FOUND` (AC7).
   */
  async read(id: string): Promise<ReviewSubmission> {
    const revision = await this.revisions
      .createQueryBuilder('revision')
      .leftJoinAndSelect('revision.hazards', 'hazard')
      .leftJoinAndSelect('revision.protectiveEquipment', 'ppe')
      .innerJoinAndSelect('revision.labRoom', 'labRoom')
      .innerJoin('revision.submitter', 'submitter')
      .addSelect(['submitter.id', 'submitter.name'])
      .where('revision.id = :id', { id })
      .getOne();
    if (revision === null) {
      throw new AppException(404, 'NOT_FOUND', 'Not found.');
    }
    return toReviewSubmissionResponse(revision);
  }

  /**
   * Approves revision `id` in the `version` the admin saw and publishes it, in one transaction
   * (S04.2 AC1, E04 design "Approving"): the revision is locked `FOR UPDATE` (unknown → 404); one
   * that is no longer `PENDING` is 409 `ALREADY_REVIEWED` (AC8); another version is 409
   * `SUBMISSION_CHANGED` (AC9, E04-D2). Then the instrument is locked; only if it has no slug yet,
   * one is chosen under `pg_advisory_xact_lock` (AC2, E04-D3). The revision gets `APPROVED`, the
   * reviewer and the date; the instrument its slug and `published_revision_id`. A refusal writes
   * nothing.
   */
  async approve(id: string, version: number, adminId: string): Promise<ReviewDecision> {
    return this.dataSource.transaction(async (manager) => {
      const revisions = manager.getRepository(InstrumentRevision);
      const revision = await revisions.findOne({
        select: { id: true, instrumentId: true, status: true, version: true, name: true },
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (revision === null) {
        throw new AppException(404, 'NOT_FOUND', 'Not found.');
      }
      if (revision.status !== 'PENDING') {
        throw new AppException(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.');
      }
      if (revision.version !== version) {
        throw new AppException(
          409,
          'SUBMISSION_CHANGED',
          'This page changed since you opened it. Review it again.',
        );
      }

      const instruments = manager.getRepository(Instrument);
      const instrument = await instruments.findOne({
        select: { id: true, slug: true },
        where: { id: revision.instrumentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (instrument === null) {
        throw new AppException(404, 'NOT_FOUND', 'Not found.');
      }
      const slug = instrument.slug ?? (await this.chooseSlug(manager, revision.name));

      await revisions.update(
        { id },
        { status: 'APPROVED', reviewedBy: adminId, reviewedAt: new Date() },
      );
      await instruments.update({ id: instrument.id }, { slug, publishedRevisionId: id });

      this.logger.log(
        `Revision ${id} of instrument ${instrument.id} approved by account ${adminId}.`,
      );
      return toApprovalDecisionResponse(id, slug);
    });
  }

  /**
   * Rejects revision `id` with `note` (already trimmed by `RejectSubmissionRequest`) in one
   * conditional `UPDATE … WHERE id AND status = 'PENDING' RETURNING id` (S04.3 AC1, pattern
   * `UsersService.decideSignUp`), so of two decisions at once only one wins. No row: an unknown
   * id is 404 `NOT_FOUND`, any other is no longer pending, 409 `ALREADY_REVIEWED` (AC3). There
   * is no `version` check (design open question 2). Logs ids only, never the note.
   */
  async reject(id: string, note: string, adminId: string): Promise<ReviewDecision> {
    const result = await this.revisions
      .createQueryBuilder()
      .update(InstrumentRevision)
      .set({ status: 'REJECTED', reviewNote: note, reviewedBy: adminId, reviewedAt: new Date() })
      .where('id = :id AND status = :pending', { id, pending: 'PENDING' })
      .returning('id')
      .execute();
    const rows = result.raw as Array<{ id: string }>;
    if (rows.length === 0) {
      if (!(await this.revisions.existsBy({ id }))) {
        throw new AppException(404, 'NOT_FOUND', 'Not found.');
      }
      throw new AppException(409, 'ALREADY_REVIEWED', 'This page has already been reviewed.');
    }
    this.logger.log(`Revision ${id} rejected by account ${adminId}.`);
    return toRejectionDecisionResponse(id);
  }

  /**
   * A free address for a page named `name`: `slugify(name)` or the first free `-2`, `-3` …
   * Takes the transaction advisory lock first, so a concurrent approval waits until this one
   * commits and then sees its slug. Reads every taken slug with this base in one query.
   */
  private async chooseSlug(manager: EntityManager, name: string): Promise<string> {
    await manager.query('SELECT pg_advisory_xact_lock($1::bigint)', [SLUG_LOCK_KEY]);
    const base = slugify(name);
    // A slug holds only a-z, 0-9 and "-", so `base` has no LIKE wildcard in it.
    const rows = await manager
      .getRepository(Instrument)
      .createQueryBuilder('instrument')
      .select('instrument.slug', 'slug')
      .where('instrument.slug = :base OR instrument.slug LIKE :prefix', {
        base,
        prefix: `${base}-%`,
      })
      .getRawMany<{ slug: string }>();
    return nextFreeSlug(
      base,
      rows.map((row) => row.slug),
    );
  }
}
