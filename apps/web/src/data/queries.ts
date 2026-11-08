import { queryOptions } from '@tanstack/react-query';

import {
  fetchAllTransactions,
  fetchDiscovery,
  fetchMerchantCategories,
  fetchReliability,
} from '@/api/client';

import { queryKeys } from './queryKeys';
import {
  applyTransactionEvents,
  toState,
  type LiveEvent,
  type TransactionState,
} from './transactionState';

/**
 * What we keep in the cache for a user's transactions. `state` holds the
 * fetched pages with every live event applied. `liveEvents` is the log of
 * those events, so a refetch can apply them again rather than dropping them.
 */
export interface TransactionsQueryData {
  state: TransactionState;
  liveEvents: LiveEvent[];
}

/*
 * Each query is defined once here, so the route loaders and the components
 * share the same key and fetch function.
 */
export const discoveryQuery = queryOptions({
  queryKey: queryKeys.discovery,
  queryFn: fetchDiscovery,
  staleTime: Infinity,
});

export const merchantCategoriesQuery = queryOptions({
  queryKey: queryKeys.merchantCategories,
  queryFn: fetchMerchantCategories,
  staleTime: Infinity,
});

export function reliabilityQuery(userId: string, from: string) {
  return queryOptions({
    queryKey: queryKeys.reliability(userId, from),
    queryFn: ({ signal }) => fetchReliability(userId, from, signal),
  });
}

export function transactionsQuery(userId: string, from: string, to: string) {
  const queryKey = queryKeys.transactions(userId, from, to);
  return queryOptions({
    queryKey,
    queryFn: async ({ client, signal }): Promise<TransactionsQueryData> => {
      const transactions = await fetchAllTransactions({ userId, from, to, signal });
      const liveEvents = client.getQueryData<TransactionsQueryData>(queryKey)?.liveEvents ?? [];
      const state = applyTransactionEvents(
        toState(transactions),
        liveEvents.map((liveEvent) => liveEvent.event),
      );
      return { state, liveEvents };
    },
  });
}
