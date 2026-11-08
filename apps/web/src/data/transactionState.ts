import type { Transaction, TransactionEvent } from '@/api/schemas';

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

/** A live event together with the id the stream sent it with. */
export interface LiveEvent {
  id: string;
  event: TransactionEvent;
}

/*
 * The stream replays the same events each time it reconnects, so anything
 * with an id we've already applied is left out.
 */
export function onlyNewEvents(
  knownEvents: readonly LiveEvent[],
  incomingEvents: readonly LiveEvent[],
): LiveEvent[] {
  const seenIds = new Set(knownEvents.map((liveEvent) => liveEvent.id));
  return incomingEvents.filter((liveEvent) => {
    if (seenIds.has(liveEvent.id)) return false;
    seenIds.add(liveEvent.id);
    return true;
  });
}

/*
 * Leaves out events that wouldn't change anything, like a delete of a row we
 * don't have, so "N live updates" only counts what the analyst can see.
 */
export function onlyChangingEvents(
  state: TransactionState,
  liveEvents: readonly LiveEvent[],
): LiveEvent[] {
  const knownIds = new Set(state.allIds);
  return liveEvents.filter(({ event }) => {
    if (event.type === 'TRANSACTION_DELETED') {
      return event.transaction_id !== undefined && knownIds.delete(event.transaction_id);
    }
    if (event.transaction === undefined) return false;
    knownIds.add(event.transaction.id);
    return true;
  });
}

/*
 * Returns the event to apply for a scoring window, or undefined if it should
 * be ignored. An update that moves a transaction out of the window becomes a
 * delete, because the old copy would otherwise stay in the list.
 */
export function fitEventToWindow(
  event: TransactionEvent,
  from: string,
  to: string,
): TransactionEvent | undefined {
  if (event.type === 'TRANSACTION_DELETED') return event;
  if (event.transaction === undefined) return undefined;

  const { id, date } = event.transaction;
  if (date >= from && date <= to) return event;
  if (event.type === 'TRANSACTION_UPDATED') {
    return { type: 'TRANSACTION_DELETED', transaction_id: id };
  }
  return undefined;
}

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
