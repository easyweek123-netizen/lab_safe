import type { SafetyPageContent } from '@labsafe/shared';
import type { HeadingLevel } from './Heading';
import { hazardTypeLabel } from './labels';
import { ViewSection } from './ViewSection';
import { ViewText } from './ViewText';

type HazardDetailsProps = {
  content: SafetyPageContent;
  level: HeadingLevel;
};

// Each hazard with how it arises, or "No significant hazards" (S04.1 AC5).
export function HazardDetails({ content, level }: HazardDetailsProps) {
  return (
    <ViewSection title="Hazards" level={level}>
      {content.noSignificantHazards ? (
        <p className="text-base text-slate-800">No significant hazards</p>
      ) : (
        <ul className="space-y-3">
          {content.hazards.map((hazard) => (
            <li key={hazard.type} className="space-y-1">
              <p className="text-base font-semibold break-words text-slate-900">
                {hazardTypeLabel(hazard.type)}
              </p>
              <ViewText text={hazard.note} />
            </li>
          ))}
        </ul>
      )}
    </ViewSection>
  );
}
