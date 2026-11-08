import type { Transaction, TransactionEvent } from '@reliability-index/core/api/schemas';

/*
 * The rules for which live events to apply (replays, changes that do nothing,
 * the scoring window) are shared, in @reliability-index/core/live/transactionEvents.
 */

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
