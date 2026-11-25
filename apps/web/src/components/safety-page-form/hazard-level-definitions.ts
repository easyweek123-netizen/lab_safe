import type { HazardLevel } from '@labsafe/shared';

/**
 * The hazard level definitions of PRD R5, word for word (first letter capitalised). R5 requires
 * them next to the hazard level field; they are web constants (E03 design "Screens").
 */
export const HAZARD_LEVEL_DEFINITIONS: Record<HazardLevel, string> = {
  LOW: 'Minor risk with standard lab PPE.',
  MEDIUM:
    'Misuse can cause an injury that needs first aid or medical care (hot surfaces, glass under vacuum, corrosive splashes).',
  HIGH: 'Misuse can cause serious injury or death, or training is needed before first use (high voltage, cryogens, pressure vessels, class 3B/4 lasers, X-ray).',
};
