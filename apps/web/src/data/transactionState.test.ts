import { describe, expect, it } from 'vitest';

import type { TransactionEvent } from '@/api/schemas';
import { buildTransaction, buildTransactions } from '@/test-utils/fixtures/transactions';

import {
  applyTransactionEvent,
  applyTransactionEvents,
  fitEventToWindow,
  fromState,
  onlyChangingEvents,
  onlyNewEvents,
  toState,
} from './transactionState';

const txOne = buildTransaction({ id: 'tx_1', amount: 100 });
const txTwo = buildTransaction({ id: 'tx_2', amount: -50 });

describe('applyTransactionEvent', () => {
  it('appends a new id to allIds and stores the entry in byId on TRANSACTION_ADDED', () => {
    const next = applyTransactionEvent(toState([txOne]), {
      type: 'TRANSACTION_ADDED',
      transaction: txTwo,
    });
    expect(next.allIds).toEqual(['tx_1', 'tx_2']);
    expect(next.byId.tx_2).toBe(txTwo);
  });

  it('replaces byId but does not duplicate allIds when ADDED arrives for an existing id', () => {
    const updated = buildTransaction({ id: 'tx_1', amount: 999 });
    const next = applyTransactionEvent(toState([txOne]), {
      type: 'TRANSACTION_ADDED',
      transaction: updated,
    });
    expect(next.allIds).toEqual(['tx_1']);
    expect(next.byId.tx_1?.amount).toBe(999);
  });

  it('replaces byId and leaves allIds unchanged on UPDATED for an existing id', () => {
    const updated = buildTransaction({ id: 'tx_2', amount: -75 });
    const next = applyTransactionEvent(toState([txOne, txTwo]), {
      type: 'TRANSACTION_UPDATED',
      transaction: updated,
    });
    expect(next.allIds).toEqual(['tx_1', 'tx_2']);
    expect(next.byId.tx_2?.amount).toBe(-75);
  });

  it('adds the transaction when UPDATED arrives for an unknown id', () => {
    const next = applyTransactionEvent(toState([txOne]), {
      type: 'TRANSACTION_UPDATED',
      transaction: txTwo,
    });
    expect(next.allIds).toEqual(['tx_1', 'tx_2']);
    expect(next.byId.tx_2).toBe(txTwo);
  });

  it('removes the id from allIds and byId on DELETED for an existing id', () => {
    const next = applyTransactionEvent(toState([txOne, txTwo]), {
      type: 'TRANSACTION_DELETED',
      transaction_id: 'tx_1',
    });
    expect(next.allIds).toEqual(['tx_2']);
    expect(next.byId.tx_1).toBeUndefined();
  });

  it('returns the same state object on DELETED for an unknown id', () => {
    const state = toState([txOne]);
    const next = applyTransactionEvent(state, {
      type: 'TRANSACTION_DELETED',
      transaction_id: 'tx_does_not_exist',
    });
    expect(next).toBe(state);
  });

  it('does not mutate the input state', () => {
    const state = toState([txOne]);
    const snapshot = JSON.stringify(state);
    applyTransactionEvent(state, { type: 'TRANSACTION_ADDED', transaction: txTwo });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('applying the same event twice gives the same result as applying it once', () => {
    const state = toState([txOne]);
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: txTwo };
    const once = applyTransactionEvent(state, event);
    const twice = applyTransactionEvent(once, event);
    expect(twice).toEqual(once);
  });

  it('handles a long sequence of mixed events without losing track of ids', () => {
    const initial = buildTransactions(1000);
    let state = toState(initial);
    const addedCount = 30;
    const deletedCount = 10;

    for (let i = 0; i < addedCount; i++) {
      state = applyTransactionEvent(state, {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: `tx_new_${i}` }),
      });
    }
    for (let i = 0; i < deletedCount; i++) {
      state = applyTransactionEvent(state, {
        type: 'TRANSACTION_DELETED',
        transaction_id: initial[i]?.id ?? '',
      });
    }

    expect(state.allIds.length).toBe(1000 + addedCount - deletedCount);
    expect(state.byId['tx_new_0']).toBeDefined();
    expect(state.byId[initial[0]?.id ?? '']).toBeUndefined();
  });
});

