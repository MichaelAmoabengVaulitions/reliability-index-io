import type { TransactionEvent } from '../api/schemas';
import type { ScoringWindow } from '../scoring/window';

// A live event together with the id the stream sent it with.
export interface LiveEvent {
  id: string;
  event: TransactionEvent;
}

/*
 * Returns the event to apply for a scoring window, or undefined to ignore it.
 * A change that moves a transaction out of the window becomes a delete, so the
 * old copy doesn't stay in the list.
 */
export function fitEventToWindow(
  event: TransactionEvent,
  scoringWindow: ScoringWindow,
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

/*
 * The stream replays the same events each time it reconnects, so anything
 * with an id already applied is left out, including a repeat in the same batch.
 */
export function onlyNewEvents(
  knownEvents: readonly LiveEvent[],
  incomingEvents: readonly LiveEvent[],
): LiveEvent[] {
  const seenIds = new Set(knownEvents.map(({ id }) => id));
  return incomingEvents.filter(({ id }) => {
    if (seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
}

/*
 * Leaves out events that would change nothing, such as a delete of a
 * transaction we don't have, so a count of live updates only counts what can
 * be seen. knownIds are the ids of the transactions held now.
 */
export function onlyChangingEvents(
  knownIds: Iterable<string>,
  liveEvents: readonly LiveEvent[],
): LiveEvent[] {
  const ids = new Set(knownIds);
  return liveEvents.filter(({ event }) => {
    if (event.type === 'TRANSACTION_DELETED') {
      return event.transaction_id !== undefined && ids.delete(event.transaction_id);
    }
    if (event.transaction === undefined) return false;
    ids.add(event.transaction.id);
    return true;
  });
}
