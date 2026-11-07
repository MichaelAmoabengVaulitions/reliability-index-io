import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { Transaction } from '@/domain/transactionList';
import { toTransactions } from '@/domain/transactionMapping';

import { merchantCategoriesQuery, transactionsQuery } from './queries';

export interface TransactionsResult {
  status: 'loading' | 'error' | 'ready';
  transactions: Transaction[];
  retry: () => void;
}

/*
 * Every transaction in the scoring window, with category names. The list
 * waits for the transactions only: if the names fail, the codes show instead.
 */
export function useTransactions(userId: string, endDate: string): TransactionsResult {
  const { data, isPending, isError, refetch } = useQuery(transactionsQuery(userId, endDate));
  const { data: categories } = useQuery(merchantCategoriesQuery);
  const transactions = useMemo(
    () => toTransactions(data?.transactions ?? [], categories),
    [data, categories],
  );
  const retry = () => void refetch();

  if (isError) return { status: 'error', transactions: [], retry };
  if (isPending) return { status: 'loading', transactions: [], retry };
  return { status: 'ready', transactions, retry };
}
