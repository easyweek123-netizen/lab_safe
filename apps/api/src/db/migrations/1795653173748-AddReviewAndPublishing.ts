import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewAndPublishing1795653173748 implements MigrationInterface {
  name = 'AddReviewAndPublishing1795653173748';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "instruments" ADD "slug" text`);
    await queryRunner.query(
      `ALTER TABLE "instruments" ADD CONSTRAINT "instruments_slug_key" UNIQUE ("slug")`,
    );
    await queryRunner.query(`ALTER TABLE "instruments" ADD "published_revision_id" uuid`);
    await queryRunner.query(`ALTER TABLE "instrument_revisions" ADD "reviewed_by" uuid`);
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD "reviewed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "instrument_revisions" ADD "review_note" text`);
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `CREATE INDEX "instrument_revisions_photo_id_idx" ON "instrument_revisions" ("photo_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "instrument_revisions_status_submitted_at_idx" ON "instrument_revisions" ("status", "submitted_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" ADD CONSTRAINT "instruments_published_check" CHECK ((slug IS NULL AND published_revision_id IS NULL) OR (slug IS NOT NULL AND published_revision_id IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" ADD CONSTRAINT "instruments_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_version_check" CHECK (version >= 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_review_check" CHECK ((status = 'PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL) OR (status = 'APPROVED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_note IS NULL) OR (status = 'REJECTED' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND review_note IS NOT NULL AND btrim(review_note) <> ''))`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_instrument_id_id_key" UNIQUE ("instrument_id", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" ADD CONSTRAINT "instruments_published_revision_fkey" FOREIGN KEY ("id", "published_revision_id") REFERENCES "instrument_revisions"("instrument_id","id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_reviewed_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" DROP CONSTRAINT "instruments_published_revision_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_instrument_id_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_review_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_version_check"`,
    );
    await queryRunner.query(`ALTER TABLE "instruments" DROP CONSTRAINT "instruments_slug_check"`);
    await queryRunner.query(
      `ALTER TABLE "instruments" DROP CONSTRAINT "instruments_published_check"`,
    );
    await queryRunner.query(`DROP INDEX "public"."instrument_revisions_status_submitted_at_idx"`);
    await queryRunner.query(`DROP INDEX "public"."instrument_revisions_photo_id_idx"`);
    await queryRunner.query(`ALTER TABLE "instrument_revisions" DROP COLUMN "version"`);
    await queryRunner.query(`ALTER TABLE "instrument_revisions" DROP COLUMN "review_note"`);
    await queryRunner.query(`ALTER TABLE "instrument_revisions" DROP COLUMN "reviewed_at"`);
    await queryRunner.query(`ALTER TABLE "instrument_revisions" DROP COLUMN "reviewed_by"`);
    await queryRunner.query(`ALTER TABLE "instruments" DROP COLUMN "published_revision_id"`);
    await queryRunner.query(`ALTER TABLE "instruments" DROP CONSTRAINT "instruments_slug_key"`);
    await queryRunner.query(`ALTER TABLE "instruments" DROP COLUMN "slug"`);
  }
}
