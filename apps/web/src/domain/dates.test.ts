import { describe, expect, it } from 'vitest';

import { formatDate, formatMonth, monthKey, parseISODate } from './dates';

describe('formatDate', () => {
  it('writes the date as day, short month and year', () => {
    expect(formatDate('2026-08-28')).toBe('28 Aug 2026');
  });

  it('does not pad a single digit day', () => {
    expect(formatDate('2026-08-03')).toBe('3 Aug 2026');
  });

  it('keeps the calendar date whatever the time zone', () => {
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });
});

describe('parseISODate', () => {
  it('parses a YYYY-MM-DD string as midnight UTC on that day', () => {
    const parsed = parseISODate('2026-02-20');
    expect(parsed.toISOString()).toBe('2026-02-20T00:00:00.000Z');
  });
});

describe('formatMonth', () => {
  it('formats a date as the short month and year', () => {
    expect(formatMonth(new Date('2026-02-20T00:00:00.000Z'))).toBe('Feb 2026');
  });
});

describe('monthKey', () => {
  it('returns the date as a YYYY-MM string', () => {
    expect(monthKey(new Date('2026-02-20T00:00:00.000Z'))).toBe('2026-02');
  });
});
