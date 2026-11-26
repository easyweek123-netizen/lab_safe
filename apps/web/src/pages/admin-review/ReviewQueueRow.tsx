import type { ReviewQueueItem, RevisionKind } from '@labsafe/shared';
import { Link } from 'react-router';
import { formatDate } from '../../components/format-date';

/** A revision's kind in words (S04.1 AC1); `UPDATE` comes with E05. */
const KIND_LABELS: Record<RevisionKind, string> = {
  NEW: 'New',
  UPDATE: 'Update',
};

type ReviewQueueRowProps = {
  item: ReviewQueueItem;
};

// One pending page in "Pages to review": its name as a link to the preview, its kind as text,
// who submitted it and when, in the "My submissions" date format.
export function ReviewQueueRow({ item }: ReviewQueueRowProps) {
  return (
    <li className="min-w-0 space-y-1 rounded border border-slate-200 px-4 py-3">
      <p className="text-base font-semibold break-words">
        <Link
          to={`/admin/review/${item.id}`}
          className="inline-block rounded py-1 text-blue-700 underline hover:text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          {item.name}
        </Link>
      </p>
      <p className="text-base">
        <span className="inline-block rounded border border-slate-400 px-2 text-slate-900">
          {KIND_LABELS[item.kind]}
        </span>
      </p>
      <p className="text-base break-words text-slate-700">{`Submitted by ${item.submittedBy.name}`}</p>
      <p className="text-base text-slate-700">
        Submitted <time dateTime={item.submittedAt}>{formatDate(item.submittedAt)}</time>
      </p>
    </li>
  );
}
