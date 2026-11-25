import {
  Check,
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
 * One uploaded photo (table `photos`, E03 design "Data"). Mirrors the `CreateSafetyPageTables`
 * migration exactly, including the constraint names. `bytes` is the re-encoded JPEG without
 * metadata (E03-D8); it is never loaded unless a query selects it explicitly.
 */
@Entity({ name: 'photos' })
@Check('photos_content_type_check', `content_type = 'image/jpeg'`)
@Check('photos_size_check', `width > 0 AND height > 0`)
export class Photo {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'photos_pkey' })
  id!: string;

  /** The uploader; only they and admins may read the photo while its page is not published. */
  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'photos_owner_id_fkey' })
  owner!: User;

  @Column({ type: 'text', name: 'content_type' })
  contentType!: 'image/jpeg';

  @Column({ type: 'bytea', select: false })
  bytes!: Buffer;

  @Column({ type: 'integer' })
  width!: number;

  @Column({ type: 'integer' })
  height!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
