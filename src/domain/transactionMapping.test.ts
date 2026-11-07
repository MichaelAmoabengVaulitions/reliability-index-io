import type { Transaction as ApiTransaction } from '@/api/schemas';

import { toTransactions } from './transactionMapping';

const salary: ApiTransaction = {
  id: 'tx_1',
  account_id: 'account_1',
  user_id: 'user_1001',
  amount: 3200,
  currency: 'EUR',
  date: '2026-10-25',
  description: 'SALARY OCTOBER',
  merchant_category_code: '9001',
  merchant_name: 'Acme GmbH',
  type: 'credit',
  synced_at: '2026-10-26T08:00:00Z',
};

describe('toTransactions', () => {
  it('keeps what the list shows, with the category name from the backend', () => {
    const categories = [{ code: '9001', name: 'Payroll / Salary', group: 'income' }];
    expect(toTransactions([salary], categories)).toEqual([
      {
        id: 'tx_1',
        date: '2026-10-25',
        merchantName: 'Acme GmbH',
        category: 'Payroll / Salary',
        amount: 3200,
      },
    ]);
  });

  it('shows the category code when the backend has no name for it', () => {
    expect(toTransactions([salary], [])[0].category).toBe('9001');
  });

  it('shows the category code while the names have not loaded', () => {
    expect(toTransactions([salary], undefined)[0].category).toBe('9001');
  });
});
