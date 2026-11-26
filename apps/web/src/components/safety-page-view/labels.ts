import {
  CATEGORIES,
  EMERGENCY_EQUIPMENT,
  HAZARD_LEVELS,
  HAZARD_PICTOGRAMS,
  HAZARD_TYPES,
  PROTECTIVE_EQUIPMENT,
  type Category,
  type EmergencyEquipmentItem,
  type HazardLevel,
  type HazardPictogram,
  type HazardType,
  type ProtectiveEquipmentItem,
} from '@labsafe/shared';

// The PRD §4.2 labels of the shared lists (S04.1 AC5), looked up by value. Every value of a
// contract enum is in its list, so the value itself is only a fallback that never shows.

function labelIn<Value extends string>(
  list: readonly { value: Value; label: string }[],
  value: Value,
): string {
  return list.find((item) => item.value === value)?.label ?? value;
}

export const categoryLabel = (value: Category) => labelIn(CATEGORIES, value);
export const hazardLevelLabel = (value: HazardLevel) => labelIn(HAZARD_LEVELS, value);
export const hazardTypeLabel = (value: HazardType) => labelIn(HAZARD_TYPES, value);
export const pictogramLabel = (value: HazardPictogram) => labelIn(HAZARD_PICTOGRAMS, value);
export const protectiveEquipmentLabel = (value: ProtectiveEquipmentItem) =>
  labelIn(PROTECTIVE_EQUIPMENT, value);
export const emergencyEquipmentLabel = (value: EmergencyEquipmentItem) =>
  labelIn(EMERGENCY_EQUIPMENT, value);
