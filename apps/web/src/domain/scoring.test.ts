import { describe, expect, it } from 'vitest';

import {
  bandEdgeNote,
  captionForDriver,
  formatCoverageRatio,
  formatPoints,
  parseDriver,
  resilienceBarSpan,
  sortByImpact,
  sumDriverPoints,
} from './scoring';

describe('resilienceBarSpan', () => {
  // The scale runs from -20 to +25, so zero sits 20/45 of the way along.
  it('runs to the right of zero for positive points', () => {
    const span = resilienceBarSpan(11);
    expect(span.leftPercent).toBeCloseTo(44.44, 1);
    expect(span.widthPercent).toBeCloseTo(24.44, 1);
  });

  it('runs to the left of zero for negative points, ending at zero', () => {
    const span = resilienceBarSpan(-16);
    expect(span.leftPercent).toBeCloseTo(8.89, 1);
    expect(span.leftPercent + span.widthPercent).toBeCloseTo(44.44, 1);
  });

  it('has no width at zero points', () => {
    expect(resilienceBarSpan(0).widthPercent).toBe(0);
  });

  it('reaches each end of the scale', () => {
    expect(resilienceBarSpan(-20).leftPercent).toBe(0);
    const top = resilienceBarSpan(25);
    expect(top.leftPercent + top.widthPercent).toBeCloseTo(100);
  });

  it('stays on the scale if the points go past either end', () => {
    expect(resilienceBarSpan(40)).toEqual(resilienceBarSpan(25));
    expect(resilienceBarSpan(-30)).toEqual(resilienceBarSpan(-20));
  });
});

describe('parseDriver', () => {
  it('keeps the wording as it is when there are no points', () => {
    const result = parseDriver('Income present in 5/6 months');
    expect(result.points).toBeUndefined();
    expect(result.label).toBe('Income present in 5/6 months');
    expect(result.raw).toBe('Income present in 5/6 months');
  });

  it.each([
    'Income present in 6/6 months',
    'Income present in 5/6 months',
    'Income present in 3/6 months',
    'Good cashflow months: 3/6',
    'Income covers essential expenses (1.8x)',
    'Strong income coverage: 2.42x essential expenses',
    'Essential payments detected consistently',
  ])('counts "%s" as helping', (driver) => {
    expect(parseDriver(driver).kind).toBe('positive');
  });

  it.each([
    'Income present in 2/6 months',
    'Income present in 0/6 months',
    'Good cashflow months: 2/6',
    'No income or essential expenses detected',
    'Essential payments present but with some gaps',
    'Essential payments inconsistent or sparse',
  ])('counts "%s" as hurting', (driver) => {
    expect(parseDriver(driver).kind).toBe('risk');
  });

  it.each([
    'Some new driver the backend invented',
    'No essential expenses detected, coverage neutral',
    'Nothing to measure yet: 0/0',
  ])('leaves "%s" in the notes rather than guessing', (driver) => {
    expect(parseDriver(driver).kind).toBe('neutral');
  });

  it('lets points decide over the wording', () => {
    expect(parseDriver('Payments inconsistent (+5 pts)').kind).toBe('positive');
  });

  it('parses a positive pts suffix and strips it from the label', () => {
    const result = parseDriver('Savings behavior detected (+13 pts)');
    expect(result.kind).toBe('positive');
    expect(result.points).toBe(13);
    expect(result.label).toBe('Savings behavior detected');
  });

  it('parses a negative pts suffix and strips it from the label', () => {
    const result = parseDriver('Estimated 54 negative balance day(s) (-10 pts)');
    expect(result.kind).toBe('risk');
    expect(result.points).toBe(-10);
    expect(result.label).toBe('Estimated 54 negative balance day(s)');
  });

  it('treats a zero pts suffix as neutral but still extracts the points value', () => {
    const result = parseDriver('Neutral driver (0 pts)');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBe(0);
  });

  it('ignores a pts suffix that is not anchored to the end of the string', () => {
    const result = parseDriver('A (+5 pts) in the middle of the text');
    expect(result.kind).toBe('neutral');
    expect(result.points).toBeUndefined();
  });

  it('reads decimal points', () => {
    const result = parseDriver('Savings behavior detected (+2.5 pts)');
    expect(result.points).toBe(2.5);
    expect(result.label).toBe('Savings behavior detected');
    expect(parseDriver('Late fees (-0.5 pts)').kind).toBe('risk');
  });

  it('tolerates extra whitespace before the suffix', () => {
    const result = parseDriver('Spaced suffix   (+7 pts)');
    expect(result.kind).toBe('positive');
    expect(result.points).toBe(7);
    expect(result.label).toBe('Spaced suffix');
  });
});

