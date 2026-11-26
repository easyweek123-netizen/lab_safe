const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

/** An ISO date-time as a day, in the "My submissions" format (for example "25 Nov 2026"). */
export function formatDate(isoDateTime: string): string {
  return DATE_FORMAT.format(new Date(isoDateTime));
}
