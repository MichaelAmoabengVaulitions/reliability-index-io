import { describe, expect, it } from 'vitest';

import { buildTransaction } from '@/test-utils/fixtures/transactions';

import { aggregateCashflow } from './aggregateCashflow';

describe('aggregateCashflow', () => {
  it('returns an empty array when given no transactions', () => {
    expect(aggregateCashflow([])).toEqual([]);
  });

  it('aggregates a single positive transaction into one inflow-only entry', () => {
    const result = aggregateCashflow([
      buildTransaction({ id: 'tx_1', date: '2026-03-10', amount: 500 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.monthKey).toBe('2026-03');
    expect(result[0]?.inflow).toBe(500);
    expect(result[0]?.outflow).toBe(0);
    expect(result[0]?.net).toBe(500);
  });

  it('sums positives and absolute values of negatives in the same month', () => {
    const result = aggregateCashflow([
      buildTransaction({ id: 'tx_1', date: '2026-03-05', amount: 1000 }),
      buildTransaction({ id: 'tx_2', date: '2026-03-15', amount: -300 }),
      buildTransaction({ id: 'tx_3', date: '2026-03-20', amount: -150 }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.inflow).toBe(1000);
    expect(result[0]?.outflow).toBe(450);
    expect(result[0]?.net).toBe(550);
  });

  it('sorts the months oldest first even when the input is shuffled', () => {
    const result = aggregateCashflow([
      buildTransaction({ id: 'tx_1', date: '2026-03-15', amount: 100 }),
      buildTransaction({ id: 'tx_2', date: '2026-01-20', amount: 200 }),
      buildTransaction({ id: 'tx_3', date: '2026-02-05', amount: 300 }),
    ]);
    expect(result.map((entry) => entry.monthKey)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('zero-fills months in the middle of the window that have no transactions', () => {
    const result = aggregateCashflow(
      [
        buildTransaction({ id: 'tx_1', date: '2026-01-15', amount: 200 }),
        buildTransaction({ id: 'tx_2', date: '2026-03-15', amount: 300 }),
      ],
      { from: '2026-01-01', to: '2026-03-31' },
    );
    expect(result).toHaveLength(3);
    expect(result[1]?.monthKey).toBe('2026-02');
    expect(result[1]?.inflow).toBe(0);
    expect(result[1]?.outflow).toBe(0);
    expect(result[1]?.net).toBe(0);
  });
});