describe('bandEdgeNote', () => {
  it.each([
    [81, '6 points above the High cutoff'],
    [76, '1 point above the High cutoff'],
    [100, '25 points above the High cutoff'],
  ])('describes a high score of %i', (score, note) => {
    expect(bandEdgeNote(score)).toBe(note);
  });

  it.each([
    [74, '1 point below High'],
    [64, '11 points below High'],
    [63, '12 points below High'],
    [62, '12 points above Low'],
    [61, '11 points above Low'],
    [51, '1 point above Low'],
  ])('uses the nearest edge for a medium score of %i', (score, note) => {
    expect(bandEdgeNote(score)).toBe(note);
  });

  it.each([
    [49, '1 point below Medium'],
    [15, '35 points below Medium'],
    [0, '50 points below Medium'],
  ])('describes a low score of %i', (score, note) => {
    expect(bandEdgeNote(score)).toBe(note);
  });

  it('says so when the score sits exactly on an edge', () => {
    expect(bandEdgeNote(75)).toBe('Right on the High cutoff');
    expect(bandEdgeNote(50)).toBe('Right on the Medium cutoff');
  });
});

describe('sortByImpact', () => {
  function labels(drivers: string[]): string[] {
    return sortByImpact(drivers.map(parseDriver)).map((driver) => driver.label);
  }

  it('puts the biggest points first, whichever their sign', () => {
    expect(labels(['Small (-1 pts)', 'Large (-10 pts)', 'Middle (+5 pts)'])).toEqual([
      'Large',
      'Middle',
      'Small',
    ]);
  });

  it('puts reasons with no points last, in their original order', () => {
    expect(labels(['First note', 'Scored (+1 pts)', 'Second note'])).toEqual([
      'Scored',
      'First note',
      'Second note',
    ]);
  });

  it('does not change the list it is given', () => {
    const drivers = ['Small (-1 pts)', 'Large (-10 pts)'].map(parseDriver);
    sortByImpact(drivers);
    expect(drivers[0]?.label).toBe('Small');
  });
});

describe('sumDriverPoints', () => {
  it('adds up the points across the drivers that have them', () => {
    const drivers = [
      'Income present in 6/6 months',
      'Savings behavior detected (+21 pts)',
      'Estimated 40 negative balance day(s) (-10 pts)',
      '1 late fee event(s) detected (-1 pts)',
    ];
    expect(sumDriverPoints(drivers)).toBe(10);
  });

  it('is zero when no driver has points', () => {
    expect(sumDriverPoints(['Income present in 0/6 months'])).toBe(0);
    expect(sumDriverPoints([])).toBe(0);
  });
});

describe('formatPoints', () => {
  it('puts a plus on positive points', () => {
    expect(formatPoints(13)).toBe('+13 pts');
  });

  it('keeps the minus on negative points', () => {
    expect(formatPoints(-10)).toBe('-10 pts');
  });

  it('shows zero with no sign', () => {
    expect(formatPoints(0)).toBe('0 pts');
  });
});

describe('formatCoverageRatio', () => {
  it('formats a number as a ratio with two decimals and an x suffix', () => {
    expect(formatCoverageRatio(1.41)).toBe('1.41x');
  });

  it('rounds to two decimals', () => {
    expect(formatCoverageRatio(2.034)).toBe('2.03x');
  });

  it('shows a dash when the ratio is null, which means the user has no essential expenses', () => {
    expect(formatCoverageRatio(null)).toBe('—');
  });
});

describe('captionForDriver', () => {
  it('captions an income regularity driver', () => {
    expect(captionForDriver('Income present in 5/6 months')).toBe(
      'How regularly income arrived during the window.',
    );
  });

  it('captions an income coverage driver', () => {
    expect(captionForDriver('Strong income coverage: 2.03x essential expenses')).toBe(
      'Whether income was enough to cover the essential bills.',
    );
  });

  it('captions the no-essential-expenses coverage driver', () => {
    expect(captionForDriver('No essential expenses detected, coverage neutral')).toBe(
      'Whether income was enough to cover the essential bills.',
    );
  });

  it('captions an essential payments driver', () => {
    expect(captionForDriver('Essential payments detected consistently')).toBe(
      'Whether essential bills were paid on a regular schedule.',
    );
  });

  it('captions a savings driver', () => {
    expect(captionForDriver('Savings behavior detected (+13 pts)')).toBe(
      'Money regularly set aside.',
    );
  });

  it('captions a negative balance driver', () => {
    expect(captionForDriver('Estimated 54 negative balance day(s) (-10 pts)')).toBe(
      'Days the account was overdrawn.',
    );
  });

  it('captions a late fee driver', () => {
    expect(captionForDriver('1 late fee event(s) detected (-1 pts)')).toBe(
      'Charges for paying a bill late.',
    );
  });

  it('captions a cashflow months driver', () => {
    expect(captionForDriver('Good cashflow months: 4/6')).toBe(
      'Months that ended in good financial shape.',
    );
  });

  it('captions a high-risk spending driver', () => {
    expect(captionForDriver('High-risk category spending detected (-3 pts)')).toBe(
      'Spending in higher-risk categories.',
    );
  });

  it('returns undefined for a driver it cannot place, so no caption is shown', () => {
    expect(captionForDriver('Some new driver the backend invented')).toBeUndefined();
  });
});
