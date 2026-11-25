import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * One instrument's identity (table `instruments`, design doc §3). Mirrors the
 * `CreateSafetyPageTables` migration exactly, including the constraint names. E03 stores only who
 * created it (decision E03-D6); E04 adds `slug` and `published_revision_id`, E05 `deleted_at`.
 */
@Entity({ name: 'instruments' })
export class Instrument {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'instruments_pkey' })
  id!: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'created_by', foreignKeyConstraintName: 'instruments_created_by_fkey' })
  creator!: User;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
