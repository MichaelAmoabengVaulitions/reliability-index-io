import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { transactionEventsUrl } from '@/api/client';
import { transactionEventSchema, type TransactionEvent } from '@/api/schemas';
import { config } from '@/config';

import { discoveryQuery, type TransactionsQueryData } from './queries';
import { queryKeys } from './queryKeys';
import {
  applyTransactionEvents,
  fitEventToWindow,
  onlyChangingEvents,
  onlyNewEvents,
  type LiveEvent,
} from './transactionState';

/**
 * The connection state of the live updates stream.
 *
 *  "idle":        nothing to connect to yet (no user picked).
 *  "connecting":  the stream is opening, or it dropped and is being retried.
 *  "open":        the stream is connected and events are arriving.
 */
export type StreamStatus = 'idle' | 'connecting' | 'open';

/**
 * What the live updates hook reports back to the component using it.
 *
 *  status:      the current connection state (see StreamStatus above).
 *  eventCount:  how many live updates have been applied since the stream for
 *               this user opened. It counts adds, changes and removals the
 *               same way, so it only ever goes up while the stream is
 *               connected, and starts again from zero when the user changes.
 */
export interface StreamState {
  status: StreamStatus;
  eventCount: number;
}

/*
 * The event names we listen for. They match the list in
 * transactionEventSchema, so a new event type means updating this list and
 * that one together.
 */
const EVENT_TYPE_NAMES: readonly TransactionEvent['type'][] = [
  'TRANSACTION_ADDED',
  'TRANSACTION_UPDATED',
  'TRANSACTION_DELETED',
];

/**
 * Opens a long-running connection that the backend uses to send transaction
 * add, update and delete events as they happen. Every event is checked
 * against the same description the rest of the app uses, then applied to the
 * stored transactions for the current user, so the screen updates without
 * asking the backend again. Events are applied in small batches, and the
 * score is fetched again once they stop.
 *
 * Returns the connection state and a running count of how many live updates
 * have been applied, so the component can show a "Live" badge and how much
 * has come through.
 */
export function useTransactionEventStream(userId: string, from: string, to: string): StreamState {
  const queryClient = useQueryClient();
  const { data: discovery } = useQuery(discoveryQuery);
  /*
   * EventSource is a browser feature, and is missing in the test environment.
   * When it is not there we simply do nothing: the live badge stays idle and
   * tests keep working. We also wait for discovery, which says where to connect.
   */
  const eventSourceAvailable = typeof EventSource !== 'undefined';
  const shouldSubscribe =
    eventSourceAvailable &&
    discovery !== undefined &&
    userId.length > 0 &&
    from.length > 0 &&
    to.length > 0;
  const streamBaseUrl = discovery?.streamBaseUrl;

  /*
   * We keep only the connecting/open part of the status here. The
   * "idle" value is worked out from shouldSubscribe as the component draws,
   * so we never have to set state from inside the effect to go back to idle.
   */
  const [connectionStatus, setConnectionStatus] =
    useState<Exclude<StreamStatus, 'idle'>>('connecting');

  /*
   * A running count of the live updates applied since this stream opened. It
   * counts every applied event the same way, whether it added, changed or
   * removed a transaction, so it always moves forward and never sits still
   * while updates are arriving.
   *
   * The count is stored next to the stream it belongs to (one user and one
   * window). When that stream changes, the count starts again from zero.
   * Clearing it by comparing during render is React's recommended way to
   * reset state when an input changes.
   */
  const streamKey = `${userId}|${from}|${to}`;
  const [applied, setApplied] = useState({ streamKey, count: 0 });
  if (applied.streamKey !== streamKey) {
    setApplied({ streamKey, count: 0 });
    // A new stream starts fresh: show "connecting" until the new one opens.
    setConnectionStatus('connecting');
  }

  useEffect(() => {
    if (!shouldSubscribe || streamBaseUrl === undefined) return;

    const cacheKey = queryKeys.transactions(userId, from, to);
    let pendingEvents: LiveEvent[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | undefined;
    let scoreRefreshTimer: ReturnType<typeof setTimeout> | undefined;

    const scheduleBatch = (): void => {
      batchTimer = setTimeout(applyPendingEvents, config.stream.batchMs);
    };

    const applyPendingEvents = (): void => {
      batchTimer = undefined;
      const cached = queryClient.getQueryData<TransactionsQueryData>(cacheKey);
      // Still on the first load, so hold on to the events and try again shortly.
      if (cached === undefined) {
        scheduleBatch();
        return;
      }

      const newEvents = onlyChangingEvents(
        cached.state,
        onlyNewEvents(cached.liveEvents, pendingEvents),
      );
      pendingEvents = [];
      if (newEvents.length === 0) return;

      queryClient.setQueryData<TransactionsQueryData>(cacheKey, {
        state: applyTransactionEvents(
          cached.state,
          newEvents.map((liveEvent) => liveEvent.event),
        ),
        liveEvents: [...cached.liveEvents, ...newEvents],
      });
      setApplied((current) => ({
        streamKey: current.streamKey,
        count: current.count + newEvents.length,
      }));

      clearTimeout(scoreRefreshTimer);
      scoreRefreshTimer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.reliability(userId, to) });
      }, config.stream.scoreRefreshDelayMs);
    };

    const handleEvent = (event: MessageEvent): void => {
      let payload: unknown;
      try {
        payload = JSON.parse(event.data);
      } catch (parseError) {
        console.warn('Could not read a live transaction event as JSON; skipping it.', parseError);
        return;
      }
      const parsed = transactionEventSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn(
          'Live transaction event did not match the expected shape; skipping it.',
          parsed.error,
        );
        return;
      }
      const fittedEvent = fitEventToWindow(parsed.data, from, to);
      if (fittedEvent === undefined) return;

      pendingEvents.push({ id: event.lastEventId, event: fittedEvent });
      if (batchTimer === undefined) scheduleBatch();
    };

    let activeSource: EventSource | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay: number = config.stream.reconnectInitialMs;

    const connect = (): void => {
      const source = new EventSource(transactionEventsUrl(streamBaseUrl, userId));
      activeSource = source;

      source.onopen = () => {
        reconnectDelay = config.stream.reconnectInitialMs;
        setConnectionStatus('open');
      };

      /*
       * EventSource raises an error for any broken connection. Usually the
       * browser is already reconnecting by itself. Only when readyState is
       * CLOSED has it given up, and then we have to open a new one ourselves.
       */
      source.onerror = () => {
        setConnectionStatus('connecting');
        if (source.readyState === EventSource.CLOSED) {
          reconnectTimer = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, config.stream.reconnectMaxMs);
        }
      };

      for (const eventName of EVENT_TYPE_NAMES) {
        source.addEventListener(eventName, handleEvent);
      }
    };

    connect();

    return () => {
      activeSource?.close();
      clearTimeout(reconnectTimer);
      clearTimeout(batchTimer);
      clearTimeout(scoreRefreshTimer);
    };
  }, [shouldSubscribe, streamBaseUrl, userId, from, to, queryClient]);

  return shouldSubscribe
    ? { status: connectionStatus, eventCount: applied.count }
    : { status: 'idle', eventCount: 0 };
}
