import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndSessions1795521437455 implements MigrationInterface {
  name = 'CreateUsersAndSessions1795521437455';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "name" text NOT NULL, "email" text NOT NULL, "password_hash" text NOT NULL, "role" text NOT NULL DEFAULT 'CONTRIBUTOR', "status" text NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "users_email_key" UNIQUE ("email"), CONSTRAINT "users_admin_approved_check" CHECK (role <> 'ADMIN' OR status = 'APPROVED'), CONSTRAINT "users_status_check" CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')), CONSTRAINT "users_role_check" CHECK (role IN ('CONTRIBUTOR', 'ADMIN')), CONSTRAINT "users_name_check" CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100), CONSTRAINT "users_email_check" CHECK (email = lower(email)), CONSTRAINT "users_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token_hash" text NOT NULL, "user_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "sessions_token_hash_key" UNIQUE ("token_hash"), CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id") `);
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "sessions_user_id_fkey"`);
    await queryRunner.query(`DROP INDEX "public"."sessions_user_id_idx"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
