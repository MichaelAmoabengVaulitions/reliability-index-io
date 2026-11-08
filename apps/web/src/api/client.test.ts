import { afterEach, describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { buildTransaction } from '@/test-utils/fixtures/transactions';

import {
  ApiError,
  API_BASE_URL,
  ValidationError,
  fetchAllTransactions,
  fetchDiscovery,
  fetchMerchantCategories,
  fetchReliability,
  fetchTransactionPage,
  transactionEventsUrl,
  trimTrailingSlashes,
} from './client';

function fetchedUrl(): string {
  return String(vi.mocked(fetch).mock.calls[0]?.[0]);
}

// A request that never answers, and fails the way fetch does when it is aborted.
function fetchThatHangs(): void {
  vi.mocked(fetch).mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
}

describe('requests', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up on a hung request with a clear error', async () => {
    vi.useFakeTimers();
    fetchThatHangs();

    const result = fetchReliability('user_1001', '2026-02-20').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(config.api.requestTimeoutMs);

    const error = await result;
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, message: 'The request timed out.' });
  });

  it('keeps a cancel as a cancel, not an error', async () => {
    fetchThatHangs();
    const controller = new AbortController();

    const result = fetchReliability('user_1001', '2026-02-20', controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not start a request that is already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchReliability('user_1001', '2026-02-20', controller.signal),
    ).rejects.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('turns a success response that is not JSON into an ApiError', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('<html>Oops</html>'));

    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
  });

  it('encodes the user id in the reliability path', async () => {
    await fetchReliability('user/1', '2026-02-20');
    expect(fetchedUrl()).toContain('/api/users/user%2F1/reliability');
  });

  it('encodes the user id in the transactions path', async () => {
    await fetchTransactionPage({ userId: 'user/1', from: '2025-09-01', to: '2026-02-20' });
    expect(fetchedUrl()).toContain('/api/users/user%2F1/transactions');
  });
});

describe('trimTrailingSlashes', () => {
  it('removes slashes from the end of a URL', () => {
    expect(trimTrailingSlashes('https://host.example/')).toBe('https://host.example');
    expect(trimTrailingSlashes('https://host.example//')).toBe('https://host.example');
  });

  it('leaves a URL with no trailing slash alone', () => {
    expect(trimTrailingSlashes('https://host.example')).toBe('https://host.example');
  });
});

describe('fetchReliability', () => {
  it('resolves with a parsed reliability response on success', async () => {
    const result = await fetchReliability('user_1001', '2026-02-20');
    expect(result.user_id).toBe('user_1001');
    expect(result.reliability_index).toBe(64);
    expect(result.score_band).toBe('MEDIUM');
    expect(result.metrics.income_regularity).toBeGreaterThan(0);
  });

  it('throws ApiError with status 400 when from is empty', async () => {
    expect.assertions(3);
    try {
      await fetchReliability('user_1001', '');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      if (error instanceof ApiError) {
        expect(error.status).toBe(400);
        expect(error.message.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows the message the gateway sends when the service is down', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ message: 'Service Unavailable' }, { status: 503 }),
    );
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      status: 503,
      message: 'Service Unavailable',
    });
  });

  it('prefers the error field when a response has both', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'User not found', message: 'Not Found' }, { status: 404 }),
    );
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      message: 'User not found',
    });
  });

  it('falls back to a plain message when the response has neither', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({}, { status: 500 }));
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      message: 'Request failed',
    });
  });

  it('throws ValidationError when the response is missing required fields', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({}));
    expect.assertions(2);
    try {
      await fetchReliability('user_1001', '2026-02-20');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        // Any of the required fields would do; finding one in the message proves validation ran.
        expect(error.message).toMatch(/user_id|reliability_index|score_band/);
      }
    }
  });
});

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('fetchTransactionPage', () => {
  it('returns one page of transactions with the page number, limit, total, and has_more flag', async () => {
    const page = await fetchTransactionPage(window);
    expect(Array.isArray(page.transactions)).toBe(true);
    expect(page.total).toBe(2000);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(500);
    expect(typeof page.has_more).toBe('boolean');
  });

  it('returns up to 500 records on the first call and reports has_more true when more pages remain', async () => {
    const page = await fetchTransactionPage(window);
    expect(page.transactions).toHaveLength(500);
    expect(page.has_more).toBe(true);
  });

  it('walks the pages to assemble all 2000 records with no duplicates', async () => {
    const seen = new Set<string>();
    let pageNumber = 1;
    let pageCount = 0;
    while (true) {
      const result = await fetchTransactionPage({ ...window, page: pageNumber });
      for (const tx of result.transactions) {
        expect(seen.has(tx.id)).toBe(false);
        seen.add(tx.id);
      }
      pageCount += 1;
      if (!result.has_more) break;
      pageNumber += 1;
    }
    expect(seen.size).toBe(2000);
    expect(pageCount).toBe(4); // 2000 records at the default limit of 500 is four pages
  });
});

