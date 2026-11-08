import { ApiError, ValidationError } from '@/api/client';

import { shouldRetry } from './queryClient';

describe('shouldRetry', () => {
  it('retries a dropped connection, a timeout and a server error', () => {
    expect(shouldRetry(0, new TypeError('Network request failed'))).toBe(true);
    expect(shouldRetry(0, new ApiError(0, '/', 'The request timed out.'))).toBe(true);
    expect(shouldRetry(0, new ApiError(503, '/', 'Service Unavailable'))).toBe(true);
  });

  it('gives up after two retries', () => {
    expect(shouldRetry(2, new TypeError('Network request failed'))).toBe(false);
  });

  it('does not retry an answer that would come back the same', () => {
    expect(shouldRetry(0, new ApiError(404, '/', 'User not found'))).toBe(false);
    expect(shouldRetry(0, new ValidationError('Unexpected response', []))).toBe(false);
  });
});
