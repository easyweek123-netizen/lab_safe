import { Check, Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * One room of the lab (table `lab_rooms`). Mirrors the `CreateLabRooms` migration exactly,
 * including the constraint names PostgreSQL gave it, so a generated migration finds no change.
 * The rows come only from migrations; the app only reads them.
 */
@Entity({ name: 'lab_rooms' })
@Unique('lab_rooms_code_key', ['code'])
@Check('lab_rooms_code_check', `code <> ''`)
@Check('lab_rooms_name_check', `name <> ''`)
export class LabRoom {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'lab_rooms_pkey' })
  id!: string;

  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'text' })
  name!: string;
}
