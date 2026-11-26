import { useId, type ReactNode } from 'react';
import { Heading, type HeadingLevel } from './Heading';

type ViewSectionProps = {
  title: string;
  level: HeadingLevel;
  children: ReactNode;
};

// One titled part of `SafetyPageView`, a region named by its heading.
export function ViewSection({ title, level, children }: ViewSectionProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <Heading level={level} id={headingId}>
        {title}
      </Heading>
      {children}
    </section>
  );
}
