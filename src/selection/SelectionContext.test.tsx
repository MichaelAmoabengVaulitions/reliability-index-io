import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createTestQueryClient } from '@/test-utils/createTestQueryClient';

import { SelectionProvider, useSelection } from './SelectionContext';

let reportAppState: (state: AppStateStatus) => void = () => {};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-08T22:00:00Z') });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    reportAppState = listener;
    return { remove: () => {} };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function renderSelectionHook() {
  const queryClient = createTestQueryClient();
  const Providers = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SelectionProvider>{children}</SelectionProvider>
    </QueryClientProvider>
  );
  return renderHook(() => useSelection(), { wrapper: Providers });
}

// The app goes to the background, the day changes, and the app is opened again.
async function comeBackTheNextDay() {
  await act(async () => {
    reportAppState('background');
    jest.setSystemTime(new Date('2026-11-09T08:00:00Z'));
    reportAppState('active');
  });
}

describe('SelectionProvider', () => {
  it('moves the end date to the new day when the app is opened again after midnight', async () => {
    const { result } = await renderSelectionHook();
    expect(result.current.scoringWindowEndDate).toBe('2026-11-08');

    await comeBackTheNextDay();

    expect(result.current.scoringWindowEndDate).toBe('2026-11-09');
  });

  it('keeps an end date the user picked', async () => {
    const { result } = await renderSelectionHook();
    await act(async () => result.current.selectScoringWindowEndDate('2026-10-31'));

    await comeBackTheNextDay();

    expect(result.current.scoringWindowEndDate).toBe('2026-10-31');
  });
});
