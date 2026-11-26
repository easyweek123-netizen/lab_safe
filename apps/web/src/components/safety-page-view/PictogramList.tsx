import type { HazardPictogram } from '@labsafe/shared';
import { GHS_SYMBOLS } from '../ghs-symbols';
import type { HeadingLevel } from './Heading';
import { pictogramLabel } from './labels';
import { ViewSection } from './ViewSection';

type PictogramListProps = {
  pictograms: readonly HazardPictogram[];
  level: HeadingLevel;
};

// The GHS pictograms, each symbol with its name (S04.1 AC5). The symbol is decorative, the name
// says it. No pictograms: no section, so no empty heading.
export function PictogramList({ pictograms, level }: PictogramListProps) {
  if (pictograms.length === 0) return null;
  return (
    <ViewSection title="GHS pictograms" level={level}>
      <ul className="flex flex-wrap gap-4">
        {pictograms.map((pictogram) => (
          <li
            key={pictogram}
            className="flex max-w-full items-center gap-2 text-base text-slate-800"
          >
            <img
              src={GHS_SYMBOLS[pictogram]}
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0"
            />
            <span className="break-words">{pictogramLabel(pictogram)}</span>
          </li>
        ))}
      </ul>
    </ViewSection>
  );
}