describe('fetchAllTransactions', () => {
  it('returns one flat array containing every transaction with no duplicates', async () => {
    const all = await fetchAllTransactions(window);
    expect(all).toHaveLength(2000);
    expect(new Set(all.map((tx) => tx.id)).size).toBe(2000);
  });

  it('stops asking for pages once the caller cancels', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation(async () => {
      controller.abort();
      return Response.json({
        transactions: [buildTransaction()],
        total: 9,
        page: 1,
        limit: 500,
        has_more: true,
      });
    });

    await expect(
      fetchAllTransactions({ ...window, signal: controller.signal }),
    ).rejects.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('skips a malformed transaction and keeps the rest of the page', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({
        transactions: [buildTransaction({ id: 'tx_good' }), { id: 'tx_bad' }],
        total: 2,
        page: 1,
        limit: 500,
        has_more: false,
      }),
    );

    const all = await fetchAllTransactions(window);

    expect(all.map((transaction) => transaction.id)).toEqual(['tx_good']);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('rejects when any page fails', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    await expect(fetchAllTransactions(window)).rejects.toBeInstanceOf(ApiError);
  });

  it('stops instead of looping forever when the backend reports more pages but sends an empty one', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ transactions: [], total: 10, page: 1, limit: 500, has_more: true }),
    );
    await expect(fetchAllTransactions(window)).resolves.toEqual([]);
  }, 2000);
});

describe('fetchMerchantCategories', () => {
  it('returns the code and name of each category', async () => {
    const categories = await fetchMerchantCategories();
    expect(categories).toContainEqual({
      code: '6011',
      name: 'ATM Withdrawals',
      group: 'cash',
    });
  });

  it('throws a ValidationError when the response has no category list', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({}));
    await expect(fetchMerchantCategories()).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('transactionEventsUrl', () => {
  it('joins the base URL and the path with one slash', () => {
    expect(transactionEventsUrl('https://stream.example.com/', 'user_1001')).toBe(
      'https://stream.example.com/api/users/user_1001/transaction-events',
    );
    expect(transactionEventsUrl('https://stream.example.com', 'user_1001')).toBe(
      'https://stream.example.com/api/users/user_1001/transaction-events',
    );
  });

  it('encodes the user id', () => {
    expect(transactionEventsUrl('https://stream.example.com', 'user/1')).toBe(
      'https://stream.example.com/api/users/user%2F1/transaction-events',
    );
  });
});

describe('fetchDiscovery', () => {
  it('returns the users array when the discovery response carries that key', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ users: ['user_1001', 'user_1002'] }),
    );
    expect((await fetchDiscovery()).userIds).toEqual(['user_1001', 'user_1002']);
  });

  it('returns the streaming host from the discovery response', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({
        users: ['user_1001'],
        sse: { base_url: 'https://stream.example.com/' },
      }),
    );
    expect((await fetchDiscovery()).streamBaseUrl).toBe('https://stream.example.com/');
  });

  it('falls back to the API host when the response has no streaming host', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({ users: ['user_1001'] }));
    expect((await fetchDiscovery()).streamBaseUrl).toBe(API_BASE_URL);
  });

  it('also accepts a userIds array, since the spec does not pin the shape', async () => {
    vi.mocked(fetch).mockImplementation(async () => Response.json({ userIds: ['user_2001'] }));
    expect((await fetchDiscovery()).userIds).toEqual(['user_2001']);
  });

  it('also accepts an available_users array, the shape the real backend actually returns', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({
        available_users: ['user_1001', 'user_1002', 'user_1003'],
        name: 'Credit Builder API',
      }),
    );
    expect((await fetchDiscovery()).userIds).toEqual(['user_1001', 'user_1002', 'user_1003']);
  });

  it('falls back to the sample user when none of the known keys are present, so the picker stays usable', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ endpoints: ['/api/users/:userId/reliability'] }),
    );
    expect((await fetchDiscovery()).userIds).toEqual(['user_1001']);
  });

  it('throws an ApiError when the discovery endpoint itself fails, since the network being down is not the same as an unexpected response', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    await expect(fetchDiscovery()).rejects.toBeInstanceOf(ApiError);
  });
});
