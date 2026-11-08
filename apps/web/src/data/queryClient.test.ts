import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { ApiError, ValidationError } from '@/api/client';
import { config } from '@/config';

import { createQueryClient, shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries a server error, a timeout and a network failure', () => {
    expect(shouldRetry(0, new ApiError(500, '/', 'boom'))).toBe(true);
    expect(shouldRetry(0, new ApiError(0, '/', 'The request timed out.'))).toBe(true);
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true);
  });

  it('stops after the configured number of retries', () => {
    const error = new ApiError(500, '/', 'boom');
    expect(shouldRetry(config.query.retryCount - 1, error)).toBe(true);
    expect(shouldRetry(config.query.retryCount, error)).toBe(false);
  });

  it('does not retry a 4xx, because asking again gives the same answer', () => {
    expect(shouldRetry(0, new ApiError(404, '/', 'User not found'))).toBe(false);
    expect(shouldRetry(0, new ApiError(400, '/', 'from is required'))).toBe(false);
  });

  it('does not retry a response that failed its check', () => {
    expect(shouldRetry(0, new ValidationError('Bad response', []))).toBe(false);
  });

  it('does not retry a success response that was not JSON', () => {
    expect(shouldRetry(0, new ApiError(200, '/', 'Not JSON'))).toBe(false);
  });
});

describe('createQueryClient', () => {
  it('returns a QueryClient', () => {
    expect(createQueryClient()).toBeInstanceOf(QueryClient);
  });

  it('pulls every tunable value from the central config so we do not duplicate constants', () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(config.query.staleTimeMs);
    expect(defaults?.gcTime).toBe(config.query.gcTimeMs);
    expect(defaults?.retry).toBe(shouldRetry);
  });

  it('disables refetch-on-focus so background tab switches do not trigger surprise network calls', () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('returns a fresh instance per call so tests can isolate cache state', () => {
    expect(createQueryClient()).not.toBe(createQueryClient());
  });
});
