import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isIsoDate, scoringWindowFor, todayInUtc } from './window';

describe('scoringWindowFor', () => {
  it('starts on the first day of the oldest of six months and ends on the end date', () => {
    expect(scoringWindowFor('2026-02-20')).toEqual({ start: '2025-09-01', end: '2026-02-20' });
  });

  it('sets the start to the first of the month', () => {
    expect(scoringWindowFor('2026-03-15')).toEqual({ start: '2025-10-01', end: '2026-03-15' });
  });

  it('handles a window that crosses into the previous year', () => {
    expect(scoringWindowFor('2026-01-01')).toEqual({ start: '2025-08-01', end: '2026-01-01' });
  });

  it('handles a window inside one year', () => {
    expect(scoringWindowFor('2026-10-31')).toEqual({ start: '2026-05-01', end: '2026-10-31' });
  });
});

describe('todayInUtc', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's UTC date as YYYY-MM-DD", () => {
    vi.setSystemTime(new Date('2026-05-19T14:30:00.000Z'));
    expect(todayInUtc()).toBe('2026-05-19');
  });

  it('uses the UTC day when local time is still on the previous day', () => {
    // 23:30 in New York on 1 March is already 2 March in UTC.
    vi.setSystemTime(new Date('2026-03-01T23:30:00-05:00'));
    expect(todayInUtc()).toBe('2026-03-02');
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
