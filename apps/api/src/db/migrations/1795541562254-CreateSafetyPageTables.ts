import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSafetyPageTables1795541562254 implements MigrationInterface {
  name = 'CreateSafetyPageTables1795541562254';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "photos" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "owner_id" uuid NOT NULL, "content_type" text NOT NULL, "bytes" bytea NOT NULL, "width" integer NOT NULL, "height" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "photos_size_check" CHECK (width > 0 AND height > 0), CONSTRAINT "photos_content_type_check" CHECK (content_type = 'image/jpeg'), CONSTRAINT "photos_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "instruments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_by" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "instruments_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "revision_hazards" ("revision_id" uuid NOT NULL, "hazard_type" text NOT NULL, "note" text NOT NULL, CONSTRAINT "revision_hazards_note_check" CHECK (btrim(note) <> ''), CONSTRAINT "revision_hazards_hazard_type_check" CHECK (hazard_type IN ('ELECTRICAL', 'HOT_SURFACE', 'CRYOGENIC', 'HIGH_PRESSURE', 'VACUUM', 'FIRE', 'CHEMICAL_EXPOSURE', 'UV_RADIATION', 'LASER', 'IONIZING_RADIATION', 'MAGNETIC_FIELD', 'MOVING_PARTS', 'GLASS_SHARPS', 'NOISE', 'BIOLOGICAL')), CONSTRAINT "revision_hazards_pkey" PRIMARY KEY ("revision_id", "hazard_type"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "instrument_revisions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "instrument_id" uuid NOT NULL, "kind" text NOT NULL, "status" text NOT NULL, "submitted_by" uuid NOT NULL, "submitted_at" TIMESTAMP WITH TIME ZONE NOT NULL, "name" text NOT NULL, "manufacturer" text, "model" text, "description" text NOT NULL, "category" text NOT NULL, "lab_room_id" uuid NOT NULL, "responsible_name" text NOT NULL, "responsible_contact" text NOT NULL, "hazard_level" text NOT NULL, "training_required" boolean NOT NULL, "training_given_by" text, "no_significant_hazards" boolean NOT NULL, "standard_lab_attire_only" boolean NOT NULL, "hazard_pictograms" text array NOT NULL, "before_use" text NOT NULL, "safe_operation" text NOT NULL, "do_not" text NOT NULL, "emergency" text NOT NULL, "emergency_phone" text NOT NULL, "emergency_equipment" jsonb NOT NULL, "photo_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "instrument_revisions_emergency_phone_check" CHECK (btrim(emergency_phone) <> ''), CONSTRAINT "instrument_revisions_emergency_check" CHECK (btrim(emergency) <> ''), CONSTRAINT "instrument_revisions_do_not_check" CHECK (btrim(do_not) <> ''), CONSTRAINT "instrument_revisions_safe_operation_check" CHECK (btrim(safe_operation) <> ''), CONSTRAINT "instrument_revisions_before_use_check" CHECK (btrim(before_use) <> ''), CONSTRAINT "instrument_revisions_responsible_contact_check" CHECK (btrim(responsible_contact) <> ''), CONSTRAINT "instrument_revisions_responsible_name_check" CHECK (btrim(responsible_name) <> ''), CONSTRAINT "instrument_revisions_description_check" CHECK (btrim(description) <> ''), CONSTRAINT "instrument_revisions_model_check" CHECK (model IS NULL OR btrim(model) <> ''), CONSTRAINT "instrument_revisions_manufacturer_check" CHECK (manufacturer IS NULL OR btrim(manufacturer) <> ''), CONSTRAINT "instrument_revisions_name_check" CHECK (btrim(name) <> ''), CONSTRAINT "instrument_revisions_training_hazard_level_check" CHECK (NOT (training_required AND hazard_level = 'LOW')), CONSTRAINT "instrument_revisions_training_given_by_check" CHECK ((training_required AND training_given_by IS NOT NULL AND btrim(training_given_by) <> '') OR (NOT training_required AND training_given_by IS NULL)), CONSTRAINT "instrument_revisions_emergency_equipment_check" CHECK (jsonb_typeof(emergency_equipment) = 'object' AND emergency_equipment ?& ARRAY['EYEWASH', 'SAFETY_SHOWER', 'FIRE_EXTINGUISHER', 'SPILL_KIT', 'FIRST_AID_KIT', 'EMERGENCY_STOP']), CONSTRAINT "instrument_revisions_hazard_pictograms_check" CHECK (hazard_pictograms <@ ARRAY['EXPLOSIVE', 'FLAMMABLE', 'OXIDIZING', 'COMPRESSED_GAS', 'CORROSIVE', 'TOXIC', 'HARMFUL_IRRITANT', 'HEALTH_HAZARD', 'ENVIRONMENTAL_HAZARD']::text[]), CONSTRAINT "instrument_revisions_hazard_level_check" CHECK (hazard_level IN ('LOW', 'MEDIUM', 'HIGH')), CONSTRAINT "instrument_revisions_category_check" CHECK (category IN ('HEATING_THERMAL', 'SEPARATION_EVAPORATION', 'ANALYTICAL_SPECTROSCOPY', 'PRESSURE_VACUUM', 'COOLING_CRYOGENIC', 'MIXING_CENTRIFUGATION', 'VENTILATION_CONTAINMENT', 'OTHER')), CONSTRAINT "instrument_revisions_status_check" CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')), CONSTRAINT "instrument_revisions_kind_check" CHECK (kind IN ('NEW', 'UPDATE')), CONSTRAINT "instrument_revisions_pkey" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "instrument_revisions_submitted_by_idx" ON "instrument_revisions" ("submitted_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "instrument_revisions_instrument_id_idx" ON "instrument_revisions" ("instrument_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "revision_protective_equipment" ("revision_id" uuid NOT NULL, "equipment_item" text NOT NULL, "note" text, CONSTRAINT "revision_protective_equipment_note_check" CHECK (note IS NULL OR btrim(note) <> ''), CONSTRAINT "revision_protective_equipment_equipment_item_check" CHECK (equipment_item IN ('SAFETY_GLASSES', 'SPLASH_GOGGLES', 'FACE_SHIELD', 'LAB_COAT', 'FLAME_RESISTANT_LAB_COAT', 'CHEMICAL_RESISTANT_GLOVES', 'HEAT_RESISTANT_GLOVES', 'CRYOGENIC_GLOVES', 'CUT_RESISTANT_GLOVES', 'LASER_SAFETY_EYEWEAR', 'UV_PROTECTIVE_EYEWEAR', 'HEARING_PROTECTION', 'RESPIRATOR', 'CLOSED_TOE_SHOES')), CONSTRAINT "revision_protective_equipment_pkey" PRIMARY KEY ("revision_id", "equipment_item"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "photos" ADD CONSTRAINT "photos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" ADD CONSTRAINT "instruments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "revision_hazards" ADD CONSTRAINT "revision_hazards_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "instrument_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "instruments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_lab_room_id_fkey" FOREIGN KEY ("lab_room_id") REFERENCES "lab_rooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" ADD CONSTRAINT "instrument_revisions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "revision_protective_equipment" ADD CONSTRAINT "revision_protective_equipment_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "instrument_revisions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "revision_protective_equipment" DROP CONSTRAINT "revision_protective_equipment_revision_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_photo_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_lab_room_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_submitted_by_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instrument_revisions" DROP CONSTRAINT "instrument_revisions_instrument_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "revision_hazards" DROP CONSTRAINT "revision_hazards_revision_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "instruments" DROP CONSTRAINT "instruments_created_by_fkey"`,
    );
    await queryRunner.query(`ALTER TABLE "photos" DROP CONSTRAINT "photos_owner_id_fkey"`);
    await queryRunner.query(`DROP TABLE "revision_protective_equipment"`);
    await queryRunner.query(`DROP INDEX "public"."instrument_revisions_instrument_id_idx"`);
    await queryRunner.query(`DROP INDEX "public"."instrument_revisions_submitted_by_idx"`);
    await queryRunner.query(`DROP TABLE "instrument_revisions"`);
    await queryRunner.query(`DROP TABLE "revision_hazards"`);
    await queryRunner.query(`DROP TABLE "instruments"`);
    await queryRunner.query(`DROP TABLE "photos"`);
  }
}
