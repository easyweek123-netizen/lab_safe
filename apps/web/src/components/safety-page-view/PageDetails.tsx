import type { LabRoom, SafetyPageContent } from '@labsafe/shared';
import { categoryLabel } from './labels';
import { ViewText } from './ViewText';

type PageDetailsProps = {
  content: SafetyPageContent;
  labRoom: LabRoom;
};

const TERM = 'text-base font-semibold text-slate-900';
const DEFINITION = 'text-base break-words text-slate-800';

// The identity under the photo (S04.1 AC5): category, lab room "<name> (<code>)", the short
// description, then the responsible person and contact.
export function PageDetails({ content, labRoom }: PageDetailsProps) {
  return (
    <div className="space-y-3">
      <dl className="space-y-1">
        <dt className={TERM}>Category</dt>
        <dd className={DEFINITION}>{categoryLabel(content.category)}</dd>
        <dt className={TERM}>Lab room</dt>
        <dd className={DEFINITION}>{`${labRoom.name} (${labRoom.code})`}</dd>
      </dl>
      <ViewText text={content.description} />
      <dl className="space-y-1">
        <dt className={TERM}>Responsible person</dt>
        <dd className={DEFINITION}>{content.responsibleName}</dd>
        <dt className={TERM}>Contact</dt>
        <dd className={DEFINITION}>{content.responsibleContact}</dd>
      </dl>
    </div>
  );
}
