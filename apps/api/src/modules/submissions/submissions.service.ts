import type {
  CurrentUser,
  FieldError,
  MySubmissions,
  SafetyPageContent,
  Submission,
} from '@labsafe/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';
import { AppException } from '../../common/app.exception';
import { InstrumentRevision } from '../instruments/instrument-revision.entity';
import { Instrument } from '../instruments/instrument.entity';
import { RevisionHazard } from '../instruments/revision-hazard.entity';
import { RevisionProtectiveEquipment } from '../instruments/revision-protective-equipment.entity';
import { LabRoom } from '../meta/lab-room.entity';
import { PhotosService } from '../photos/photos.service';
import {
  type SubmissionFields,
  toSubmissionResponse,
  toSubmissionSummaryResponse,
} from './submission.response';

/** The same messages as the shared schema's for these fields (S03.1 API contract). */
const LAB_ROOM_MESSAGE = 'Choose a lab room';
const PHOTO_MESSAGE = 'Upload a photo';

/**
 * Submitted safety pages (tables `instruments`, `instrument_revisions`, `revision_hazards`,
 * `revision_protective_equipment`; E03 design "Data" and "Flows").
 */
@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(
    @InjectRepository(InstrumentRevision)
    private readonly revisions: Repository<InstrumentRevision>,
    private readonly photosService: PhotosService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Stores a parsed page of `user` as a new instrument with one `NEW`, `PENDING` revision and its
   * hazard and PPE rows, all in one transaction (S03.1 AC8). An unknown lab room or a photo that
   * is not the caller's own upload is 400 `VALIDATION_FAILED` naming both at once (AC13), and
   * nothing is written. Every column comes from the parsed body or from here, never from other
   * request keys.
   */
  async submitNew(user: CurrentUser, content: SafetyPageContent): Promise<Submission> {
    return this.dataSource.transaction(async (manager) => {
      await this.checkReferences(manager, user.id, content);

      const instruments = manager.getRepository(Instrument);
      const instrument = await instruments.save(instruments.create({ createdBy: user.id }));

      const revisions = manager.getRepository(InstrumentRevision);
      const revision = await revisions.save(
        revisions.create({
          instrumentId: instrument.id,
          kind: 'NEW',
          status: 'PENDING',
          submittedBy: user.id,
          submittedAt: new Date(),
          ...contentColumns(content),
        }),
      );
      const { hazards, protectiveEquipment } = await this.insertChildRows(
        manager,
        revision.id,
        content,
      );

      this.logger.log(`Revision ${revision.id} of new instrument ${instrument.id} submitted.`);
      return toSubmissionResponse({ ...revision, hazards, protectiveEquipment }, user);
    });
  }

  /**
   * The caller's own submissions, newest first, in one query of four columns: never the
   * content, the child rows or the photo bytes (S03.1 AC16).
   */
  async listMine(userId: string): Promise<MySubmissions> {
    const revisions = await this.revisions.find({
      select: { id: true, name: true, status: true, submittedAt: true },
      where: { submittedBy: userId },
      order: { submittedAt: 'DESC', id: 'DESC' },
    });
    return { submissions: revisions.map(toSubmissionSummaryResponse) };
  }

  /**
   * One submission for `user` (S03.2 AC4, decision E03-D4): its author and approved admins get
   * it; anonymous callers, pending and rejected accounts, other contributors and an id that does
   * not exist all get the same 404 `NOT_FOUND`. E04 extends this to the admin's review.
   */
  async read(id: string, user: CurrentUser | null): Promise<Submission> {
    if (user === null || user.status !== 'APPROVED') {
      throw notFound();
    }
    const submission = await this.loadSubmission(
      this.dataSource.manager,
      id,
      user.role === 'ADMIN' ? null : user.id,
    );
    if (submission === null) {
      throw notFound();
    }
    return submission;
  }

  /**
   * Replaces the content of `user`'s own pending submission `id` with a parsed page (S03.2 AC2,
   * decision E03-D5). One transaction locks the revision row (`FOR UPDATE`, only if it is the
   * caller's and still `PENDING`; otherwise 404 `NOT_FOUND`, for an admin too), runs S03.1's room
   * and photo checks, updates the content and `updated_at`, and replaces the hazard and PPE rows.
   * `kind`, `status`, `submitted_by` and `submitted_at` stay.
   */
  async update(
    id: string,
    user: CurrentUser | null,
    content: SafetyPageContent,
  ): Promise<Submission> {
    if (user === null || user.status !== 'APPROVED') {
      throw notFound();
    }
    return this.dataSource.transaction(async (manager) => {
      const revisions = manager.getRepository(InstrumentRevision);
      const locked = await revisions.findOne({
        select: { id: true },
        where: { id, submittedBy: user.id, status: 'PENDING' },
        lock: { mode: 'pessimistic_write' },
      });
      if (locked === null) {
        throw notFound();
      }
      await this.checkReferences(manager, user.id, content);

      await revisions.update({ id }, { ...contentColumns(content), updatedAt: new Date() });
      await manager.getRepository(RevisionHazard).delete({ revisionId: id });
      await manager.getRepository(RevisionProtectiveEquipment).delete({ revisionId: id });
      await this.insertChildRows(manager, id, content);

      const submission = await this.loadSubmission(manager, id, user.id);
      if (submission === null) {
        throw notFound();
      }
      this.logger.log(`Pending revision ${id} edited.`);
      return submission;
    });
  }

  /**
   * Revision `id` with its hazard and PPE rows and its submitter's id and name, in one query, or
   * null. With `submittedBy`, only that account's revision matches.
   */
  private async loadSubmission(
    manager: EntityManager,
    id: string,
    submittedBy: string | null,
  ): Promise<Submission | null> {
    const query = manager
      .getRepository(InstrumentRevision)
      .createQueryBuilder('revision')
      .leftJoinAndSelect('revision.hazards', 'hazard')
      .leftJoinAndSelect('revision.protectiveEquipment', 'ppe')
      .innerJoin('revision.submitter', 'submitter')
      .addSelect(['submitter.id', 'submitter.name'])
      .where('revision.id = :id', { id });
    if (submittedBy !== null) {
      query.andWhere('revision.submitted_by = :submittedBy', { submittedBy });
    }
    const revision = await query.getOne();
    return revision === null ? null : toSubmissionResponse(revision, revision.submitter);
  }

  /** Inserts the hazard and PPE rows of `content` for revision `revisionId` and returns them. */
  private async insertChildRows(
    manager: EntityManager,
    revisionId: string,
    content: SafetyPageContent,
  ): Promise<Pick<SubmissionFields, 'hazards' | 'protectiveEquipment'>> {
    const hazards = content.hazards.map((hazard) => ({
      revisionId,
      hazardType: hazard.type,
      note: hazard.note,
    }));
    if (hazards.length > 0) {
      await manager.getRepository(RevisionHazard).insert(hazards);
    }
    const protectiveEquipment = content.protectiveEquipment.map((entry) => ({
      revisionId,
      equipmentItem: entry.item,
      note: entry.note,
    }));
    if (protectiveEquipment.length > 0) {
      await manager.getRepository(RevisionProtectiveEquipment).insert(protectiveEquipment);
    }
    return { hazards, protectiveEquipment };
  }

  /** 400 with a `fields` entry for each of `labRoomId` and `photoId` that fails. */
  private async checkReferences(
    manager: EntityManager,
    userId: string,
    content: SafetyPageContent,
  ): Promise<void> {
    // One after the other: both run on the transaction's single connection.
    const roomExists = await manager.getRepository(LabRoom).existsBy({ id: content.labRoomId });
    const ownPhoto = await this.photosService.isOwnedBy(content.photoId, userId, manager);
    const fields: FieldError[] = [];
    if (!roomExists) fields.push({ path: 'labRoomId', message: LAB_ROOM_MESSAGE });
    if (!ownPhoto) fields.push({ path: 'photoId', message: PHOTO_MESSAGE });
    if (fields.length > 0) {
      throw new AppException(
        400,
        'VALIDATION_FAILED',
        'Some fields are missing or invalid.',
        fields,
      );
    }
  }
}

/**
 * The content columns of a revision from a parsed page. Every column comes from the parsed body,
 * never from other request keys.
 */
function contentColumns(content: SafetyPageContent) {
  return {
    name: content.name,
    manufacturer: content.manufacturer,
    model: content.model,
    description: content.description,
    category: content.category,
    labRoomId: content.labRoomId,
    responsibleName: content.responsibleName,
    responsibleContact: content.responsibleContact,
    hazardLevel: content.hazardLevel,
    trainingRequired: content.trainingRequired,
    trainingGivenBy: content.trainingGivenBy,
    noSignificantHazards: content.noSignificantHazards,
    standardLabAttireOnly: content.standardLabAttireOnly,
    hazardPictograms: content.pictograms,
    beforeUse: content.beforeUse,
    safeOperation: content.safeOperation,
    doNot: content.doNot,
    emergency: content.emergency,
    emergencyPhone: content.emergencyPhone,
    emergencyEquipment: content.emergencyEquipment,
    photoId: content.photoId,
  } satisfies Partial<InstrumentRevision>;
}

/** The one answer to a missing submission and to one the caller may not see (E03-D4). */
function notFound(): AppException {
  return new AppException(404, 'NOT_FOUND', 'Not found.');
}
