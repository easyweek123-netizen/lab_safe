import type { HeadingLevel } from './Heading';
import { ViewSection } from './ViewSection';
import { ViewText } from './ViewText';

type GuidelineSectionProps = {
  title: string;
  text: string;
  level: HeadingLevel;
};

// One of the guideline texts (Before use, Safe operation, Do NOT) under its heading (S04.1 AC5).
export function GuidelineSection({ title, text, level }: GuidelineSectionProps) {
  return (
    <ViewSection title={title} level={level}>
      <ViewText text={text} />
    </ViewSection>
  );
}
