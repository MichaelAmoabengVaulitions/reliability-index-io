import { createQueryClient } from '@/data/queryClient';

/*
 * Tests should fail at once rather than retry. Keeping unused data forever
 * means no cache timer is left running after a test ends.
 */
export function createTestQueryClient() {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  return queryClient;
}
