import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { discoveryQuery } from '@/data/queries';
import { SelectionProvider } from '@/selection/SelectionContext';

import { createTestQueryClient } from './createTestQueryClient';
import { sampleUserIds } from './sampleScores';

const screenMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

// The design's sample screens show this user and end date, so tests start there.
const firstUserId = 'user_1009';
const endDate = '2026-10-31';

export function renderWithProviders(screen: ReactElement) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(discoveryQuery.queryKey, {
    userIds: [firstUserId, ...sampleUserIds.filter((userId) => userId !== firstUserId)],
    streamBaseUrl: undefined,
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={screenMetrics}>
        <SelectionProvider initialEndDate={endDate}>{screen}</SelectionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}
