import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Inserts a tiny photo row owned by `ownerId` straight into `photos` and returns its id. */
export async function insertPhoto(app: INestApplication, ownerId: string): Promise<string> {
  const rows: { id: string }[] = await app
    .get(DataSource)
    .query(
      `INSERT INTO photos (owner_id, content_type, bytes, width, height) VALUES ($1, 'image/jpeg', $2, 1, 1) RETURNING id`,
      [ownerId, Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
    );
  return rows[0]!.id;
}

/** The id of the first migrated lab room (by code). */
export async function firstLabRoomId(app: INestApplication): Promise<string> {
  const rows: { id: string }[] = await app
    .get(DataSource)
    .query('SELECT id FROM lab_rooms ORDER BY code LIMIT 1');
  return rows[0]!.id;
}

/**
 * A complete, valid "Rotary evaporator" body for `POST /api/submissions`, already in the form
 * the shared `SafetyPageContent` schema returns it (trimmed texts, lists in PRD order), so a
 * test can compare it with the response's `content`. A test overrides single fields.
 */
export function validPage(ids: { photoId: string; labRoomId: string }) {
  return {
    name: 'Rotary evaporator',
    photoId: ids.photoId,
    manufacturer: 'Büchi',
    model: null,
    category: 'SEPARATION_EVAPORATION',
    labRoomId: ids.labRoomId,
    description: 'Removes solvents under reduced pressure.',
    responsibleName: 'Dr. Lee',
    responsibleContact: 'lee@lab.test',
    hazardLevel: 'MEDIUM',
    trainingRequired: true,
    trainingGivenBy: 'Dr. Lee',
    hazards: [
      { type: 'HOT_SURFACE', note: 'The water bath reaches 90 °C.' },
      { type: 'CHEMICAL_EXPOSURE', note: 'Solvent vapours escape when the flask is changed.' },
    ],
    noSignificantHazards: false,
    pictograms: ['FLAMMABLE'],
    protectiveEquipment: [
      { item: 'SAFETY_GLASSES', note: null },
      { item: 'CHEMICAL_RESISTANT_GLOVES', note: 'Change them after a spill.' },
    ],
    standardLabAttireOnly: false,
    beforeUse: 'Check the glassware for cracks.',
    safeOperation: 'Start the rotation before the vacuum.',
    doNot: 'Do not heat a closed system.',
    emergency: 'Stop the bath, vent the system and call for help.',
    emergencyPhone: '112',
    emergencyEquipment: {
      EYEWASH: { kind: 'LOCATION', location: 'Next to the door' },
      SAFETY_SHOWER: { kind: 'LOCATION', location: 'Corridor, room 1.02' },
      FIRE_EXTINGUISHER: { kind: 'LOCATION', location: 'Left of the fume hood' },
      SPILL_KIT: { kind: 'LOCATION', location: 'Under the sink' },
      FIRST_AID_KIT: { kind: 'LOCATION', location: 'On the wall by the door' },
      EMERGENCY_STOP: { kind: 'NOT_APPLICABLE' },
    },
  };
}
