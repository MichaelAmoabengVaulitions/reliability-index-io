import type { Transaction, TransactionEvent } from '@reliability-index/core/api/schemas';

/*
 * Transactions are kept in two parts: byId, to find one straight away by its
 * id, and allIds, to remember the order they should appear in.
 */
export interface TransactionState {
  byId: Record<string, Transaction>;
  allIds: string[];
}

/*
 * Applies one live update event to the current set of transactions and
 * returns a new set. It never changes the set passed in. Applying the same
 * event a second time gives the same result as the first, so if the
 * connection drops and the backend re-sends an event, nothing is doubled or
 * lost.
 */
export function applyTransactionEvent(
  state: TransactionState,
  event: TransactionEvent,
): TransactionState {
  if (event.type === 'TRANSACTION_DELETED') {
    return applyDeleted(state, event.transaction_id);
  }
  return applyUpsert(state, event.transaction);
}

/*
 * Applies a list of live update events to a starting state, in order, and
 * returns the result. The starting state is never changed. The lookup is
 * copied once for the whole list, so a large batch stays cheap.
 */
export function applyTransactionEvents(
  state: TransactionState,
  events: readonly TransactionEvent[],
): TransactionState {
  if (events.length === 0) return state;

  const byId = { ...state.byId };
  const addedIds: string[] = [];
  for (const event of events) {
    if (event.type === 'TRANSACTION_DELETED') {
      if (event.transaction_id !== undefined) delete byId[event.transaction_id];
    } else if (event.transaction !== undefined) {
      addedIds.push(event.transaction.id);
      byId[event.transaction.id] = event.transaction;
    }
  }

  const allIds = new Set([...state.allIds, ...addedIds]);
  return { byId, allIds: [...allIds].filter((id) => id in byId) };
}

/*
 * The rules for which live events to apply (replays, changes that do nothing,
 * the scoring window) are shared, in @reliability-index/core/live/transactionEvents.
 * Applying them stays here because this app stores transactions as byId and allIds.
 */

function applyDeleted(state: TransactionState, idToRemove: string | undefined): TransactionState {
  if (idToRemove === undefined || !(idToRemove in state.byId)) {
    // Returning the very same object lets callers tell quickly that nothing changed.
    return state;
  }
  const nextById = { ...state.byId };
  delete nextById[idToRemove];
  return {
    byId: nextById,
    allIds: state.allIds.filter((existing) => existing !== idToRemove),
  };
}

function applyUpsert(
  state: TransactionState,
  transaction: Transaction | undefined,
): TransactionState {
  /*
   * The transaction can be missing (every event type marks it as optional),
   * so we check for it before using it.
   */
  if (transaction === undefined) {
    return state;
  }
  const alreadyKnown = transaction.id in state.byId;
  return {
    byId: { ...state.byId, [transaction.id]: transaction },
    allIds: alreadyKnown ? state.allIds : [...state.allIds, transaction.id],
  };
}

export function toState(transactions: Transaction[]): TransactionState {
  const byId: Record<string, Transaction> = {};
  const allIds: string[] = [];
  for (const tx of transactions) {
    if (!(tx.id in byId)) {
      allIds.push(tx.id);
    }
    byId[tx.id] = tx;
  }
  return { byId, allIds };
}

export function fromState(state: TransactionState): Transaction[] {
  const result: Transaction[] = [];
  for (const id of state.allIds) {
    const tx = state.byId[id];
    if (tx !== undefined) {
      result.push(tx);
    }
  }
  return result;
}
