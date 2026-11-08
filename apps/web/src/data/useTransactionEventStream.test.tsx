import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { STREAM_BASE_URL } from '@/test-utils/fakeBackend';
import { buildTransaction } from '@/test-utils/fixtures/transactions';

import type { TransactionsQueryData } from './queries';
import { queryKeys } from './queryKeys';
import { toState, type LiveEvent, type TransactionState } from './transactionState';
import { useTransactionEventStream } from './useTransactionEventStream';

interface SimpleListener {
  (event: MessageEvent): void;
}

/*
 * A stand-in for the browser's EventSource. The real one connects to the
 * network and is missing in the test environment, so we keep the instances
 * here and add a small "emit" helper so each test can send the events it
 * cares about. It records "closed" so the unmount test can check the stream
 * really does shut down, and carries a readyState (CONNECTING / OPEN / CLOSED)
 * so a test can model a dropped connection that is either being retried or
 * has failed for good.
 */
class MockEventSource {
  static last: MockEventSource | null = null;
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  url: string;
  private listeners = new Map<string, SimpleListener[]>();
  private nextEventId = 1;
  closed = false;
  readyState: number = MockEventSource.CONNECTING;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockEventSource.last = this;
  }

  addEventListener(type: string, fn: SimpleListener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(fn);
    this.listeners.set(type, existing);
  }

  emit(type: string, data: unknown, eventId = String(this.nextEventId++)): void {
    const event = new MessageEvent(type, { data: JSON.stringify(data), lastEventId: eventId });
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }

  // The hosted stream ends after its scripted events, and the browser reconnects by itself.
  endAndReconnect(): void {
    this.readyState = MockEventSource.CONNECTING;
    this.onerror?.();
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
  }

  close(): void {
    this.closed = true;
    this.readyState = MockEventSource.CLOSED;
  }
}

const USER_ID = 'user_1001';
const FROM = '2025-09-01';
const TO = '2026-02-20';

function buildWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// A client that already knows the streaming host, so the stream opens straight away.
function createClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.discovery, {
    userIds: [USER_ID],
    streamBaseUrl: STREAM_BASE_URL,
  });
  return queryClient;
}

function seedTransactionsCache(
  queryClient: QueryClient,
  state: TransactionState,
  liveEvents: LiveEvent[] = [],
): void {
  queryClient.setQueryData<TransactionsQueryData>(queryKeys.transactions(USER_ID, FROM, TO), {
    state,
    liveEvents,
  });
}

function readTransactionsCache(queryClient: QueryClient): TransactionsQueryData | undefined {
  return queryClient.getQueryData<TransactionsQueryData>(queryKeys.transactions(USER_ID, FROM, TO));
}

beforeEach(() => {
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
  MockEventSource.last = null;
});

