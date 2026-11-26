import type { SafetyPageContent } from '@labsafe/shared';
import type { HeadingLevel } from './Heading';
import { protectiveEquipmentLabel } from './labels';
import { ViewSection } from './ViewSection';
import { ViewText } from './ViewText';

type ProtectiveEquipmentDetailsProps = {
  content: SafetyPageContent;
  level: HeadingLevel;
};

// Each PPE item with its note when it has one, or "No PPE beyond standard lab attire" (S04.1 AC5).
export function ProtectiveEquipmentDetails({ content, level }: ProtectiveEquipmentDetailsProps) {
  return (
    <ViewSection title="Protective equipment" level={level}>
      {content.standardLabAttireOnly ? (
        <p className="text-base text-slate-800">No PPE beyond standard lab attire</p>
      ) : (
        <ul className="space-y-3">
          {content.protectiveEquipment.map((entry) => (
            <li key={entry.item} className="space-y-1">
              <p className="text-base font-semibold break-words text-slate-900">
                {protectiveEquipmentLabel(entry.item)}
              </p>
              {entry.note !== null && <ViewText text={entry.note} />}
            </li>
          ))}
        </ul>
      )}
    </ViewSection>
  );
}
