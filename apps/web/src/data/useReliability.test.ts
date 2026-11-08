import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { createQueryClientAndWrapper, createQueryWrapper } from '@/test-utils/queryWrapper';

import { useReliability } from './useReliability';

describe('useReliability', () => {
  it('resolves with the parsed reliability response on success', async () => {
    const { result } = renderHook(() => useReliability('user_1001', '2026-02-20'), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.user_id).toBe('user_1001');
    expect(result.current.data?.reliability_index).toBe(64);
    expect(result.current.data?.score_band).toBe('MEDIUM');
  });

  it('cancels the request when the query is cancelled', async () => {
    const { queryClient, wrapper } = createQueryClientAndWrapper();
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    renderHook(() => useReliability('user_1001', '2026-02-20'), { wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    await act(async () => {
      await queryClient.cancelQueries();
    });

    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('surfaces an ApiError when the request fails', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );

    const { result } = renderHook(() => useReliability('user_1001', '2026-02-20'), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
