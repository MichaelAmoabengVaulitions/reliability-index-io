import { QueryClient } from '@tanstack/react-query';

import { ApiError, ValidationError } from '@/api/client';

const retryCount = 2;
const staleTimeMs = 60_000;
const unusedDataKeptForMs = 300_000;
const firstServerErrorStatus = 500;

/*
 * Only a network failure, a timeout or a server error can go away by asking
 * again. Status 0 is a timeout. Anything else would give the same answer, so
 * the analyst sees the error straight away.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ValidationError) return false;
  if (error instanceof ApiError && error.status > 0 && error.status < firstServerErrorStatus) {
    return false;
  }
  return failureCount < retryCount;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleTimeMs,
        gcTime: unusedDataKeptForMs,
        retry: shouldRetry,
      },
    },
  });
}
