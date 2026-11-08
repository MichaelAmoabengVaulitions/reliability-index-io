import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import EventSource, { type CustomEvent } from 'react-native-sse';

import { apiSettings } from '@/api/apiSettings';
import { transactionEventsUrl } from '@/api/client';
import { transactionEventSchema, type TransactionEvent } from '@reliability-index/core/api/schemas';
import { scoringWindowFor } from '@reliability-index/core/scoring/window';
import {
  fitEventToWindow,
  onlyChangingEvents,
  onlyNewEvents,
  type LiveEvent,
} from '@reliability-index/core/live/transactionEvents';
import { applyTransactionEvents } from '@/domain/transactionEvents';

import {
  discoveryQuery,
  reliabilityQuery,
  transactionsQuery,
  type StoredTransactions,
} from './queries';

type TransactionEventType = TransactionEvent['type'];

const transactionEventTypes: TransactionEventType[] = [
  'TRANSACTION_ADDED',
  'TRANSACTION_UPDATED',
  'TRANSACTION_DELETED',
];

const {
  batchMs,
  scoreRefreshDelayMs,
  reconnectDelayMs,
  reconnectFirstDelayMs,
  reconnectLongestDelayMs,
} = apiSettings.liveUpdates;

function readEvent(message: CustomEvent<TransactionEventType>): TransactionEvent | undefined {
  try {
    const parsed = transactionEventSchema.safeParse(JSON.parse(message.data ?? ''));
    if (parsed.success) return parsed.data;
    console.warn('Skipping a live event that did not match the expected shape.', parsed.error);
  } catch (error) {
    console.warn('Skipping a live event that was not valid JSON.', error);
  }
  return undefined;
}

/*
 * Listens for transactions being added, changed or removed, and applies them
 * to the stored transactions, so every tab updates without fetching again.
 * The score is fetched again once the events stop. Returns whether the stream
 * is connected right now.
 */
export function useTransactionEventStream(userId: string, endDate: string): boolean {
  const queryClient = useQueryClient();
  const { data: discovery } = useQuery(discoveryQuery);
  const streamBaseUrl = discovery?.streamBaseUrl;
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (streamBaseUrl === undefined || userId === '') return;

    const scoringWindow = scoringWindowFor(endDate);
    const transactionsKey = transactionsQuery(userId, endDate).queryKey;
    const scoreKey = reliabilityQuery(userId, endDate).queryKey;
    let pendingEvents: LiveEvent[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | undefined;
    let scoreRefreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectDelay: number = reconnectFirstDelayMs;
    let stream: EventSource<TransactionEventType>;

    const applyPendingEvents = () => {
      const stored = queryClient.getQueryData<StoredTransactions>(transactionsKey);
      // The transactions are still loading, so the events wait for the next batch.
      if (stored === undefined) {
        batchTimer = setTimeout(applyPendingEvents, batchMs);
        return;
      }
      batchTimer = undefined;
      const newEvents = onlyChangingEvents(
        stored.transactions.map(({ id }) => id),
        onlyNewEvents(stored.liveEvents, pendingEvents),
      );
      pendingEvents = [];
      if (newEvents.length === 0) return;

      queryClient.setQueryData<StoredTransactions>(transactionsKey, {
        transactions: applyTransactionEvents(
          stored.transactions,
          newEvents.map(({ event }) => event),
        ),
        liveEvents: [...stored.liveEvents, ...newEvents],
      });
      clearTimeout(scoreRefreshTimer);
      scoreRefreshTimer = setTimeout(
        () => void queryClient.invalidateQueries({ queryKey: scoreKey }),
        scoreRefreshDelayMs,
      );
    };

    const receiveEvent = (message: CustomEvent<TransactionEventType>) => {
      const event = readEvent(message);
      const eventForWindow = event && fitEventToWindow(event, scoringWindow);
      // The API gives every event an id. Without one, a replay can't be told apart, so it's skipped.
      if (eventForWindow === undefined || message.lastEventId === null) return;

      pendingEvents.push({ id: message.lastEventId, event: eventForWindow });
      if (batchTimer === undefined) batchTimer = setTimeout(applyPendingEvents, batchMs);
    };

    const connect = () => {
      // pollingInterval is how long the package waits before reopening a stream that ended.
      stream = new EventSource<TransactionEventType>(transactionEventsUrl(streamBaseUrl, userId), {
        pollingInterval: reconnectDelayMs,
      });
      stream.addEventListener('open', () => {
        reconnectDelay = reconnectFirstDelayMs;
        setIsLive(true);
      });
      // Closing stops the package's own retry, so every failure waits longer before the next try.
      stream.addEventListener('error', () => {
        setIsLive(false);
        stream.close();
        reconnectTimer = setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, reconnectLongestDelayMs);
      });
      for (const type of transactionEventTypes) stream.addEventListener(type, receiveEvent);
    };

    connect();

    return () => {
      stream.close();
      clearTimeout(batchTimer);
      clearTimeout(scoreRefreshTimer);
      clearTimeout(reconnectTimer);
      setIsLive(false);
    };
  }, [queryClient, streamBaseUrl, userId, endDate]);

  return isLive;
}
