import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Transaction } from '@/api/schemas';
import { createTestQueryClient } from '@/test-utils/createTestQueryClient';
import { FakeEventSource } from '@/test-utils/fakeEventSource';
import { sampleScores } from '@/test-utils/sampleScores';

import {
  discoveryQuery,
  reliabilityQuery,
  transactionsQuery,
  type StoredTransactions,
} from './queries';
import { useTransactionEventStream } from './useTransactionEventStream';

jest.mock('react-native-sse', () => require('@/test-utils/fakeEventSource'));

const userId = 'user_1001';
const endDate = '2026-10-31';

function buildTransaction(id: string, date = '2026-10-01'): Transaction {
  return {
    id,
    account_id: 'account_1',
    user_id: userId,
    amount: -12.5,
    currency: 'EUR',
    date,
    description: 'GROCERIES',
    merchant_category_code: '5411',
    merchant_name: 'Bio Company',
    type: 'debit',
    synced_at: '2026-10-02T08:00:00Z',
  };
}

const transactionsKey = transactionsQuery(userId, endDate).queryKey;
const scoreKey = reliabilityQuery(userId, endDate).queryKey;

interface StreamSetup {
  hasStreamHost?: boolean;
  transactionsLoaded?: boolean;
}

async function renderStream({ hasStreamHost = true, transactionsLoaded = true }: StreamSetup = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(discoveryQuery.queryKey, {
    userIds: [userId],
    streamBaseUrl: hasStreamHost ? 'https://stream.example.com/' : undefined,
  });
  if (transactionsLoaded) {
    queryClient.setQueryData(transactionsKey, {
      transactions: [buildTransaction('tx_1')],
      liveEvents: [],
    });
  }
  const Providers = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = await renderHook(() => useTransactionEventStream(userId, endDate), {
    wrapper: Providers,
  });
  const storedIds = () =>
    queryClient.getQueryData<StoredTransactions>(transactionsKey)?.transactions.map(({ id }) => id);
  return { ...rendered, queryClient, storedIds };
}

// Lets the stream's batch timer run, so waiting events are applied.
async function waitForBatch() {
  await act(async () => jest.advanceTimersByTime(100));
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeEventSource.opened = [];
});

afterEach(() => jest.useRealTimers());

describe('useTransactionEventStream', () => {
  it('connects to the stream host from discovery, not the REST host', async () => {
    await renderStream();
    expect(FakeEventSource.latest().url).toBe(
      'https://stream.example.com/api/users/user_1001/transaction-events',
    );
  });

  it('does not connect when discovery names no stream host', async () => {
    await renderStream({ hasStreamHost: false });
    expect(FakeEventSource.opened).toHaveLength(0);
  });

  it('is live only while the stream is connected', async () => {
    const { result } = await renderStream();
    expect(result.current).toBe(false);

    await act(async () => FakeEventSource.latest().open());
    expect(result.current).toBe(true);

    await act(async () => FakeEventSource.latest().dropConnection());
    expect(result.current).toBe(false);
  });

  it('adds, changes and removes transactions as events arrive', async () => {
    const { storedIds } = await renderStream();
    const stream = FakeEventSource.latest();

    await act(async () => {
      stream.sendTransactionEvent('1', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction('tx_2'),
      });
      stream.sendTransactionEvent('2', { type: 'TRANSACTION_DELETED', transaction_id: 'tx_1' });
    });
    await waitForBatch();

    expect(storedIds()).toEqual(['tx_2']);
  });

  it('ignores an event the stream sends again after reconnecting', async () => {
    const { queryClient } = await renderStream();
    const added = { type: 'TRANSACTION_ADDED', transaction: buildTransaction('tx_2') } as const;

    await act(async () => FakeEventSource.latest().sendTransactionEvent('1', added));
    await waitForBatch();
    await act(async () => FakeEventSource.latest().sendTransactionEvent('1', added));
    await waitForBatch();

    const stored = queryClient.getQueryData<StoredTransactions>(transactionsKey);
    expect(stored?.liveEvents).toHaveLength(1);
  });

  it('ignores a new transaction dated outside the scoring window', async () => {
    const { storedIds } = await renderStream();

    await act(async () =>
      FakeEventSource.latest().sendTransactionEvent('1', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction('tx_2', '2026-11-02'),
      }),
    );
    await waitForBatch();

    expect(storedIds()).toEqual(['tx_1']);
  });

  it('skips an event it cannot read', async () => {
    const { storedIds } = await renderStream();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await act(async () =>
      FakeEventSource.latest().sendTransactionEvent('1', {
        type: 'TRANSACTION_ADDED',
        transaction: { id: 'tx_2' } as Transaction,
      }),
    );
    await waitForBatch();

    expect(storedIds()).toEqual(['tx_1']);
  });

  it('keeps events that arrive before the transactions have loaded', async () => {
    const { queryClient, storedIds } = await renderStream({ transactionsLoaded: false });

    await act(async () =>
      FakeEventSource.latest().sendTransactionEvent('1', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction('tx_2'),
      }),
    );
    await waitForBatch();
    queryClient.setQueryData(transactionsKey, {
      transactions: [buildTransaction('tx_1')],
      liveEvents: [],
    });
    await waitForBatch();

    expect(storedIds()).toEqual(['tx_1', 'tx_2']);
  });

  it('refreshes the score once the events stop', async () => {
    const { queryClient } = await renderStream();
    queryClient.setQueryData(scoreKey, sampleScores.user_1001);

    await act(async () =>
      FakeEventSource.latest().sendTransactionEvent('1', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction('tx_2'),
      }),
    );
    await waitForBatch();
    expect(queryClient.getQueryState(scoreKey)?.isInvalidated).toBe(false);

    await act(async () => jest.advanceTimersByTime(2000));
    expect(queryClient.getQueryState(scoreKey)?.isInvalidated).toBe(true);
  });

  it('connects again after the connection drops', async () => {
    await renderStream();
    const firstStream = FakeEventSource.latest();

    await act(async () => firstStream.dropConnection());
    expect(firstStream.isClosed).toBe(true);

    await act(async () => jest.advanceTimersByTime(2000));
    expect(FakeEventSource.opened).toHaveLength(2);
  });

  it('closes the stream when it is no longer needed', async () => {
    const { unmount } = await renderStream();
    await act(async () => unmount());
    expect(FakeEventSource.latest().isClosed).toBe(true);
  });
});
