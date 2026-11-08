import { createApiClient } from '@reliability-index/core/api/client';

import { apiSettings } from './apiSettings';

export {
  ApiError,
  ValidationError,
  transactionEventsUrl,
  type Discovery,
} from '@reliability-index/core/api/client';

// The shared client, set up with this app's settings.
export const { fetchReliability, fetchAllTransactions, fetchMerchantCategories, fetchDiscovery } =
  createApiClient(apiSettings);
