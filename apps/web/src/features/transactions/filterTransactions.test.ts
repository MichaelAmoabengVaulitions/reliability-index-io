import { describe, expect, it } from 'vitest';

import { buildTransaction } from '@/test-utils/fixtures/transactions';

import { applyTransactionFilters } from './filterTransactions';

const sample = [
  buildTransaction({
    id: 'tx_1',
    merchant_category_code: '5411',
    merchant_name: 'Amazon Fresh',
    amount: -50,
    date: '2026-01-15',
  }),
  buildTransaction({
    id: 'tx_2',
    merchant_category_code: '4900',
    merchant_name: 'Energy Co',
    amount: -120,
    date: '2026-02-10',
  }),
  buildTransaction({
    id: 'tx_3',
    merchant_category_code: '5411',
    merchant_name: 'Whole Foods',
    amount: -80,
    date: '2025-12-05',
  }),
  buildTransaction({
    id: 'tx_4',
    merchant_category_code: '6011',
    merchant_name: 'Employer',
    amount: 3000,
    date: '2026-01-01',
  }),
];

describe('applyTransactionFilters', () => {
  it('returns the input unchanged in length when no filters are passed', () => {
    expect(applyTransactionFilters(sample)).toHaveLength(4);
  });

  it('returns only positive amounts when sign is inflow', () => {
    const result = applyTransactionFilters(sample, { sign: 'inflow' });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('tx_4');
  });

  it('returns only negative amounts when sign is outflow', () => {
    const result = applyTransactionFilters(sample, { sign: 'outflow' });
    expect(result).toHaveLength(3);
    expect(result.every((tx) => tx.amount < 0)).toBe(true);
  });

  it('filters by a single category code', () => {
    const result = applyTransactionFilters(sample, { categoryCodes: ['5411'] });
    expect(result).toHaveLength(2);
    expect(result.every((tx) => tx.merchant_category_code === '5411')).toBe(true);
  });

  it('filters by multiple category codes using OR semantics', () => {
    const result = applyTransactionFilters(sample, { categoryCodes: ['5411', '4900'] });
    expect(result).toHaveLength(3);
  });

  it('searches merchant name case-insensitively as a substring', () => {
    const result = applyTransactionFilters(sample, { search: 'amaz' });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('tx_1');
  });

  it('sorts by amount descending', () => {
    const result = applyTransactionFilters(sample, {
      sort: { field: 'amount', direction: 'desc' },
    });
    expect(result[0]?.amount).toBe(3000);
    expect(result[3]?.amount).toBe(-120);
  });

  it('sorts by date ascending even when input is shuffled', () => {
    const result = applyTransactionFilters(sample, {
      sort: { field: 'date', direction: 'asc' },
    });
    expect(result.map((tx) => tx.date)).toEqual([
      '2025-12-05',
      '2026-01-01',
      '2026-01-15',
      '2026-02-10',
    ]);
  });

  it('composes category + sign + sort together', () => {
    const result = applyTransactionFilters(sample, {
      sign: 'outflow',
      categoryCodes: ['5411'],
      sort: { field: 'amount', direction: 'asc' },
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('tx_3'); // -80 comes before -50 in ascending order
    expect(result[1]?.id).toBe('tx_1');
  });

  it('ignores spaces at the start and end of the search', () => {
    const result = applyTransactionFilters(sample, { search: '  amaz ' });
    expect(result.map((tx) => tx.id)).toEqual(['tx_1']);
  });

  it('treats a search of only spaces as no search', () => {
    expect(applyTransactionFilters(sample, { search: '   ' })).toHaveLength(4);
  });

  it('keeps rows with the same value in the same order, whatever order they arrive in', () => {
    const first = buildTransaction({ id: 'tx_a', date: '2026-01-01' });
    const second = buildTransaction({ id: 'tx_b', date: '2026-01-01' });
    const sort = { field: 'date', direction: 'desc' } as const;

    const forwards = applyTransactionFilters([first, second], { sort });
    const backwards = applyTransactionFilters([second, first], { sort });

    expect(forwards.map((tx) => tx.id)).toEqual(['tx_a', 'tx_b']);
    expect(backwards.map((tx) => tx.id)).toEqual(['tx_a', 'tx_b']);
  });

  it('does not mutate the input array', () => {
    const original = [...sample];
    applyTransactionFilters(sample, { sort: { field: 'amount', direction: 'desc' } });
    expect(sample).toEqual(original);
  });
});
