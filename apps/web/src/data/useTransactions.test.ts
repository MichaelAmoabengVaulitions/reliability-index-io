import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TransactionEvent } from '@/api/schemas';
import { buildTransaction } from '@/test-utils/fixtures/transactions';
import { createQueryClientAndWrapper, createQueryWrapper } from '@/test-utils/queryWrapper';

import type { TransactionsQueryData } from './queries';
import { queryKeys } from './queryKeys';
import { useTransactions } from './useTransactions';

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('useTransactions', () => {
  it('returns the transactions once every page has been loaded', async () => {
    const { result } = renderHook(() => useTransactions(window.userId, window.from, window.to), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.state.allIds).toHaveLength(2000);
    expect(result.current.data?.liveEvents).toEqual([]);
  });

  it('stays loading until every page is in, so the screen never shows a partial or empty list', async () => {
    const countsSeen: number[] = [];
    const { result } = renderHook(
      () => {
        const transactions = useTransactions(window.userId, window.from, window.to);
        if (transactions.data !== undefined) {
          countsSeen.push(transactions.data.state.allIds.length);
        }
        return transactions;
      },
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(new Set(countsSeen)).toEqual(new Set([2000]));
  });

  it('cancels the download when the query is cancelled', async () => {
    const { queryClient, wrapper } = createQueryClientAndWrapper();
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    renderHook(() => useTransactions(window.userId, window.from, window.to), { wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    await act(async () => {
      await queryClient.cancelQueries();
    });

    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('keeps live stream events when the transactions are fetched again', async () => {
    const { queryClient, wrapper } = createQueryClientAndWrapper();
    const { result } = renderHook(() => useTransactions(window.userId, window.from, window.to), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    /*
     * A live event arrives and is recorded on the cache, the way the
     * transaction event stream does it.
     */
    const event: TransactionEvent = {
      type: 'TRANSACTION_ADDED',
      transaction: buildTransaction({ id: 'tx_live' }),
    };
    const liveEvent = { id: '1', event };
    act(() => {
      queryClient.setQueryData<TransactionsQueryData>(
        queryKeys.transactions(window.userId, window.from, window.to),
        (previous) =>
          previous === undefined
            ? previous
            : { ...previous, liveEvents: [...previous.liveEvents, liveEvent] },
      );
    });

    await act(async () => {
      await result.current.refetch();
    });

    /*
     * The refetch reloads the pages; the live event log must survive and be
     * re-applied. We read the cache directly. It is the source of truth that
     * every component's useQuery renders from.
     */
    const refetched = queryClient.getQueryData<TransactionsQueryData>(
      queryKeys.transactions(window.userId, window.from, window.to),
    );
    expect(refetched?.liveEvents).toEqual([liveEvent]);
    expect(refetched?.state.byId['tx_live']).toBeDefined();
  });
});
