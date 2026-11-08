import type { TransactionEvent } from '@reliability-index/core/api/schemas';
import { describe, expect, it } from 'vitest';

import { buildTransaction, buildTransactions } from '@/test-utils/fixtures/transactions';

import {
  applyTransactionEvent,
  applyTransactionEvents,
  fromState,
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

describe('toState and fromState', () => {
  it('turns a list into the stored form and back into the same list', () => {
    const original = [txOne, txTwo];
    expect(fromState(toState(original))).toEqual(original);
  });
});
