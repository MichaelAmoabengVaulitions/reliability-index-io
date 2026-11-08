import { queryOptions } from '@tanstack/react-query';

import {
  fetchAllTransactions,
  fetchDiscovery,
  fetchMerchantCategories,
  fetchReliability,
} from '@/api/client';
import type { Transaction } from '@reliability-index/core/api/schemas';
import { toReliabilityScore } from '@/domain/reliabilityScoreMapping';
import { scoringWindowFor } from '@reliability-index/core/scoring/window';
import type { LiveEvent } from '@reliability-index/core/live/transactionEvents';
import { applyTransactionEvents } from '@/domain/transactionEvents';

/*
 * The fetched transactions with every live event applied, and the log of
 * those events, so fetching again applies them on top instead of losing them.
 */
export interface StoredTransactions {
  transactions: Transaction[];
  liveEvents: LiveEvent[];
}

export const discoveryQuery = queryOptions({
  queryKey: ['reliability', 'discovery'],
  queryFn: fetchDiscovery,
  staleTime: Infinity,
});

export const merchantCategoriesQuery = queryOptions({
  queryKey: ['reliability', 'merchant-categories'],
  queryFn: fetchMerchantCategories,
  staleTime: Infinity,
});

export function reliabilityQuery(userId: string, endDate: string) {
  return queryOptions({
    queryKey: ['reliability', 'score', userId, endDate],
    queryFn: async ({ signal }) =>
      toReliabilityScore(await fetchReliability(userId, endDate, signal)),
  });
}

export function transactionsQuery(userId: string, endDate: string) {
  const { start, end } = scoringWindowFor(endDate);
  const queryKey = ['reliability', 'transactions', userId, start, end];
  return queryOptions({
    queryKey,
    queryFn: async ({ client, signal }): Promise<StoredTransactions> => {
      const fetched = await fetchAllTransactions({ userId, from: start, to: end, signal });
      const liveEvents = client.getQueryData<StoredTransactions>(queryKey)?.liveEvents ?? [];
      const transactions = applyTransactionEvents(
        fetched,
        liveEvents.map(({ event }) => event),
      );
      return { transactions, liveEvents };
    },
  });
}
