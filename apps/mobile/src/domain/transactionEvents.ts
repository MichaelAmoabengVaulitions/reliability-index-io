import type { Transaction, TransactionEvent } from '@/api/schemas';

// A live event together with the id the stream sent it with.
export interface LiveEvent {
  id: string;
  event: TransactionEvent;
}

interface DateRange {
  start: string;
  end: string;
}

/*
 * Applies live events in order and returns a new list. Applying the same
 * event twice gives the same result, so a replayed event changes nothing.
 * A Map keeps the list order, so a changed transaction stays where it was.
 */
export function applyTransactionEvents(
  transactions: Transaction[],
  events: TransactionEvent[],
): Transaction[] {
  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  for (const event of events) {
    if (event.type === 'TRANSACTION_DELETED') {
      if (event.transaction_id !== undefined) transactionsById.delete(event.transaction_id);
    } else if (event.transaction !== undefined) {
      transactionsById.set(event.transaction.id, event.transaction);
    }
  }
  return [...transactionsById.values()];
}

/*
 * Returns the event to apply for a scoring window, or undefined to ignore it.
 * A change that moves a transaction out of the window becomes a delete, so the
 * old copy doesn't stay in the list.
 */
export function fitEventToWindow(
  event: TransactionEvent,
  scoringWindow: DateRange,
): TransactionEvent | undefined {
  if (event.type === 'TRANSACTION_DELETED') return event;
  if (event.transaction === undefined) return undefined;

  const { id, date } = event.transaction;
  if (date >= scoringWindow.start && date <= scoringWindow.end) return event;
  if (event.type === 'TRANSACTION_UPDATED') {
    return { type: 'TRANSACTION_DELETED', transaction_id: id };
  }
  return undefined;
}

// The stream replays the same events each time it reconnects, so seen ids are left out.
export function onlyNewEvents(knownEvents: LiveEvent[], incomingEvents: LiveEvent[]): LiveEvent[] {
  const seenIds = new Set(knownEvents.map(({ id }) => id));
  return incomingEvents.filter(({ id }) => {
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

// Leaves out events that would change nothing, such as a delete of a transaction we don't have.
export function onlyChangingEvents(
  transactions: Transaction[],
  liveEvents: LiveEvent[],
): LiveEvent[] {
  const knownIds = new Set(transactions.map(({ id }) => id));
  return liveEvents.filter(({ event }) => {
    if (event.type === 'TRANSACTION_DELETED') {
      return event.transaction_id !== undefined && knownIds.delete(event.transaction_id);
    }
    if (event.transaction === undefined) return false;
    knownIds.add(event.transaction.id);
    return true;
  });
}
