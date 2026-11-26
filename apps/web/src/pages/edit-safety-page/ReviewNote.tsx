type ReviewNoteProps = {
  /** The admin's note on a rejected page, shown word for word with its line breaks. */
  note: string;
};

// The admin's note above the fix form (S04.3 AC5): a heading and the text. A plain note, not an
// `alert`: the page loaded correctly.
export function ReviewNote({ note }: ReviewNoteProps) {
  return (
    <section
      aria-labelledby="review-note-heading"
      className="min-w-0 space-y-2 rounded border border-amber-300 bg-amber-50 px-4 py-3"
    >
      <h2 id="review-note-heading" className="text-xl font-semibold text-slate-900">
        Admin's note
      </h2>
      <p className="text-base break-words whitespace-pre-wrap text-slate-900">{note}</p>
    </section>
  );
}
