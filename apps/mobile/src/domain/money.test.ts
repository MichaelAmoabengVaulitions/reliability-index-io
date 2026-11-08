import { formatTransactionAmount, formatWholeAmount } from './money';

describe('formatWholeAmount', () => {
  it('shows whole euros with a thousands separator', () => {
    expect(formatWholeAmount(6424)).toBe('€6,424');
  });

  it('marks an overspent amount with a minus sign', () => {
    expect(formatWholeAmount(-1585)).toBe('−€1,585');
  });

  it('rounds to the nearest euro', () => {
    expect(formatWholeAmount(4427.6)).toBe('€4,428');
  });
});

describe('formatTransactionAmount', () => {
  it('marks money in with a plus sign', () => {
    expect(formatTransactionAmount(4200)).toBe('+€4,200.00');
  });

  it('marks money out with a minus sign', () => {
    expect(formatTransactionAmount(-76.13)).toBe('−€76.13');
  });

  it('shows no sign for zero', () => {
    expect(formatTransactionAmount(0)).toBe('€0.00');
  });
});
