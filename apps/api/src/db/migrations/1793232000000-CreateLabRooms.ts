import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The lab rooms (design doc §3, E01 design §3). Written by hand: there is no entity yet.
 *
 * The four rooms are placeholders, to be replaced with the real rooms before the demo (PRD §7).
 */
export class CreateLabRooms1793232000000 implements MigrationInterface {
  name = 'CreateLabRooms1793232000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE lab_rooms (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text NOT NULL UNIQUE CHECK (code <> ''),
        name text NOT NULL CHECK (name <> '')
      )
    `);
    await queryRunner.query(`
      INSERT INTO lab_rooms (code, name) VALUES
        ('LAB-101', 'Teaching lab 1'),
        ('LAB-102', 'Teaching lab 2'),
        ('LAB-201', 'Research lab'),
        ('LAB-202', 'Instrument room')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE lab_rooms`);
  }
}
