import { config } from '@/config';

// The scoring window and today's date are shared, in @reliability-index/core/scoring/window.

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
