import { EMERGENCY_EQUIPMENT, type SafetyPageContent } from '@labsafe/shared';
import { EmergencyPhone } from './EmergencyPhone';
import type { HeadingLevel } from './Heading';
import { ViewSection } from './ViewSection';
import { ViewText } from './ViewText';

type EmergencyInformationProps = {
  content: SafetyPageContent;
  level: HeadingLevel;
};

// Emergency & first aid (S04.1 AC5): the phone number first, then the six emergency equipment
// items in PRD order, each with its location or "Not applicable", then the contributor's text.
export function EmergencyInformation({ content, level }: EmergencyInformationProps) {
  return (
    <ViewSection title="Emergency & first aid" level={level}>
      <p className="text-base font-semibold text-slate-900">
        Emergency phone number: <EmergencyPhone phone={content.emergencyPhone} />
      </p>
      <ul aria-label="Emergency equipment" className="space-y-1">
        {EMERGENCY_EQUIPMENT.map((equipment) => {
          const entry = content.emergencyEquipment[equipment.value];
          const where = entry.kind === 'LOCATION' ? entry.location : 'Not applicable';
          return (
            <li key={equipment.value} className="text-base break-words text-slate-800">
              <span className="font-semibold text-slate-900">{equipment.label}:</span> {where}
            </li>
          );
        })}
      </ul>
      <ViewText text={content.emergency} />
    </ViewSection>
  );
}
