import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatDate,
  formatMonth,
  isIsoDate,
  monthKey,
  parseISODate,
  todayAsIsoDate,
  windowFor,
} from './dates';

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

describe('isIsoDate', () => {
  it('accepts a real YYYY-MM-DD date', () => {
    expect(isIsoDate('2026-02-20')).toBe(true);
  });

  it('accepts 29 February in a leap year', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects text that is not a date', () => {
    expect(isIsoDate('not-a-date')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('rejects a date in the wrong format', () => {
    expect(isIsoDate('20-02-2026')).toBe(false);
    expect(isIsoDate('2026-2-20')).toBe(false);
  });

  it('rejects a month or day that does not exist', () => {
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-02-31')).toBe(false);
    expect(isIsoDate('2026-02-29')).toBe(false);
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

describe('windowFor', () => {
  it('returns a six-calendar-month window ending at the from date', () => {
    expect(windowFor('2026-02-20')).toEqual({ start: '2025-09-01', end: '2026-02-20' });
  });

  it('sets the start to the first of the month', () => {
    expect(windowFor('2026-03-15')).toEqual({ start: '2025-10-01', end: '2026-03-15' });
  });

  it('handles a window that crosses into the previous year', () => {
    expect(windowFor('2026-01-01')).toEqual({ start: '2025-08-01', end: '2026-01-01' });
  });
});

describe('todayAsIsoDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's UTC date as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date('2026-05-19T14:30:00.000Z'));
    expect(todayAsIsoDate()).toBe('2026-05-19');
  });

  it('uses the UTC calendar day even when local time is on the previous day', () => {
    /*
     * At 2026-05-20 00:30 UTC it is still 2026-05-19 in time zones behind UTC,
     * but the backend uses UTC, so we always return the UTC calendar day.
     */
    vi.setSystemTime(new Date('2026-05-20T00:30:00.000Z'));
    expect(todayAsIsoDate()).toBe('2026-05-20');
  });
});
