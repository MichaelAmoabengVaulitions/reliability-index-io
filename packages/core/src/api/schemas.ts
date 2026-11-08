import { z } from 'zod';

/*
 * A missing or wrong field fails the check, but extra fields are allowed. The
 * backend adding a field shouldn't stop the dashboard from loading.
 */
export const transactionSchema = z.looseObject({
  id: z.string(),
  account_id: z.string(),
  user_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.iso.date(),
  description: z.string(),
  merchant_category_code: z.string(),
  merchant_name: z.string(),
  type: z.enum(['debit', 'credit']),
  synced_at: z.iso.datetime({ offset: true }),
});

export const scoringMetricsSchema = z.looseObject({
  income_regularity: z.number(),
  /*
   * This is null when the user has no essential expenses: with nothing to
   * divide by, there is no income-to-expenses ratio to report, so the backend
   * sends null rather than zero. The other numbers are still given as usual.
   */
  income_coverage_ratio: z.number().nullable(),
  essential_payments_consistency: z.number(),
  good_months: z.number().int(),
  negative_balance_days: z.number().int(),
  late_fee_events: z.number().int(),
});

export const reliabilityResponseSchema = z.looseObject({
  user_id: z.string(),
  from: z.iso.date(),
  currency: z.string(),
  reliability_index: z.number().int().min(0).max(100),
  score_band: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  metrics: scoringMetricsSchema,
  drivers: z.array(z.string()),
});

// One bad row shouldn't stop the analyst seeing the rest, so it is logged and left out.
function keepValidTransactions(rows: unknown[]) {
  return rows.flatMap((row) => {
    const parsed = transactionSchema.safeParse(row);
    if (parsed.success) return [parsed.data];
    console.warn('Skipping a transaction that did not match the expected shape.', parsed.error);
    return [];
  });
}

/*
 * The form the live backend returns transactions in today. total_pages is
 * optional because the real server does not always include it; we go by
 * has_more instead, so a missing total_pages does not break anything.
 */
export const offsetPaginatedSchema = z.looseObject({
  transactions: z.array(z.unknown()).transform(keepValidTransactions),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
  total_pages: z.number().int().optional(),
  has_more: z.boolean(),
});

/*
 * The API specification calls GET / "API metadata and available endpoints"
 * but does not say which fields it returns. The real backend uses
 * available_users today; we also accept the two common alternatives (users,
 * userIds) so a teammate testing against a different mock, or a future
 * rename, is not stuck. Extra fields like "name" or "endpoints" are allowed
 * through, which is what looseObject does (a strict check would reject them).
 */
export const discoveryResponseSchema = z.looseObject({
  available_users: z.array(z.string()).optional(),
  users: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  // Live events are served from their own host, not the REST API.
  sse: z.looseObject({ base_url: z.url() }).optional(),
});

/*
 * An ADDED or UPDATED event carries a transaction; a DELETED event carries a
 * transaction_id. Both are optional here because the API never sends both at
 * once; the code that handles an event reads whichever one matches its type.
 */
export const transactionEventSchema = z.looseObject({
  type: z.enum(['TRANSACTION_ADDED', 'TRANSACTION_UPDATED', 'TRANSACTION_DELETED']),
  transaction: transactionSchema.optional(),
  transaction_id: z.string().optional(),
});

export const merchantCategoriesResponseSchema = z.looseObject({
  categories: z.array(z.looseObject({ code: z.string(), name: z.string(), group: z.string() })),
});

export type Transaction = z.infer<typeof transactionSchema>;
export type ScoringMetrics = z.infer<typeof scoringMetricsSchema>;
export type ReliabilityResponse = z.infer<typeof reliabilityResponseSchema>;
export type OffsetPaginatedResponse = z.infer<typeof offsetPaginatedSchema>;
export type TransactionEvent = z.infer<typeof transactionEventSchema>;
export type DiscoveryResponse = z.infer<typeof discoveryResponseSchema>;
export type MerchantCategory = z.infer<
  typeof merchantCategoriesResponseSchema
>['categories'][number];
