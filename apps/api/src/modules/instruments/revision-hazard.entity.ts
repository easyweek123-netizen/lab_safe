import { HAZARD_TYPES, type HazardType } from '@labsafe/shared';
import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { sqlList, valuesOf } from '../../db/sql-list';
import { InstrumentRevision } from './instrument-revision.entity';

/**
 * One hazard on one revision (table `revision_hazards`, design doc §3). Mirrors the
 * `CreateSafetyPageTables` migration exactly. The composite key and the missing id and timestamps
 * are the exception recorded in E03 design "Data": the rows are replaced with their revision.
 */
@Entity({ name: 'revision_hazards' })
@Check('revision_hazards_hazard_type_check', `hazard_type IN (${sqlList(valuesOf(HAZARD_TYPES))})`)
@Check('revision_hazards_note_check', `btrim(note) <> ''`)
export class RevisionHazard {
  @PrimaryColumn({
    type: 'uuid',
    name: 'revision_id',
    primaryKeyConstraintName: 'revision_hazards_pkey',
  })
  revisionId!: string;

  @PrimaryColumn({
    type: 'text',
    name: 'hazard_type',
    primaryKeyConstraintName: 'revision_hazards_pkey',
  })
  hazardType!: HazardType;

  /** How this hazard arises; required. */
  @Column({ type: 'text' })
  note!: string;

  @ManyToOne(() => InstrumentRevision, (revision) => revision.hazards, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({
    name: 'revision_id',
    foreignKeyConstraintName: 'revision_hazards_revision_id_fkey',
  })
  revision!: Relation<InstrumentRevision>;
}
