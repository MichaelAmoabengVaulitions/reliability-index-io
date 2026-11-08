import { config } from '@/config';

export interface ScoringWindow {
  start: string;
  end: string;
}

export function parseISODate(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

/*
 * Formats a date as the short month and year, for example "Feb 2026". We use
 * UTC so the month shown matches the calendar date and does not shift with
 * the viewer's time zone.
 */
export function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat(config.locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

// Formats a YYYY-MM-DD date for reading, for example "28 Aug 2026".
export function formatDate(yyyyMmDd: string): string {
  return new Intl.DateTimeFormat(config.dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parseISODate(yyyyMmDd));
}

export function monthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/*
 * Returns the six-month scoring window that ends at the from date. For
 * example, a from of "2026-02-20" gives a start of "2025-09-01" and an end of
 * "2026-02-20". The from month counts as the sixth month, so the start is
 * five whole months earlier.
 */
export function windowFor(from: string): ScoringWindow {
  const fromDate = parseISODate(from);
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const monthsBack = config.api.scoringWindowMonths - 1;
  const start = new Date(Date.UTC(year, month - monthsBack, 1));
  return {
    start: formatISODate(start),
    end: from,
  };
}

function formatISODate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${monthKey(date)}-${day}`;
}

/*
 * Today's date as YYYY-MM-DD, in UTC. The backend uses UTC, so the viewer's
 * local time zone must not change the day here.
 */
export function todayAsIsoDate(): string {
  return formatISODate(new Date());
}

/*
 * True for a real date written as YYYY-MM-DD. Formatting the parsed date and
 * comparing it to the input catches both bad formats and days that don't
 * exist, because 2026-02-31 comes back as a date in March.
 */
export function isIsoDate(value: string): boolean {
  return formatISODate(parseISODate(value)) === value;
}
