import { PROTECTIVE_EQUIPMENT, type ProtectiveEquipmentItem } from '@labsafe/shared';
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
 * One protective-equipment item on one revision (table `revision_protective_equipment`, design
 * doc §3). Mirrors the `CreateSafetyPageTables` migration exactly. Composite key, no id or
 * timestamps: the exception recorded in E03 design "Data".
 */
@Entity({ name: 'revision_protective_equipment' })
@Check(
  'revision_protective_equipment_equipment_item_check',
  `equipment_item IN (${sqlList(valuesOf(PROTECTIVE_EQUIPMENT))})`,
)
@Check('revision_protective_equipment_note_check', `note IS NULL OR btrim(note) <> ''`)
export class RevisionProtectiveEquipment {
  @PrimaryColumn({
    type: 'uuid',
    name: 'revision_id',
    primaryKeyConstraintName: 'revision_protective_equipment_pkey',
  })
  revisionId!: string;

  @PrimaryColumn({
    type: 'text',
    name: 'equipment_item',
    primaryKeyConstraintName: 'revision_protective_equipment_pkey',
  })
  equipmentItem!: ProtectiveEquipmentItem;

  /** Optional; null when the contributor left it empty. */
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @ManyToOne(() => InstrumentRevision, (revision) => revision.protectiveEquipment, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({
    name: 'revision_id',
    foreignKeyConstraintName: 'revision_protective_equipment_revision_id_fkey',
  })
  revision!: Relation<InstrumentRevision>;
}
