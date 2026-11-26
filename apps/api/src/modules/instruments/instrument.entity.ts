import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { InstrumentRevision } from './instrument-revision.entity';

/**
 * One instrument's identity (table `instruments`, design doc §3). Mirrors the
 * `CreateSafetyPageTables` and `AddReviewAndPublishing` migrations exactly, including the
 * constraint names. E03 stores only who created it (decision E03-D6); E04 adds the public address
 * `slug` and the pointer `published_revision_id` (E04 design "Data models"), E05 `deleted_at`.
 */
@Entity({ name: 'instruments' })
@Unique('instruments_slug_key', ['slug'])
@Check('instruments_slug_check', `slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`)
@Check(
  'instruments_published_check',
  `(slug IS NULL AND published_revision_id IS NULL) OR (slug IS NOT NULL AND published_revision_id IS NOT NULL)`,
)
export class Instrument {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'instruments_pkey' })
  id!: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'instruments_created_by_fkey' })
  creator!: User;

  /** The public address, set once at the first approval and never changed (E04-D3). */
  @Column({ type: 'text', nullable: true })
  slug!: string | null;

  /** The revision the public sees; set together with `slug`. */
  @Column({ type: 'uuid', name: 'published_revision_id', nullable: true })
  publishedRevisionId!: string | null;

  /**
   * The composite foreign key `(id, published_revision_id) → instrument_revisions (instrument_id,
   * id)`: the published revision always belongs to this instrument (design doc I2). The relation
   * is only there to declare the key; services read and write `publishedRevisionId`.
   */
  @ManyToOne(() => InstrumentRevision, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn([
    {
      name: 'id',
      referencedColumnName: 'instrumentId',
      foreignKeyConstraintName: 'instruments_published_revision_fkey',
    },
    { name: 'published_revision_id', referencedColumnName: 'id' },
  ])
  publishedRevision!: Relation<InstrumentRevision> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
