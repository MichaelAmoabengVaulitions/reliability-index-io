export const apiSettings = {
  baseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    'https://wydokyegph.execute-api.eu-central-1.amazonaws.com',
  transactionPageLimit: 500,
  requestTimeoutMs: 20_000,
  // Used when the discovery response has no usable list, so the picker is never empty.
  fallbackUserIds: ['user_1001'],
  liveUpdates: {
    // Events that arrive close together are applied in one go.
    batchMs: 100,
    // The score is fetched again once the events have stopped for this long.
    scoreRefreshDelayMs: 2_000,
    // The stream closes after about 30 seconds, so it is opened again after this wait.
    reconnectDelayMs: 2_000,
    // After a failed connection the wait starts here and doubles each time, up to the longest.
    reconnectFirstDelayMs: 1_000,
    reconnectLongestDelayMs: 30_000,
  },
} as const;
