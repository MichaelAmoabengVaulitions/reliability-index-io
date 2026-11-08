import { describe, expect, it } from 'vitest';

import { readDriverPoints } from './drivers';

describe('readDriverPoints', () => {
  it('splits the wording from added points', () => {
    expect(readDriverPoints('Savings behavior detected (+13 pts)')).toEqual({
      label: 'Savings behavior detected',
      points: 13,
    });
  });

  it('reads points taken away', () => {
    expect(readDriverPoints('Estimated 54 negative balance day(s) (-10 pts)')).toEqual({
      label: 'Estimated 54 negative balance day(s)',
      points: -10,
    });
  });

  it('reads part points and zero points', () => {
    expect(readDriverPoints('Savings behavior detected (+2.5 pts)').points).toBe(2.5);
    expect(readDriverPoints('Neutral driver (0 pts)').points).toBe(0);
  });

  it('leaves out points for a line without any', () => {
    expect(readDriverPoints(' Income present in 5/6 months ')).toEqual({
      label: 'Income present in 5/6 months',
    });
  });

  it('does not mistake a ratio for points', () => {
    expect(readDriverPoints('Income covers essential expenses (1.41x)').points).toBeUndefined();
  });

  it('only reads points at the end of the line', () => {
    expect(readDriverPoints('Worth (+5 pts) in the past').points).toBeUndefined();
  });
});
