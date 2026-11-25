import {
  CATEGORIES,
  type Category,
  EMERGENCY_EQUIPMENT,
  type EmergencyEquipment,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  type HazardLevel,
  type HazardPictogram,
  REVISION_KINDS,
  REVISION_STATUSES,
  type RevisionKind,
  type RevisionStatus,
} from '@labsafe/shared';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { sqlList, valuesOf } from '../../db/sql-list';
import { LabRoom } from '../meta/lab-room.entity';
import { Photo } from '../photos/photo.entity';
import { User } from '../users/user.entity';
import { Instrument } from './instrument.entity';
import { RevisionHazard } from './revision-hazard.entity';
import { RevisionProtectiveEquipment } from './revision-protective-equipment.entity';

/** `CHECK (btrim(x) <> '')` on a required text column (E03 design "Data", I4). */
const nonEmpty = (column: string) => `btrim(${column}) <> ''`;
/** An optional text column is null or non-empty. */
const nullOrNonEmpty = (column: string) => `${column} IS NULL OR btrim(${column}) <> ''`;

/**
 * One version of a safety page (table `instrument_revisions`, design doc §3 and E03 design
 * "Data"). Mirrors the `CreateSafetyPageTables` migration exactly, including the constraint names,
 * so a generated migration finds no change. The fixed-list CHECKs are built from the shared
 * constants (I5). E03 holds only what it writes (E03-D6): the review columns come with E04.
 */
@Entity({ name: 'instrument_revisions' })
@Index('instrument_revisions_instrument_id_idx', ['instrumentId'])
@Index('instrument_revisions_submitted_by_idx', ['submittedBy'])
@Check('instrument_revisions_kind_check', `kind IN (${sqlList(REVISION_KINDS)})`)
@Check('instrument_revisions_status_check', `status IN (${sqlList(REVISION_STATUSES)})`)
@Check('instrument_revisions_category_check', `category IN (${sqlList(valuesOf(CATEGORIES))})`)
@Check(
  'instrument_revisions_hazard_level_check',
  `hazard_level IN (${sqlList(valuesOf(HAZARD_LEVELS))})`,
)
@Check(
  'instrument_revisions_hazard_pictograms_check',
  `hazard_pictograms <@ ARRAY[${sqlList(valuesOf(HAZARD_PICTOGRAMS))}]::text[]`,
)
@Check(
  'instrument_revisions_emergency_equipment_check',
  `jsonb_typeof(emergency_equipment) = 'object' AND emergency_equipment ?& ARRAY[${sqlList(valuesOf(EMERGENCY_EQUIPMENT))}]`,
)
@Check(
  'instrument_revisions_training_given_by_check',
  `(training_required AND training_given_by IS NOT NULL AND btrim(training_given_by) <> '') OR (NOT training_required AND training_given_by IS NULL)`,
)
@Check(
  'instrument_revisions_training_hazard_level_check',
  `NOT (training_required AND hazard_level = 'LOW')`,
)
@Check('instrument_revisions_name_check', nonEmpty('name'))
@Check('instrument_revisions_manufacturer_check', nullOrNonEmpty('manufacturer'))
@Check('instrument_revisions_model_check', nullOrNonEmpty('model'))
@Check('instrument_revisions_description_check', nonEmpty('description'))
@Check('instrument_revisions_responsible_name_check', nonEmpty('responsible_name'))
@Check('instrument_revisions_responsible_contact_check', nonEmpty('responsible_contact'))
@Check('instrument_revisions_before_use_check', nonEmpty('before_use'))
@Check('instrument_revisions_safe_operation_check', nonEmpty('safe_operation'))
@Check('instrument_revisions_do_not_check', nonEmpty('do_not'))
@Check('instrument_revisions_emergency_check', nonEmpty('emergency'))
@Check('instrument_revisions_emergency_phone_check', nonEmpty('emergency_phone'))
export class InstrumentRevision {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'instrument_revisions_pkey' })
  id!: string;

  // Workflow

  @Column({ type: 'uuid', name: 'instrument_id' })
  instrumentId!: string;

  @ManyToOne(() => Instrument, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'instrument_id',
    foreignKeyConstraintName: 'instrument_revisions_instrument_id_fkey',
  })
  instrument!: Relation<Instrument>;

  @Column({ type: 'text' })
  kind!: RevisionKind;

  @Column({ type: 'text' })
  status!: RevisionStatus;

  @Column({ type: 'uuid', name: 'submitted_by' })
  submittedBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'submitted_by',
    foreignKeyConstraintName: 'instrument_revisions_submitted_by_fkey',
  })
  submitter!: Relation<User>;

  /** The first submission; an edit keeps it. */
  @Column({ type: 'timestamptz', name: 'submitted_at' })
  submittedAt!: Date;

  // Content (PRD §4.1)

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  manufacturer!: string | null;

  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text' })
  category!: Category;

  @Column({ type: 'uuid', name: 'lab_room_id' })
  labRoomId!: string;

  @ManyToOne(() => LabRoom, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({
    name: 'lab_room_id',
    foreignKeyConstraintName: 'instrument_revisions_lab_room_id_fkey',
  })
  labRoom!: Relation<LabRoom>;

  @Column({ type: 'text', name: 'responsible_name' })
  responsibleName!: string;

  @Column({ type: 'text', name: 'responsible_contact' })
  responsibleContact!: string;

  @Column({ type: 'text', name: 'hazard_level' })
  hazardLevel!: HazardLevel;

  @Column({ type: 'boolean', name: 'training_required' })
  trainingRequired!: boolean;

  /** Null exactly when no training is required. */
  @Column({ type: 'text', name: 'training_given_by', nullable: true })
  trainingGivenBy!: string | null;

  @Column({ type: 'boolean', name: 'no_significant_hazards' })
  noSignificantHazards!: boolean;

  @Column({ type: 'boolean', name: 'standard_lab_attire_only' })
  standardLabAttireOnly!: boolean;

  @Column({ type: 'text', name: 'hazard_pictograms', array: true })
  hazardPictograms!: HazardPictogram[];

  @Column({ type: 'text', name: 'before_use' })
  beforeUse!: string;

  @Column({ type: 'text', name: 'safe_operation' })
  safeOperation!: string;

  @Column({ type: 'text', name: 'do_not' })
  doNot!: string;

  @Column({ type: 'text' })
  emergency!: string;

  @Column({ type: 'text', name: 'emergency_phone' })
  emergencyPhone!: string;

  /** All six `EMERGENCY_EQUIPMENT` keys, each a location or "not applicable". */
  @Column({ type: 'jsonb', name: 'emergency_equipment' })
  emergencyEquipment!: EmergencyEquipment;

  @Column({ type: 'uuid', name: 'photo_id' })
  photoId!: string;

  @ManyToOne(() => Photo, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'photo_id', foreignKeyConstraintName: 'instrument_revisions_photo_id_fkey' })
  photo!: Relation<Photo>;

  @OneToMany(() => RevisionHazard, (hazard) => hazard.revision)
  hazards!: Relation<RevisionHazard[]>;

  @OneToMany(() => RevisionProtectiveEquipment, (item) => item.revision)
  protectiveEquipment!: Relation<RevisionProtectiveEquipment[]>;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
