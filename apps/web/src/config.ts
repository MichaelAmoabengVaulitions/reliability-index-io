/**
 * Every adjustable number and setting in one place, so there are no stray
 * numbers scattered through the code. If you need a number in a component, a
 * store, or a helper, add it here first.
 */
export const config = {
  api: {
    baseUrl: 'https://wydokyegph.execute-api.eu-central-1.amazonaws.com',
    transactionPageLimit: 500,
    requestTimeoutMs: 20_000,
    /*
     * The only user id the API specification gives as an example. The user
     * picker falls back to this list when the discovery endpoint returns
     * nothing usable, so the dropdown is never empty.
     */
    fallbackUserIds: ['user_1001'] as const,
  },
  ui: {
    searchDebounceMs: 200,
    virtualRowHeightPx: 56,
    virtualOverscan: 5,
  },
  stream: {
    batchMs: 100,
    scoreRefreshDelayMs: 2_000,
    reconnectInitialMs: 1_000,
    reconnectMaxMs: 30_000,
  },
  query: {
    staleTimeMs: 60_000,
    // Five minutes.
    gcTimeMs: 300_000,
    retryCount: 2,
  },
  /*
   * The scoring window and the score band limits are shared with the mobile
   * app, in @reliability-index/core/scoring.
   */
  scoring: {
    resilienceMinPoints: -20,
    resilienceMaxPoints: 25,
  },
  locale: 'en-US',
  // Day before month, so a date reads as "28 Aug 2026".
  dateLocale: 'en-GB',
} as const;
