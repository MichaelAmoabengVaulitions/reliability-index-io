import { describeScoringWindow, formatDate, monthLabelsInScoringWindow } from './scoringWindow';

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

describe('formatDate', () => {
  it('shows the year, the same way the scoring window does', () => {
    expect(formatDate('2026-10-01')).toBe('Oct 1, 2026');
  });
});
