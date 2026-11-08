// The backend scores six calendar months. The end date's month counts as the last of them.
export const SCORING_WINDOW_MONTHS = 6;

/*
 * The first month-end with six full months of data behind it. The data starts
 * in September 2025, so an earlier date would score a part-empty window and
 * look low only because months are missing.
 */
export const EARLIEST_SCORING_DATE = '2026-02-28';

// Both dates are YYYY-MM-DD, and both days count as inside the window.
export interface ScoringWindow {
  start: string;
  end: string;
}

function parseIsoDate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/*
 * The dates to ask the backend for: the first day of the oldest month up to
 * the end date. For example, an end date of "2026-02-20" gives a start of
 * "2025-09-01", five whole months earlier.
 */
export function scoringWindowFor(endDate: string): ScoringWindow {
  const end = parseIsoDate(endDate);
  const monthsBack = SCORING_WINDOW_MONTHS - 1;
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - monthsBack, 1));
  return { start: formatIsoDate(start), end: endDate };
}

// Today as YYYY-MM-DD. The backend works in UTC, so the viewer's time zone must not change the day.
export function todayInUtc(): string {
  return formatIsoDate(new Date());
}

/*
 * True for a real date written as YYYY-MM-DD. Formatting the parsed date and
 * comparing it to the input catches both bad formats and days that don't
 * exist, because 2026-02-31 comes back as a date in March.
 */
export function isIsoDate(value: string): boolean {
  const date = parseIsoDate(value);
  return !Number.isNaN(date.getTime()) && formatIsoDate(date) === value;
}
