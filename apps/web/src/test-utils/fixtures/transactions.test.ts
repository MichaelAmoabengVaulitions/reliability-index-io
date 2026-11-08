import { describe, expect, it } from 'vitest';

import { transactionSchema } from '@/api/schemas';

import { buildTransactions } from './transactions';

describe('buildTransactions', () => {
  it('returns the requested number of transactions', () => {
    const result = buildTransactions(50);
    expect(result).toHaveLength(50);
  });

  it('produces the same output every time for the same inputs', () => {
    const first = buildTransactions(50, { userId: 'user_1001' });
    const second = buildTransactions(50, { userId: 'user_1001' });
    expect(first).toEqual(second);
  });

  it('produces different output for different user ids', () => {
    const a = buildTransactions(50, { userId: 'user_1001' });
    const b = buildTransactions(50, { userId: 'user_2002' });
    expect(a).not.toEqual(b);
  });

  it('returns transactions that all pass transactionSchema', () => {
    const result = buildTransactions(50);
    for (const tx of result) {
      expect(transactionSchema.safeParse(tx).success).toBe(true);
    }
  });

  it('includes at least one positive credit (salary)', () => {
    const result = buildTransactions(50);
    expect(result.some((tx) => tx.amount > 0)).toBe(true);
  });

  it('does not return the data perfectly sorted by date; the caller must sort', () => {
    const result = buildTransactions(200);
    const sortedByDate = [...result].sort((a, b) => a.date.localeCompare(b.date));
    expect(result).not.toEqual(sortedByDate);
  });

  it('respects a custom from/to window', () => {
    const result = buildTransactions(20, { from: '2025-12-01', to: '2025-12-31' });
    for (const tx of result) {
      expect(tx.date >= '2025-12-01' && tx.date <= '2025-12-31').toBe(true);
    }
  });
});
