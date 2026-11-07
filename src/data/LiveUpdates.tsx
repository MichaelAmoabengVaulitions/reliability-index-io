import { createContext, useContext, type ReactNode } from 'react';

import { useSelection } from '@/selection/SelectionContext';

import { useTransactionEventStream } from './useTransactionEventStream';

interface LiveUpdates {
  // Whether the live stream is connected right now.
  isConnected: boolean;
}

const LiveUpdatesContext = createContext<LiveUpdates>({ isConnected: false });

/*
 * Opens one live stream for the whole app, for the selected user and scoring
 * window, so every tab gets the updates whichever one is open.
 */
export function LiveUpdatesProvider({ children }: { children: ReactNode }) {
  const { selectedUserId, scoringWindowEndDate } = useSelection();
  const isConnected = useTransactionEventStream(selectedUserId, scoringWindowEndDate);
  return (
    <LiveUpdatesContext.Provider value={{ isConnected }}>{children}</LiveUpdatesContext.Provider>
  );
}

export function useLiveUpdates(): LiveUpdates {
  return useContext(LiveUpdatesContext);
}
