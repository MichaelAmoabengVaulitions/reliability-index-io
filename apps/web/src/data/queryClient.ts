import { QueryClient } from '@tanstack/react-query';

import { ApiError, ValidationError } from '@/api/client';
import { config } from '@/config';

const HTTP_SERVER_ERROR_START = 500;

/*
 * Only a network failure, a timeout or a server error can go away by asking
 * again. Status 0 is a timeout. Anything else would give the same answer, so
 * the analyst sees the error straight away.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ValidationError) return false;
  if (error instanceof ApiError && error.status > 0 && error.status < HTTP_SERVER_ERROR_START) {
    return false;
  }
  return failureCount < config.query.retryCount;
}

/**
 * Builds a React Query client set up with the values in src/config.ts.
 *
 * Each call returns a new client rather than sharing one, so a test can give
 * each run its own cache and stay independent of the others.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: config.query.staleTimeMs,
        gcTime: config.query.gcTimeMs,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