describe('applyTransactionEvents', () => {
  it('returns the same state when there are no events', () => {
    const state = toState([txOne]);
    expect(applyTransactionEvents(state, [])).toBe(state);
  });

  it('applies a sequence of events in order', () => {
    const next = applyTransactionEvents(toState([txOne]), [
      { type: 'TRANSACTION_ADDED', transaction: txTwo },
      { type: 'TRANSACTION_DELETED', transaction_id: 'tx_1' },
    ]);
    expect(next.allIds).toEqual(['tx_2']);
    expect(next.byId.tx_1).toBeUndefined();
  });

  it('does not change the input state', () => {
    const state = toState([txOne]);
    const snapshot = JSON.stringify(state);
    applyTransactionEvents(state, [{ type: 'TRANSACTION_ADDED', transaction: txTwo }]);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('keeps one row when a transaction is added, deleted and added again', () => {
    const next = applyTransactionEvents(toState([txOne]), [
      { type: 'TRANSACTION_ADDED', transaction: txTwo },
      { type: 'TRANSACTION_DELETED', transaction_id: 'tx_2' },
      { type: 'TRANSACTION_ADDED', transaction: txTwo },
    ]);
    expect(next.allIds).toEqual(['tx_1', 'tx_2']);
  });

  it('leaves the list as it was for a delete of an unknown id, or an event with nothing in it', () => {
    const next = applyTransactionEvents(toState([txOne]), [
      { type: 'TRANSACTION_DELETED', transaction_id: 'tx_does_not_exist' },
      { type: 'TRANSACTION_DELETED' },
      { type: 'TRANSACTION_ADDED' },
    ]);
    expect(next.allIds).toEqual(['tx_1']);
  });
});

describe('fitEventToWindow', () => {
  const from = '2025-09-01';
  const to = '2026-02-20';
  const inside = buildTransaction({ id: 'tx_1', date: '2026-01-10' });
  const outside = buildTransaction({ id: 'tx_1', date: '2026-03-01' });

  it('keeps an event inside the window as it is', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: inside };
    expect(fitEventToWindow(event, from, to)).toBe(event);
  });

  it('counts the first and last days as inside the window', () => {
    const firstDay = buildTransaction({ date: from });
    const lastDay = buildTransaction({ date: to });
    const added = 'TRANSACTION_ADDED';
    expect(fitEventToWindow({ type: added, transaction: firstDay }, from, to)).toBeDefined();
    expect(fitEventToWindow({ type: added, transaction: lastDay }, from, to)).toBeDefined();
  });

  it('drops a new transaction outside the window', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: outside };
    expect(fitEventToWindow(event, from, to)).toBeUndefined();
  });

  it('turns an update that moves a transaction out of the window into a delete', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_UPDATED', transaction: outside };
    expect(fitEventToWindow(event, from, to)).toEqual({
      type: 'TRANSACTION_DELETED',
      transaction_id: 'tx_1',
    });
  });

  it('keeps a delete, which has no date to check', () => {
    const event: TransactionEvent = { type: 'TRANSACTION_DELETED', transaction_id: 'tx_1' };
    expect(fitEventToWindow(event, from, to)).toBe(event);
  });

  it('drops an add or update with no transaction', () => {
    expect(fitEventToWindow({ type: 'TRANSACTION_ADDED' }, from, to)).toBeUndefined();
    expect(fitEventToWindow({ type: 'TRANSACTION_UPDATED' }, from, to)).toBeUndefined();
  });
});

describe('onlyChangingEvents', () => {
  const added = { id: '1', event: { type: 'TRANSACTION_ADDED', transaction: txTwo } } as const;
  const deleted = {
    id: '2',
    event: { type: 'TRANSACTION_DELETED', transaction_id: 'tx_2' },
  } as const;

  it('keeps an add and an update', () => {
    const updated = {
      id: '3',
      event: { type: 'TRANSACTION_UPDATED', transaction: txOne },
    } as const;
    expect(onlyChangingEvents(toState([txOne]), [added, updated])).toEqual([added, updated]);
  });

  it('keeps a delete of a row we have', () => {
    expect(onlyChangingEvents(toState([txTwo]), [deleted])).toEqual([deleted]);
  });

  it('drops a delete of a row we do not have', () => {
    expect(onlyChangingEvents(toState([txOne]), [deleted])).toEqual([]);
  });

  it('keeps a delete of a row added earlier in the same batch', () => {
    expect(onlyChangingEvents(toState([]), [added, deleted])).toEqual([added, deleted]);
  });

  it('drops a delete that follows another delete of the same row', () => {
    const repeat = { ...deleted, id: '3' };
    expect(onlyChangingEvents(toState([txTwo]), [deleted, repeat])).toEqual([deleted]);
  });

  it('drops an event with nothing in it', () => {
    const empty = { id: '4', event: { type: 'TRANSACTION_ADDED' } } as const;
    const noId = { id: '5', event: { type: 'TRANSACTION_DELETED' } } as const;
    expect(onlyChangingEvents(toState([txOne]), [empty, noId])).toEqual([]);
  });
});

describe('onlyNewEvents', () => {
  const addedEvent: TransactionEvent = { type: 'TRANSACTION_ADDED', transaction: txTwo };

  it('keeps events it has not seen', () => {
    const incoming = [{ id: '2', event: addedEvent }];
    expect(onlyNewEvents([{ id: '1', event: addedEvent }], incoming)).toEqual(incoming);
  });

  it('drops events that were already applied', () => {
    const known = [{ id: '1', event: addedEvent }];
    expect(onlyNewEvents(known, [{ id: '1', event: addedEvent }])).toEqual([]);
  });

  it('drops a repeat inside the same batch', () => {
    const incoming = [
      { id: '1', event: addedEvent },
      { id: '1', event: addedEvent },
    ];
    expect(onlyNewEvents([], incoming)).toHaveLength(1);
  });
});

describe('toState and fromState', () => {
  it('turns a list into the stored form and back into the same list', () => {
    const original = [txOne, txTwo];
    expect(fromState(toState(original))).toEqual(original);
  });
});
