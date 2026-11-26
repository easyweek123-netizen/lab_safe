import type { HazardPictogram } from '@labsafe/shared';
import compressedGas from '../assets/ghs/compressed-gas.svg';
import corrosive from '../assets/ghs/corrosive.svg';
import environmentalHazard from '../assets/ghs/environmental-hazard.svg';
import explosive from '../assets/ghs/explosive.svg';
import flammable from '../assets/ghs/flammable.svg';
import harmfulIrritant from '../assets/ghs/harmful-irritant.svg';
import healthHazard from '../assets/ghs/health-hazard.svg';
import oxidizing from '../assets/ghs/oxidizing.svg';
import toxic from '../assets/ghs/toxic.svg';

// The nine GHS hazard pictograms (UN GHS, UNECE; E03 design open question 4), one image per
// shared `HAZARD_PICTOGRAMS` value. Source: the official UNECE pictograms
// (https://unece.org/transport/dangerous-goods/ghs-pictograms) as public-domain SVGs on
// Wikimedia Commons (https://commons.wikimedia.org/wiki/File:GHS-pictogram-<name>.svg with
// <name> explos, flamme, rondflam, bottle, acid, skull, exclam, silhouette, pollu),
// downloaded 2026-11-24 and unchanged. The images are decorative: the label names each one.
export const GHS_SYMBOLS: Record<HazardPictogram, string> = {
  EXPLOSIVE: explosive,
  FLAMMABLE: flammable,
  OXIDIZING: oxidizing,
  COMPRESSED_GAS: compressedGas,
  CORROSIVE: corrosive,
  TOXIC: toxic,
  HARMFUL_IRRITANT: harmfulIrritant,
  HEALTH_HAZARD: healthHazard,
  ENVIRONMENTAL_HAZARD: environmentalHazard,
};
