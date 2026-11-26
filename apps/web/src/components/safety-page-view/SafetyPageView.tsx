import type { SafetyPageDisplay } from '@labsafe/shared';
import { photoUrl } from '../../api/photos';
import { formatDate } from '../format-date';
import { AtAGlance } from './AtAGlance';
import { EmergencyInformation } from './EmergencyInformation';
import { GuidelineSection } from './GuidelineSection';
import { HazardDetails } from './HazardDetails';
import { Heading } from './Heading';
import { PageDetails } from './PageDetails';
import { PictogramList } from './PictogramList';
import { ProtectiveEquipmentDetails } from './ProtectiveEquipmentDetails';

type SafetyPageViewProps = {
  page: SafetyPageDisplay;
  /** 1 on the public page, 2 in the admin's preview under its own h1; sections are one below. */
  headingLevel: 1 | 2;
};

// A safety page as students see it (S04.1 AC5, E04-D1): the one view for the admin's preview and
// the public page, so the preview really is the public page. Every text is React text, never
// HTML. It shows nothing about the contributor.
export function SafetyPageView({ page, headingLevel }: SafetyPageViewProps) {
  const { content, labRoom, lastApproved } = page;
  const level = headingLevel === 1 ? 2 : 3;
  return (
    <article className="min-w-0 space-y-6">
      <header className="space-y-1">
        <Heading level={headingLevel} title>
          {content.name}
        </Heading>
        {content.manufacturer !== null && (
          <p className="text-base break-words text-slate-700">{`Manufacturer: ${content.manufacturer}`}</p>
        )}
        {content.model !== null && (
          <p className="text-base break-words text-slate-700">{`Model: ${content.model}`}</p>
        )}
      </header>
      <AtAGlance content={content} level={level} />
      <img
        src={photoUrl(content.photoId)}
        alt={`Photo of ${content.name}`}
        className="h-auto max-h-96 w-full rounded object-contain"
      />
      <PageDetails content={content} labRoom={labRoom} />
      <HazardDetails content={content} level={level} />
      <PictogramList pictograms={content.pictograms} level={level} />
      <ProtectiveEquipmentDetails content={content} level={level} />
      <GuidelineSection title="Before use" text={content.beforeUse} level={level} />
      <GuidelineSection title="Safe operation" text={content.safeOperation} level={level} />
      <GuidelineSection title="Do NOT" text={content.doNot} level={level} />
      <EmergencyInformation content={content} level={level} />
      {lastApproved !== null && (
        <p className="text-base text-slate-700">
          Last approved <time dateTime={lastApproved.at}>{formatDate(lastApproved.at)}</time> by{' '}
          {lastApproved.approverName}
        </p>
      )}
    </article>
  );
}
