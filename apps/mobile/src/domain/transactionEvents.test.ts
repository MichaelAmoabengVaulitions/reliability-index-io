import type { Transaction, TransactionEvent } from '@reliability-index/core/api/schemas';

import { applyTransactionEvents } from './transactionEvents';

function buildTransaction(changes: Partial<Transaction>): Transaction {
  return {
    id: 'tx_1',
    account_id: 'account_1',
    user_id: 'user_1001',
    amount: -12.5,
    currency: 'EUR',
    date: '2026-10-01',
    description: 'GROCERIES',
    merchant_category_code: '5411',
    merchant_name: 'Bio Company',
    type: 'debit',
    synced_at: '2026-10-02T08:00:00Z',
    ...changes,
  };
}

const first = buildTransaction({ id: 'tx_1', amount: 100 });
const second = buildTransaction({ id: 'tx_2', amount: -50 });

function ids(transactions: Transaction[]): string[] {
  return transactions.map(({ id }) => id);
}

describe('applyTransactionEvents', () => {
  it('adds a new transaction to the end of the list', () => {
    const result = applyTransactionEvents(
      [first],
      [{ type: 'TRANSACTION_ADDED', transaction: second }],
    );
    expect(result).toEqual([first, second]);
  });

  it('replaces a changed transaction where it is', () => {
    const changed = buildTransaction({ id: 'tx_1', amount: 999 });
    const result = applyTransactionEvents(
      [first, second],
      [{ type: 'TRANSACTION_UPDATED', transaction: changed }],
    );
    expect(result).toEqual([changed, second]);
  });

  it('adds a changed transaction it did not have yet', () => {
    const result = applyTransactionEvents(
      [first],
      [{ type: 'TRANSACTION_UPDATED', transaction: second }],
    );
    expect(ids(result)).toEqual(['tx_1', 'tx_2']);
  });

  it('removes a deleted transaction', () => {
    const result = applyTransactionEvents(
      [first, second],
      [{ type: 'TRANSACTION_DELETED', transaction_id: 'tx_1' }],
    );
    expect(ids(result)).toEqual(['tx_2']);
  });

  it('gives the same result when the same event is applied twice', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: second };
    const once = applyTransactionEvents([first], [event]);
    expect(applyTransactionEvents(once, [event])).toEqual(once);
  });

  it('leaves the list alone for an unknown delete or an event with nothing in it', () => {
    const result = applyTransactionEvents(
      [first],
      [
        { type: 'TRANSACTION_DELETED', transaction_id: 'tx_unknown' },
        { type: 'TRANSACTION_DELETED' },
        { type: 'TRANSACTION_ADDED' },
      ],
    );
    expect(result).toEqual([first]);
  });

  it('does not change the list it was given', () => {
    const transactions = [first];
    applyTransactionEvents(transactions, [{ type: 'TRANSACTION_ADDED', transaction: second }]);
    expect(transactions).toEqual([first]);
  });
});
