import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createTestQueryClient } from '@/test-utils/createTestQueryClient';
import { letReactQueryUpdate } from '@/test-utils/letReactQueryUpdate';

import { transactionsQuery } from './queries';
import { useTransactions } from './useTransactions';

function apiTransaction(id: string) {
  return {
    id,
    account_id: 'account_1',
    user_id: 'user_1001',
    amount: -12.5,
    currency: 'EUR',
    date: '2026-10-01',
    description: 'GROCERIES',
    merchant_category_code: '5411',
    merchant_name: 'Bio Company',
    type: 'debit',
    synced_at: '2026-10-02T08:00:00Z',
  };
}

function pageResponse(ids: string[], hasMore: boolean) {
  const body = {
    transactions: ids.map(apiTransaction),
    total: 3,
    page: 1,
    limit: 500,
    has_more: hasMore,
  };
  return new Response(JSON.stringify(body));
}

function categoriesResponse() {
  const categories = [{ code: '5411', name: 'Groceries', group: 'essential' }];
  return new Response(JSON.stringify({ categories }));
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

/*
 * Answers the category list and the transaction pages separately, so each
 * test can decide how the transaction pages arrive.
 */
function answerRequests(
  sendTransactionPage: () => Promise<Response>,
  sendCategories: () => Promise<Response> = async () => categoriesResponse(),
) {
  fetchMock.mockImplementation((url) =>
    url.includes('/merchant-categories') ? sendCategories() : sendTransactionPage(),
  );
}

function transactionRequests(): string[] {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.includes('/transactions?'));
}

function renderTransactionsHook(queryClient: QueryClient = createTestQueryClient()) {
  const Providers = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useTransactions('user_1001', '2026-10-31'), { wrapper: Providers });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('useTransactions', () => {
  it('asks for the scoring window that ends on the end date', async () => {
    answerRequests(async () => pageResponse(['1'], false));
    const { result } = await renderTransactionsHook();
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const [url] = transactionRequests();
    expect(url).toContain('/api/users/user_1001/transactions?');
    expect(url).toContain('from=2026-05-01');
    expect(url).toContain('to=2026-10-31');
  });

  it('returns the transactions with the backend category names', async () => {
    answerRequests(async () => pageResponse(['1'], false));
    const { result } = await renderTransactionsHook();

    await waitFor(() => expect(result.current.transactions[0]?.category).toBe('Groceries'));
    expect(result.current.transactions).toEqual([
      {
        id: '1',
        date: '2026-10-01',
        merchantName: 'Bio Company',
        category: 'Groceries',
        amount: -12.5,
      },
    ]);
  });

  it('still shows the transactions, with category codes, when the names fail to load', async () => {
    answerRequests(
      async () => pageResponse(['1'], false),
      async () => {
        throw new TypeError('Network request failed');
      },
    );
    const { result } = await renderTransactionsHook();

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.transactions[0].category).toBe('5411');
  });

  it('stays loading until every page has arrived', async () => {
    let sendSecondPage = () => {};
    const pages = [
      async () => pageResponse(['1', '2'], true),
      () =>
        new Promise<Response>((resolve) => {
          sendSecondPage = () => resolve(pageResponse(['3'], false));
        }),
    ];
    answerRequests(() => pages.shift()!());
    const { result } = await renderTransactionsHook();

    await waitFor(() => expect(transactionRequests()).toHaveLength(2));
    expect(result.current.status).toBe('loading');
    expect(result.current.transactions).toEqual([]);

    await act(async () => sendSecondPage());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.transactions.map(({ id }) => id)).toEqual(['1', '2', '3']);
  });

  it('asks for the new window when the end date changes', async () => {
    answerRequests(async () => pageResponse(['1'], false));
    const queryClient = createTestQueryClient();
    const Providers = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = await renderHook(
      ({ endDate }: { endDate: string }) => useTransactions('user_1001', endDate),
      { wrapper: Providers, initialProps: { endDate: '2026-10-31' } },
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    answerRequests(async () => pageResponse(['2'], false));
    await rerender({ endDate: '2026-02-28' });

    await waitFor(() => expect(result.current.transactions.map(({ id }) => id)).toEqual(['2']));
    const latestUrl = transactionRequests().at(-1);
    expect(latestUrl).toContain('from=2025-09-01');
    expect(latestUrl).toContain('to=2026-02-28');
  });

  it('keeps live updates when the transactions are fetched again', async () => {
    answerRequests(async () => pageResponse(['1'], false));
    const queryClient = createTestQueryClient();
    const { result } = await renderTransactionsHook(queryClient);
    await waitFor(() => expect(result.current.status).toBe('ready'));

    // A live delete arrives, then the same page is fetched again.
    const { queryKey } = transactionsQuery('user_1001', '2026-10-31');
    await act(async () => {
      queryClient.setQueryData(queryKey, {
        transactions: [],
        liveEvents: [
          { id: 'event_1', event: { type: 'TRANSACTION_DELETED', transaction_id: '1' } },
        ],
      });
      await queryClient.refetchQueries({ queryKey });
    });

    // The page came back with transaction 1, and the logged delete was applied on top.
    expect(transactionRequests()).toHaveLength(2);
    expect(queryClient.getQueryData(queryKey)?.transactions).toEqual([]);
    await waitFor(() => expect(result.current.transactions).toEqual([]));
  });

  it('keeps showing the transactions when fetching them again fails', async () => {
    answerRequests(async () => pageResponse(['1'], false));
    const queryClient = createTestQueryClient();
    const { result } = await renderTransactionsHook(queryClient);
    await waitFor(() => expect(result.current.status).toBe('ready'));

    answerRequests(async () => {
      throw new TypeError('Network request failed');
    });
    await act(async () => result.current.retry());

    const { queryKey } = transactionsQuery('user_1001', '2026-10-31');
    await waitFor(() => expect(queryClient.getQueryState(queryKey)?.status).toBe('error'));
    await letReactQueryUpdate();
    expect(result.current.status).toBe('ready');
    expect(result.current.transactions.map(({ id }) => id)).toEqual(['1']);
  });

  it('reports an error, and recovers when retried', async () => {
    answerRequests(async () => {
      throw new TypeError('Network request failed');
    });
    const { result } = await renderTransactionsHook();
    await waitFor(() => expect(result.current.status).toBe('error'));

    answerRequests(async () => pageResponse(['1'], false));
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
