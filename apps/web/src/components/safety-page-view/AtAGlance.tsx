import type { SafetyPageContent } from '@labsafe/shared';
import { EmergencyPhone } from './EmergencyPhone';
import type { HeadingLevel } from './Heading';
import { HazardLevelBadge } from './HazardLevelBadge';
import { hazardTypeLabel, protectiveEquipmentLabel } from './labels';
import { NameList } from './NameList';
import { ViewSection } from './ViewSection';

type AtAGlanceProps = {
  content: SafetyPageContent;
  level: HeadingLevel;
};

// The compact block before the photo (S04.1 AC5, E04 design "Screens"): hazard level, training,
// hazard and PPE names only, and the emergency number, so a phone shows them first.
export function AtAGlance({ content, level }: AtAGlanceProps) {
  const training = content.trainingRequired
    ? `Yes, given by ${content.trainingGivenBy ?? ''}`
    : 'No';
  return (
    <div className="rounded border-2 border-slate-900 p-4">
      <ViewSection title="At a glance" level={level}>
        <HazardLevelBadge level={content.hazardLevel} />
        <p className="text-base break-words text-slate-900">
          {`Training required before first use: ${training}`}
        </p>
        <NameList
          label="Hazards"
          names={content.hazards.map((hazard) => ({
            key: hazard.type,
            name: hazardTypeLabel(hazard.type),
          }))}
          none={content.noSignificantHazards ? 'No significant hazards' : null}
        />
        <NameList
          label="Protective equipment"
          names={content.protectiveEquipment.map((entry) => ({
            key: entry.item,
            name: protectiveEquipmentLabel(entry.item),
          }))}
          none={content.standardLabAttireOnly ? 'No PPE beyond standard lab attire' : null}
        />
        <p className="text-base font-semibold text-slate-900">
          Emergency: <EmergencyPhone phone={content.emergencyPhone} />
        </p>
      </ViewSection>
    </div>
  );
}
