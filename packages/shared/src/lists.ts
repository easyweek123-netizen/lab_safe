import { z } from 'zod';

// The fixed lists of PRD §4.2 (R4), in PRD order. Values are stable upper-case codes
// (stored in the database and used in URLs); labels are the PRD's English wording.

export const HAZARD_TYPES = [
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HOT_SURFACE', label: 'Hot surface / heat' },
  { value: 'CRYOGENIC', label: 'Cryogenic / extreme cold' },
  { value: 'HIGH_PRESSURE', label: 'High pressure / compressed gas' },
  { value: 'VACUUM', label: 'Vacuum / implosion' },
  { value: 'FIRE', label: 'Fire / flammable vapour' },
  { value: 'CHEMICAL_EXPOSURE', label: 'Chemical exposure (toxic, corrosive, irritant)' },
  { value: 'UV_RADIATION', label: 'UV radiation' },
  { value: 'LASER', label: 'Laser' },
  { value: 'IONIZING_RADIATION', label: 'Ionizing radiation (X-ray)' },
  { value: 'MAGNETIC_FIELD', label: 'Strong magnetic field' },
  { value: 'MOVING_PARTS', label: 'Moving or rotating parts' },
  { value: 'GLASS_SHARPS', label: 'Glass breakage / sharps' },
  { value: 'NOISE', label: 'Noise' },
  { value: 'BIOLOGICAL', label: 'Biological' },
] as const;

export const PROTECTIVE_EQUIPMENT = [
  { value: 'SAFETY_GLASSES', label: 'Safety glasses' },
  { value: 'SPLASH_GOGGLES', label: 'Splash goggles' },
  { value: 'FACE_SHIELD', label: 'Face shield' },
  { value: 'LAB_COAT', label: 'Lab coat' },
  { value: 'FLAME_RESISTANT_LAB_COAT', label: 'Flame-resistant lab coat' },
  { value: 'CHEMICAL_RESISTANT_GLOVES', label: 'Chemical-resistant gloves' },
  { value: 'HEAT_RESISTANT_GLOVES', label: 'Heat-resistant gloves' },
  { value: 'CRYOGENIC_GLOVES', label: 'Cryogenic gloves' },
  { value: 'CUT_RESISTANT_GLOVES', label: 'Cut-resistant gloves' },
  { value: 'LASER_SAFETY_EYEWEAR', label: 'Laser safety eyewear' },
  { value: 'UV_PROTECTIVE_EYEWEAR', label: 'UV-protective eyewear' },
  { value: 'HEARING_PROTECTION', label: 'Hearing protection' },
  { value: 'RESPIRATOR', label: 'Respirator' },
  { value: 'CLOSED_TOE_SHOES', label: 'Closed-toe shoes' },
] as const;

export const HAZARD_PICTOGRAMS = [
  { value: 'EXPLOSIVE', label: 'Explosive' },
  { value: 'FLAMMABLE', label: 'Flammable' },
  { value: 'OXIDIZING', label: 'Oxidizing' },
  { value: 'COMPRESSED_GAS', label: 'Compressed gas' },
  { value: 'CORROSIVE', label: 'Corrosive' },
  { value: 'TOXIC', label: 'Toxic (skull)' },
  { value: 'HARMFUL_IRRITANT', label: 'Harmful/irritant (exclamation mark)' },
  { value: 'HEALTH_HAZARD', label: 'Health hazard' },
  { value: 'ENVIRONMENTAL_HAZARD', label: 'Environmental hazard' },
] as const;

export const CATEGORIES = [
  { value: 'HEATING_THERMAL', label: 'Heating & thermal' },
  { value: 'SEPARATION_EVAPORATION', label: 'Separation & evaporation' },
  { value: 'ANALYTICAL_SPECTROSCOPY', label: 'Analytical & spectroscopy' },
  { value: 'PRESSURE_VACUUM', label: 'Pressure & vacuum' },
  { value: 'COOLING_CRYOGENIC', label: 'Cooling & cryogenic' },
  { value: 'MIXING_CENTRIFUGATION', label: 'Mixing & centrifugation' },
  { value: 'VENTILATION_CONTAINMENT', label: 'Ventilation & containment' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const HAZARD_LEVELS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
] as const;

// The emergency equipment of PRD §4.1 "Emergency info", in PRD order (S03.1 API contract).
export const EMERGENCY_EQUIPMENT = [
  { value: 'EYEWASH', label: 'Eyewash' },
  { value: 'SAFETY_SHOWER', label: 'Safety shower' },
  { value: 'FIRE_EXTINGUISHER', label: 'Fire extinguisher' },
  { value: 'SPILL_KIT', label: 'Spill kit' },
  { value: 'FIRST_AID_KIT', label: 'First-aid kit' },
  { value: 'EMERGENCY_STOP', label: 'Emergency stop' },
] as const;

export const HazardLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type HazardLevel = z.infer<typeof HazardLevel>;

export type HazardTypeValue = (typeof HAZARD_TYPES)[number]['value'];
export type ProtectiveEquipmentValue = (typeof PROTECTIVE_EQUIPMENT)[number]['value'];
export type HazardPictogramValue = (typeof HAZARD_PICTOGRAMS)[number]['value'];
export type CategoryValue = (typeof CATEGORIES)[number]['value'];
export type EmergencyEquipmentValue = (typeof EMERGENCY_EQUIPMENT)[number]['value'];

/** The values of a fixed list, in list order, as the non-empty tuple `z.enum` needs. */
function valuesOf<Value extends string>(list: readonly { value: Value }[]): [Value, ...Value[]] {
  return list.map((item) => item.value) as [Value, ...Value[]];
}

// Zod enums built from the lists above, so each list has one source (S03.1 BE-01). The
// database CHECKs are built from the same constants (BE-02).
export const HazardType = z.enum(valuesOf(HAZARD_TYPES));
export type HazardType = z.infer<typeof HazardType>;

export const ProtectiveEquipmentItem = z.enum(valuesOf(PROTECTIVE_EQUIPMENT));
export type ProtectiveEquipmentItem = z.infer<typeof ProtectiveEquipmentItem>;

export const HazardPictogram = z.enum(valuesOf(HAZARD_PICTOGRAMS));
export type HazardPictogram = z.infer<typeof HazardPictogram>;

export const Category = z.enum(valuesOf(CATEGORIES));
export type Category = z.infer<typeof Category>;

export const EmergencyEquipmentItem = z.enum(valuesOf(EMERGENCY_EQUIPMENT));
export type EmergencyEquipmentItem = z.infer<typeof EmergencyEquipmentItem>;
