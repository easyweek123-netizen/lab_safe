import type { ReactNode } from 'react';

type SectionFieldsetProps = {
  /** The group's name, shown as its h2 and naming the fieldset (S03.1 AC1). */
  title: string;
  children: ReactNode;
};

// One group of the safety page form: a fieldset whose legend is an h2, so the group is named
// for assistive technology and the page's headings stay in order (h1 page, h2 groups).
export function SectionFieldset({ title, children }: SectionFieldsetProps) {
  return (
    <fieldset className="min-w-0 space-y-4 border-t border-slate-300 pt-4">
      <legend className="float-left mb-2 w-full">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </legend>
      <div className="clear-left space-y-4">{children}</div>
    </fieldset>
  );
}
