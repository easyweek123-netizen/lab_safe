import type { ReactNode } from 'react';

/** The heading levels the view uses: its title at 1 or 2, its sections one below. */
export type HeadingLevel = 1 | 2 | 3;

type HeadingProps = {
  level: HeadingLevel;
  id?: string;
  /** The page's title; otherwise a section heading. The size never depends on the level. */
  title?: boolean;
  children: ReactNode;
};

// A heading at a level chosen by the caller, so `SafetyPageView` keeps the headings in order
// under the preview's h1 and as the public page's h1 (S04.1 FE-01), and looks the same in both.
export function Heading({ level, id, title = false, children }: HeadingProps) {
  const Tag = `h${level}` as const;
  const size = title ? 'text-2xl font-bold' : 'text-xl font-semibold';
  return (
    <Tag id={id} className={`${size} break-words text-slate-900`}>
      {children}
    </Tag>
  );
}
