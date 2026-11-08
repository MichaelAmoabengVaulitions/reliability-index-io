import { describe, expect, it } from 'vitest';

import type { Transaction, TransactionEvent } from '../api/schemas';

import { fitEventToWindow, onlyChangingEvents, onlyNewEvents, type LiveEvent } from './transactionEvents';

function buildTransaction(changes: Partial<Transaction>): Transaction {
  return {
    id: 'tx_1',
    account_id: 'account_1',
    user_id: 'user_1001',
    amount: -12.5,
    currency: 'EUR',
    date: '2026-01-10',
    description: 'GROCERIES',
    merchant_category_code: '5411',
    merchant_name: 'Bio Company',
    type: 'debit',
    synced_at: '2026-01-11T08:00:00Z',
    ...changes,
  };
}

const first = buildTransaction({ id: 'tx_1', amount: 100 });
const second = buildTransaction({ id: 'tx_2', amount: -50 });

describe('fitEventToWindow', () => {
  const scoringWindow = { start: '2025-09-01', end: '2026-02-20' };
  const inside = buildTransaction({ date: '2026-01-10' });
  const outside = buildTransaction({ date: '2026-03-01' });

  it('keeps an event dated inside the window as it is', () => {
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
    const incoming = [
      { id: '1', event },
      { id: '1', event },
    ];
    expect(onlyNewEvents([], incoming)).toHaveLength(1);
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
    expect(onlyChangingEvents(['tx_1'], [added, changed])).toEqual([added, changed]);
  });

  it('keeps a delete of a transaction we have', () => {
    expect(onlyChangingEvents(['tx_2'], [deleted])).toEqual([deleted]);
  });

  it('drops a delete of a transaction we do not have', () => {
    expect(onlyChangingEvents(['tx_1'], [deleted])).toEqual([]);
  });

  it('keeps a delete of a transaction added earlier in the same batch', () => {
    expect(onlyChangingEvents([], [added, deleted])).toEqual([added, deleted]);
  });

  it('drops a second delete of the same transaction', () => {
    const repeat = { ...deleted, id: '3' };
    expect(onlyChangingEvents(['tx_2'], [deleted, repeat])).toEqual([deleted]);
  });

  it('drops events with nothing in them', () => {
    const empty: LiveEvent = { id: '4', event: { type: 'TRANSACTION_ADDED' } };
    const noId: LiveEvent = { id: '5', event: { type: 'TRANSACTION_DELETED' } };
    expect(onlyChangingEvents(['tx_1'], [empty, noId])).toEqual([]);
  });

  it('does not change the ids it was given', () => {
    const knownIds = new Set(['tx_2']);
    onlyChangingEvents(knownIds, [deleted]);
    expect([...knownIds]).toEqual(['tx_2']);
  });
});
