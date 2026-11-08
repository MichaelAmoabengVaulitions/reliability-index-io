import { createApiClient } from '@reliability-index/core/api/client';

import { config } from '@/config';

export {
  ApiError,
  ValidationError,
  transactionEventsUrl,
  type Discovery,
} from '@reliability-index/core/api/client';

// The shared client, set up with this app's settings.
export const { fetchReliability, fetchAllTransactions, fetchMerchantCategories, fetchDiscovery } =
  createApiClient({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? config.api.baseUrl,
    requestTimeoutMs: config.api.requestTimeoutMs,
    transactionPageLimit: config.api.transactionPageLimit,
    fallbackUserIds: config.api.fallbackUserIds,
  });
