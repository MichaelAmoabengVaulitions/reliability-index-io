import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createTestQueryClient } from '@/test-utils/createTestQueryClient';

import { useReliabilityScore } from './useReliabilityScore';

const responseBody = {
  user_id: 'user_1001',
  from: '2026-10-31',
  currency: 'EUR',
  reliability_index: 64,
  score_band: 'MEDIUM',
  metrics: {
    income_regularity: 0.83,
    income_coverage_ratio: 1.41,
    essential_payments_consistency: 0.89,
    good_months: 4,
    negative_balance_days: 54,
    late_fee_events: 1,
  },
  drivers: ['Savings behavior detected (+13 pts)'],
};

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function Providers({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function renderScoreHook() {
  return renderHook(() => useReliabilityScore('user_1001', '2026-10-31'), { wrapper: Providers });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

// Finishing the request at the end of a test stops its timeout from outliving the test.
function holdRequestOpen() {
  let finishRequest = () => {};
  fetchMock.mockReturnValue(
    new Promise((resolve) => {
      finishRequest = () => resolve(new Response(JSON.stringify(responseBody)));
    }),
  );
  return () => finishRequest();
}

describe('useReliabilityScore', () => {
  it('is loading until the backend answers', async () => {
    const finishRequest = holdRequestOpen();
    const { result } = await renderScoreHook();
    expect(result.current.status).toBe('loading');
    await act(async () => finishRequest());
  });

  it('asks for the selected user and end date, and returns the backend score', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(responseBody)));
    const { result } = await renderScoreHook();

    await waitFor(() => expect(result.current.status).toBe('ready'));

    expect(result.current.score).toMatchObject({ score: 64, band: 'Medium', savingsPoints: 13 });
    expect(fetchMock.mock.calls[0][0]).toMatch(
      /\/api\/users\/user_1001\/reliability\?from=2026-10-31$/,
    );
  });

  it('reports an error, and recovers when retried', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const { result } = await renderScoreHook();
    await waitFor(() => expect(result.current.status).toBe('error'));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(responseBody)));
    await act(async () => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
