import { describe, expect, it } from 'vitest';

import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  it('exposes a stable root key that other keys extend', () => {
    expect(queryKeys.all).toEqual(['reliability']);
  });

  it('has a key for the discovery response', () => {
    expect(queryKeys.discovery).toEqual(['reliability', 'discovery']);
  });

  it('has a key for the merchant categories', () => {
    expect(queryKeys.merchantCategories).toEqual(['reliability', 'merchant-categories']);
  });

  it('builds a reliability key from the user id and the window start date', () => {
    expect(queryKeys.reliability('user_1001', '2026-02-20')).toEqual([
      'reliability',
      'score',
      'user_1001',
      '2026-02-20',
    ]);
  });

  it('builds a transactions key from the user id and the from/to window', () => {
    expect(queryKeys.transactions('user_1001', '2025-09-01', '2026-02-20')).toEqual([
      'reliability',
      'transactions',
      'user_1001',
      '2025-09-01',
      '2026-02-20',
    ]);
  });

  it('produces a different key when any input differs, so the cache treats them as separate queries', () => {
    const a = queryKeys.reliability('user_1001', '2026-02-20');
    const b = queryKeys.reliability('user_1002', '2026-02-20');
    const c = queryKeys.reliability('user_1001', '2026-02-21');
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });
});
