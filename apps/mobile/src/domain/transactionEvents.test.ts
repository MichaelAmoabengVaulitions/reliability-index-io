import type { Transaction, TransactionEvent } from '@reliability-index/core/api/schemas';

import {
  applyTransactionEvents,
  fitEventToWindow,
  onlyChangingEvents,
  onlyNewEvents,
  type LiveEvent,
} from './transactionEvents';

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

describe('fitEventToWindow', () => {
  const scoringWindow = { start: '2025-09-01', end: '2026-02-20' };
  const inside = buildTransaction({ date: '2026-01-10' });
  const outside = buildTransaction({ date: '2026-03-01' });

  it('keeps an event dated inside the window', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: inside };
    expect(fitEventToWindow(event, scoringWindow)).toBe(event);
  });

  it('counts the first and last days as inside the window', () => {
    const firstDay = buildTransaction({ date: scoringWindow.start });
    const lastDay = buildTransaction({ date: scoringWindow.end });
    expect(
      fitEventToWindow({ type: 'TRANSACTION_ADDED', transaction: firstDay }, scoringWindow),
    ).toBeDefined();
    expect(
      fitEventToWindow({ type: 'TRANSACTION_ADDED', transaction: lastDay }, scoringWindow),
    ).toBeDefined();
  });

  it('drops a new transaction dated outside the window', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: outside };
    expect(fitEventToWindow(event, scoringWindow)).toBeUndefined();
  });

  it('turns a change that moves a transaction out of the window into a delete', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_UPDATED', transaction: outside };
    expect(fitEventToWindow(event, scoringWindow)).toEqual({
      type: 'TRANSACTION_DELETED',
      transaction_id: 'tx_1',
    });
  });

  it('keeps a delete, which has no date to check', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_DELETED', transaction_id: 'tx_1' };
    expect(fitEventToWindow(event, scoringWindow)).toBe(event);
  });

  it('drops an add or change with no transaction in it', () => {
    expect(fitEventToWindow({ type: 'TRANSACTION_ADDED' }, scoringWindow)).toBeUndefined();
    expect(fitEventToWindow({ type: 'TRANSACTION_UPDATED' }, scoringWindow)).toBeUndefined();
  });
});

describe('onlyNewEvents', () => {
  const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: second };

  it('keeps events it has not seen', () => {
    const incoming = [{ id: '2', event }];
    expect(onlyNewEvents([{ id: '1', event }], incoming)).toEqual(incoming);
  });

  it('drops events that were already applied', () => {
    expect(onlyNewEvents([{ id: '1', event }], [{ id: '1', event }])).toEqual([]);
  });

  it('drops a repeat inside the same batch', () => {
    expect(
      onlyNewEvents(
        [],
        [
          { id: '1', event },
          { id: '1', event },
        ],
      ),
    ).toHaveLength(1);
  });
});

describe('onlyChangingEvents', () => {
  const added: LiveEvent = { id: '1', event: { type: 'TRANSACTION_ADDED', transaction: second } };
  const deleted: LiveEvent = {
    id: '2',
    event: { type: 'TRANSACTION_DELETED', transaction_id: 'tx_2' },
  };

  it('keeps adds and changes', () => {
    const changed: LiveEvent = {
      id: '3',
      event: { type: 'TRANSACTION_UPDATED', transaction: first },
    };
    expect(onlyChangingEvents([first], [added, changed])).toEqual([added, changed]);
  });

  it('keeps a delete of a transaction in the list', () => {
    expect(onlyChangingEvents([second], [deleted])).toEqual([deleted]);
  });

  it('drops a delete of a transaction not in the list', () => {
    expect(onlyChangingEvents([first], [deleted])).toEqual([]);
  });

  it('keeps a delete of a transaction added earlier in the same batch', () => {
    expect(onlyChangingEvents([], [added, deleted])).toEqual([added, deleted]);
  });

  it('drops a second delete of the same transaction', () => {
    const repeat = { ...deleted, id: '3' };
    expect(onlyChangingEvents([second], [deleted, repeat])).toEqual([deleted]);
  });

  it('drops events with nothing in them', () => {
    const empty: LiveEvent = { id: '4', event: { type: 'TRANSACTION_ADDED' } };
    const noId: LiveEvent = { id: '5', event: { type: 'TRANSACTION_DELETED' } };
    expect(onlyChangingEvents([first], [empty, noId])).toEqual([]);
  });
});
