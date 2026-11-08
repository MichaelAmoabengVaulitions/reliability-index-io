import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { discoveryQuery } from '@/data/queries';
import { todayInUtc } from '@reliability-index/core/scoring/window';

interface Selection {
  userIds: readonly string[];
  // Empty until the list of users has loaded.
  selectedUserId: string;
  scoringWindowEndDate: string;
  selectUser: (userId: string) => void;
  selectScoringWindowEndDate: (endDate: string) => void;
}

const noUsers: readonly string[] = [];

const SelectionContext = createContext<Selection | null>(null);

interface SelectionProviderProps {
  children: ReactNode;
  initialEndDate?: string;
}

// Keeps the chosen user and scoring window the same on every tab.
export function SelectionProvider({ children, initialEndDate }: SelectionProviderProps) {
  const { data: discovery } = useQuery(discoveryQuery);
  const userIds = discovery?.userIds ?? noUsers;
  const [pickedUserId, selectUser] = useState<string | null>(null);
  const [pickedEndDate, selectScoringWindowEndDate] = useState<string | null>(
    initialEndDate ?? null,
  );
  const [today, setToday] = useState(todayInUtc);
  const selectedUserId = pickedUserId ?? userIds[0] ?? '';
  // Until the user picks a date, the scoring window ends today.
  const scoringWindowEndDate = pickedEndDate ?? today;

  // Reads the date again each time the app is opened, so it is right after midnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayInUtc());
    });
    return () => subscription.remove();
  }, []);

  const selection = useMemo(
    () => ({
      userIds,
      selectedUserId,
      scoringWindowEndDate,
      selectUser,
      selectScoringWindowEndDate,
    }),
    [userIds, selectedUserId, scoringWindowEndDate],
  );

  return <SelectionContext.Provider value={selection}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Selection {
  const selection = useContext(SelectionContext);
  if (selection === null) {
    throw new Error('useSelection must be used inside SelectionProvider.');
  }
  return selection;
}
