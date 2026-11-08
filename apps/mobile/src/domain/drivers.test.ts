import { parseDriver } from './drivers';

describe('parseDriver', () => {
  it('splits the wording from added points', () => {
    expect(parseDriver('Savings behavior detected (+13 pts)')).toEqual({
      label: 'Savings behavior detected',
      points: 13,
    });
  });

  it('reads points taken away', () => {
    expect(parseDriver('Estimated 54 negative balance day(s) (-10 pts)')).toEqual({
      label: 'Estimated 54 negative balance day(s)',
      points: -10,
    });
  });

  it('reads part points', () => {
    expect(parseDriver('Savings behavior detected (+2.5 pts)').points).toBe(2.5);
  });

  it('gives no points to a line without any', () => {
    expect(parseDriver('Income present in 5/6 months')).toEqual({
      label: 'Income present in 5/6 months',
      points: 0,
    });
  });

  it('does not mistake a ratio for points', () => {
    expect(parseDriver('Income covers essential expenses (1.41x)').points).toBe(0);
  });

  it('only reads points at the end of the line', () => {
    expect(parseDriver('Worth (+5 pts) in the past').points).toBe(0);
  });
});
