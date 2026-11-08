import type { ReliabilityResponse, ScoringMetrics } from '@/api/schemas';

interface ReliabilityOverrides {
  /** Fields to replace on the response itself. */
  response?: Partial<Omit<ReliabilityResponse, 'metrics'>>;
  /** Metric fields to replace, applied on top of the standard metrics. */
  metrics?: Partial<ScoringMetrics>;
}

/*
 * Matches the example response in docs/openapi.yaml, so tests check against a
 * fixed, known set of values. Pass overrides to set up a particular case, for
 * example a null income_coverage_ratio for a user with no essential expenses.
 */
export function buildReliabilityResponse(
  overrides: ReliabilityOverrides = {},
): ReliabilityResponse {
  return {
    user_id: 'user_1001',
    from: '2026-02-20',
    currency: 'EUR',
    reliability_index: 64,
    score_band: 'MEDIUM',
    drivers: [
      'Income present in 5/6 months',
      'Income covers essential expenses (1.41x)',
      'Essential payments detected consistently',
      'Savings behavior detected (+13 pts)',
      'Estimated 54 negative balance day(s) (-10 pts)',
      '1 late fee event(s) detected (-1 pts)',
      'Good cashflow months: 4/6',
    ],
    ...overrides.response,
    metrics: {
      income_regularity: 0.83,
      income_coverage_ratio: 1.41,
      essential_payments_consistency: 0.89,
      good_months: 4,
      negative_balance_days: 54,
      late_fee_events: 1,
      ...overrides.metrics,
    },
  };
}