describe('useTransactionEventStream', () => {
  it('opens the stream on the streaming host from discovery', () => {
    const queryClient = createClient();
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(MockEventSource.last?.url).toBe(
      `${STREAM_BASE_URL}api/users/${USER_ID}/transaction-events`,
    );
  });

  it('runs the hosted stream through: events, stream ends, reconnect, same events again', async () => {
    const queryClient = createClient();
    seedTransactionsCache(
      queryClient,
      toState([buildTransaction({ id: 'tx_1' }), buildTransaction({ id: 'tx_2' })]),
    );
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    const scriptedEvents = [
      { type: 'TRANSACTION_ADDED', transaction: buildTransaction({ id: 'tx_3' }) },
      { type: 'TRANSACTION_UPDATED', transaction: buildTransaction({ id: 'tx_1', amount: 50 }) },
      { type: 'TRANSACTION_DELETED', transaction_id: 'tx_2' },
    ];
    function sendScriptedEvents() {
      scriptedEvents.forEach((event, index) => {
        MockEventSource.last?.emit(event.type, event, String(index + 1));
      });
    }

    act(() => {
      MockEventSource.last?.onopen?.();
      sendScriptedEvents();
    });
    await waitFor(() => expect(result.current.eventCount).toBe(3));

    act(() => {
      MockEventSource.last?.endAndReconnect();
      sendScriptedEvents();
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));

    expect(result.current).toEqual({ status: 'open', eventCount: 3 });
    const cached = readTransactionsCache(queryClient);
    expect(cached?.state.allIds).toEqual(['tx_1', 'tx_3']);
    expect(cached?.state.byId['tx_1']?.amount).toBe(50);
    expect(cached?.liveEvents).toHaveLength(3);
  });

  it('waits for discovery before opening the stream', async () => {
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(new QueryClient()),
    });
    expect(MockEventSource.last).toBeNull();
    await waitFor(() => {
      expect(MockEventSource.last?.url).toBe(
        `${STREAM_BASE_URL}api/users/${USER_ID}/transaction-events`,
      );
    });
  });

  it('applies a replayed event once and counts it once', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([]));
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    const added = { type: 'TRANSACTION_ADDED', transaction: buildTransaction({ id: 'tx_new' }) };

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', added, '1');
    });
    await waitFor(() => expect(result.current.eventCount).toBe(1));

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', added, '1');
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));

    expect(result.current.eventCount).toBe(1);
    expect(readTransactionsCache(queryClient)?.liveEvents).toHaveLength(1);
  });

  it('skips an event already in the cache from an earlier visit to this user', async () => {
    const queryClient = createClient();
    const transaction = buildTransaction({ id: 'tx_new' });
    const event = { type: 'TRANSACTION_ADDED' as const, transaction };
    seedTransactionsCache(queryClient, toState([transaction]), [{ id: '1', event }]);
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', event, '1');
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));

    expect(result.current.eventCount).toBe(0);
    expect(readTransactionsCache(queryClient)?.liveEvents).toHaveLength(1);
  });

  it('holds events that arrive during the first load and applies them after it', async () => {
    const queryClient = createClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_early' }),
      });
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));
    expect(result.current.eventCount).toBe(0);

    act(() => {
      seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_loaded' })]));
    });

    await waitFor(() => {
      expect(readTransactionsCache(queryClient)?.state.allIds).toEqual(['tx_loaded', 'tx_early']);
    });
    await waitFor(() => expect(result.current.eventCount).toBe(1));
  });

  it('ignores an event dated outside the scoring window', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([]));
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_late', date: '2026-03-01' }),
      });
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));

    expect(result.current.eventCount).toBe(0);
    expect(readTransactionsCache(queryClient)?.state.allIds).toEqual([]);
  });

  it('removes a transaction when an update moves it out of the scoring window', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_UPDATED', {
        type: 'TRANSACTION_UPDATED',
        transaction: buildTransaction({ id: 'tx_1', date: '2026-03-01' }),
      });
    });

    await waitFor(() => {
      expect(readTransactionsCache(queryClient)?.state.allIds).toEqual([]);
    });
  });

  it('applies events that arrive close together in one cache update', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([]));
    const setQueryData = vi.spyOn(queryClient, 'setQueryData');
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      for (const id of ['tx_1', 'tx_2', 'tx_3']) {
        MockEventSource.last?.emit('TRANSACTION_ADDED', {
          type: 'TRANSACTION_ADDED',
          transaction: buildTransaction({ id }),
        });
      }
    });

    await waitFor(() => expect(result.current.eventCount).toBe(3));
    expect(setQueryData).toHaveBeenCalledTimes(1);
  });

  describe('refreshing the score', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function emitAdded(id: string) {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id }),
      });
    }

    it('refreshes the score once, a short while after events stop', () => {
      const queryClient = createClient();
      seedTransactionsCache(queryClient, toState([]));
      const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(queryClient),
      });

      act(() => {
        emitAdded('tx_1');
        vi.advanceTimersByTime(config.stream.batchMs);
      });
      act(() => {
        emitAdded('tx_2');
        vi.advanceTimersByTime(config.stream.batchMs);
      });
      expect(invalidateQueries).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(config.stream.scoreRefreshDelayMs);
      });

      expect(invalidateQueries).toHaveBeenCalledTimes(1);
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.reliability(USER_ID, TO),
      });
    });

    it('does not refresh the score when nothing new arrived', () => {
      const queryClient = createClient();
      const event = { type: 'TRANSACTION_ADDED' as const, transaction: buildTransaction() };
      seedTransactionsCache(queryClient, toState([]), [{ id: '1', event }]);
      const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
      renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(queryClient),
      });

      act(() => {
        MockEventSource.last?.emit('TRANSACTION_ADDED', event, '1');
        vi.advanceTimersByTime(config.stream.batchMs + config.stream.scoreRefreshDelayMs);
      });

      expect(invalidateQueries).not.toHaveBeenCalled();
    });
  });

  it('does not open a stream while the user id is empty', () => {
    const queryClient = createClient();
    renderHook(() => useTransactionEventStream('', FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(MockEventSource.last).toBeNull();
  });

  it('closes the stream when the component using it unmounts', () => {
    const queryClient = createClient();
    const { unmount } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    unmount();
    expect(MockEventSource.last?.closed).toBe(true);
  });

  it('applies a TRANSACTION_ADDED event to the cached transactions', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_existing' })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    const newTransaction = buildTransaction({ id: 'tx_new', merchant_name: 'New Cafe' });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: newTransaction,
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.allIds).toContain('tx_new');
      expect(cached?.state.byId['tx_new']?.merchant_name).toBe('New Cafe');
    });
  });

  it('applies a TRANSACTION_UPDATED event by replacing the existing entry in place', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1', amount: 10 })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_UPDATED', {
        type: 'TRANSACTION_UPDATED',
        transaction: buildTransaction({ id: 'tx_1', amount: 999 }),
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.byId['tx_1']?.amount).toBe(999);
      expect(cached?.state.allIds).toEqual(['tx_1']);
    });
  });

  it('applies a TRANSACTION_DELETED event by removing the entry from both lookups', async () => {
    const queryClient = createClient();
    seedTransactionsCache(
      queryClient,
      toState([buildTransaction({ id: 'tx_1' }), buildTransaction({ id: 'tx_2' })]),
    );
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_DELETED', {
        type: 'TRANSACTION_DELETED',
        transaction_id: 'tx_1',
      });
    });
    await waitFor(() => {
      const cached = readTransactionsCache(queryClient);
      expect(cached?.state.allIds).toEqual(['tx_2']);
      expect(cached?.state.byId['tx_1']).toBeUndefined();
    });
  });

  it('skips an event that does not match the expected shape, and logs a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', { type: 'NOT_A_REAL_EVENT' });
    });
    expect(warn).toHaveBeenCalled();
    const cached = readTransactionsCache(queryClient);
    expect(cached?.state.allIds).toEqual(['tx_1']);
    warn.mockRestore();
  });

  it('reports an open status once the stream connection is established', async () => {
    const queryClient = createClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.status).toBe('connecting');
    act(() => {
      MockEventSource.last?.onopen?.();
    });
    await waitFor(() => expect(result.current.status).toBe('open'));
  });

  it('reports an idle status when no user is selected', () => {
    const queryClient = createClient();
    const { result } = renderHook(() => useTransactionEventStream('', FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.status).toBe('idle');
  });

  it('stays in the connecting state when the stream drops but the browser is retrying', async () => {
    const queryClient = createClient();
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.onopen?.();
    });
    await waitFor(() => expect(result.current.status).toBe('open'));
    act(() => {
      const source = MockEventSource.last;
      if (source) source.readyState = MockEventSource.CONNECTING;
      source?.onerror?.();
    });
    await waitFor(() => expect(result.current.status).toBe('connecting'));
  });

  describe('when the browser gives up on the stream', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    function giveUp() {
      act(() => {
        const source = MockEventSource.last;
        if (source) source.readyState = MockEventSource.CLOSED;
        source?.onerror?.();
      });
    }

    function wait(ms: number) {
      act(() => {
        vi.advanceTimersByTime(ms);
      });
    }

    it('shows connecting and opens a new stream after a short wait', () => {
      const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(createClient()),
      });
      const firstSource = MockEventSource.last;

      giveUp();
      expect(result.current.status).toBe('connecting');

      wait(config.stream.reconnectInitialMs - 1);
      expect(MockEventSource.last).toBe(firstSource);

      wait(1);
      expect(MockEventSource.last).not.toBe(firstSource);
    });

    it('doubles the wait each time, up to the maximum', () => {
      renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(createClient()),
      });

      let expectedWait: number = config.stream.reconnectInitialMs;
      for (let attempt = 0; attempt < 8; attempt++) {
        const source = MockEventSource.last;
        giveUp();
        wait(expectedWait - 1);
        expect(MockEventSource.last).toBe(source);
        wait(1);
        expect(MockEventSource.last).not.toBe(source);
        expectedWait = Math.min(expectedWait * 2, config.stream.reconnectMaxMs);
      }
    });

    it('goes back to the short wait after a connection works', () => {
      renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(createClient()),
      });

      giveUp();
      wait(config.stream.reconnectInitialMs);
      act(() => {
        MockEventSource.last?.onopen?.();
      });

      const source = MockEventSource.last;
      giveUp();
      wait(config.stream.reconnectInitialMs);
      expect(MockEventSource.last).not.toBe(source);
    });

    it('applies events from the new stream', () => {
      const queryClient = createClient();
      seedTransactionsCache(queryClient, toState([]));
      renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(queryClient),
      });

      giveUp();
      wait(config.stream.reconnectInitialMs);
      act(() => {
        MockEventSource.last?.emit('TRANSACTION_ADDED', {
          type: 'TRANSACTION_ADDED',
          transaction: buildTransaction({ id: 'tx_after_reconnect' }),
        });
      });
      wait(config.stream.batchMs);

      expect(readTransactionsCache(queryClient)?.state.allIds).toEqual(['tx_after_reconnect']);
    });

    it('stops trying once the page is closed', () => {
      const { unmount } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
        wrapper: buildWrapper(createClient()),
      });

      giveUp();
      const source = MockEventSource.last;
      unmount();
      wait(config.stream.reconnectMaxMs);

      expect(MockEventSource.last).toBe(source);
    });
  });

  it('does not count or keep a delete of a row we do not have', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });

    act(() => {
      MockEventSource.last?.emit('TRANSACTION_DELETED', {
        type: 'TRANSACTION_DELETED',
        transaction_id: 'tx_unknown',
      });
    });
    await new Promise((resolve) => setTimeout(resolve, config.stream.batchMs * 2));

    expect(result.current.eventCount).toBe(0);
    expect(readTransactionsCache(queryClient)?.liveEvents).toEqual([]);
  });

  it('counts each live update applied, whatever kind it is', async () => {
    const queryClient = createClient();
    seedTransactionsCache(
      queryClient,
      toState([buildTransaction({ id: 'tx_1' }), buildTransaction({ id: 'tx_2' })]),
    );
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    expect(result.current.eventCount).toBe(0);
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_3' }),
      });
      MockEventSource.last?.emit('TRANSACTION_UPDATED', {
        type: 'TRANSACTION_UPDATED',
        transaction: buildTransaction({ id: 'tx_1', amount: 50 }),
      });
      MockEventSource.last?.emit('TRANSACTION_DELETED', {
        type: 'TRANSACTION_DELETED',
        transaction_id: 'tx_2',
      });
    });
    await waitFor(() => expect(result.current.eventCount).toBe(3));
  });

  it('does not count an event that fails validation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    const { result } = renderHook(() => useTransactionEventStream(USER_ID, FROM, TO), {
      wrapper: buildWrapper(queryClient),
    });
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', { type: 'NOT_A_REAL_EVENT' });
    });
    expect(result.current.eventCount).toBe(0);
    warn.mockRestore();
  });

  it('starts the count again from zero when the selected user changes', async () => {
    const queryClient = createClient();
    seedTransactionsCache(queryClient, toState([buildTransaction({ id: 'tx_1' })]));
    const { result, rerender } = renderHook(
      ({ userId }: { userId: string }) => useTransactionEventStream(userId, FROM, TO),
      { wrapper: buildWrapper(queryClient), initialProps: { userId: USER_ID } },
    );
    act(() => {
      MockEventSource.last?.emit('TRANSACTION_ADDED', {
        type: 'TRANSACTION_ADDED',
        transaction: buildTransaction({ id: 'tx_2' }),
      });
    });
    await waitFor(() => expect(result.current.eventCount).toBe(1));
    rerender({ userId: 'user_1002' });
    expect(result.current.eventCount).toBe(0);
  });
});
