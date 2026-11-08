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
    scoringWindowMonths: 6,
    /*
     * The first month-end with six full months of data behind it. The data
     * starts in September 2025, so an earlier date would score a part-empty
     * window and look low only because months are missing.
     */
    earliestScoringDate: '2026-02-28',
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
  scoring: {
    /*
     * Score band ranges from the API specification: LOW 0-49, MEDIUM 50-74,
     * HIGH 75-100. The score scale uses these so its coloured zones line
     * up with the band the backend reports.
     */
    mediumBandMin: 50,
    highBandMin: 75,
    resilienceMinPoints: -20,
    resilienceMaxPoints: 25,
  },
  locale: 'en-US',
  // Day before month, so a date reads as "28 Aug 2026".
  dateLocale: 'en-GB',
} as const;
