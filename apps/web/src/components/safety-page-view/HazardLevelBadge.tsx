import type { HazardLevel } from '@labsafe/shared';
import { hazardLevelLabel } from './labels';

/** How many of the icon's three bars are filled: the shape tells the level, not the colour. */
const FILLED_BARS: Record<HazardLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const BARS = [
  { x: 2, height: 6 },
  { x: 9, height: 11 },
  { x: 16, height: 16 },
] as const;

// "Hazard level: Medium" as a word with a decorative bar icon (S04.1 AC5): never colour alone.
export function HazardLevelBadge({ level }: { level: HazardLevel }) {
  return (
    <p className="flex items-center gap-2 text-base font-semibold text-slate-900">
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 22 20"
        className="size-6 shrink-0 text-slate-900"
      >
        {BARS.map((bar, index) => (
          <rect
            key={bar.x}
            x={bar.x}
            y={18 - bar.height}
            width={5}
            height={bar.height}
            rx={1}
            className={index < FILLED_BARS[level] ? 'fill-current' : 'fill-none stroke-current'}
            strokeWidth={1.5}
          />
        ))}
      </svg>
      <span>{`Hazard level: ${hazardLevelLabel(level)}`}</span>
    </p>
  );
}
