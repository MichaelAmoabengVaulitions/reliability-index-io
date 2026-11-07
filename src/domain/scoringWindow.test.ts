import {
  describeScoringWindow,
  formatDateForField,
  monthLabelsInScoringWindow,
  scoringWindowDates,
  todayAsDate,
} from './scoringWindow';

describe('scoringWindowDates', () => {
  it('starts on the first day of the oldest month and ends on the end date', () => {
    expect(scoringWindowDates('2026-02-20')).toEqual({ start: '2025-09-01', end: '2026-02-20' });
  });
});

describe('describeScoringWindow', () => {
  it('describes a window inside one year', () => {
    expect(describeScoringWindow('2026-10-31')).toEqual({
      shortLabel: 'May – Oct 2026',
      longLabel: 'May 1 – Oct 31, 2026',
    });
  });

  it('shows both years when the window crosses a new year', () => {
    expect(describeScoringWindow('2026-02-28')).toEqual({
      shortLabel: 'Sep 2025 – Feb 2026',
      longLabel: 'Sep 1, 2025 – Feb 28, 2026',
    });
  });
});

describe('monthLabelsInScoringWindow', () => {
  it('lists the six months, oldest first', () => {
    expect(monthLabelsInScoringWindow('2026-02-28')).toEqual([
      'Sep 2025',
      'Oct 2025',
      'Nov 2025',
      'Dec 2025',
      'Jan 2026',
      'Feb 2026',
    ]);
  });
});

describe('formatDateForField', () => {
  it('shows a date the way the date field does', () => {
    expect(formatDateForField('2026-10-31')).toBe('10/31/2026');
  });
});

describe('todayAsDate', () => {
  afterEach(() => jest.useRealTimers());

  it('uses the UTC date, as the backend does', () => {
    jest.useFakeTimers({ now: new Date('2026-03-01T23:30:00-05:00') });
    expect(todayAsDate()).toBe('2026-03-02');
  });
});
