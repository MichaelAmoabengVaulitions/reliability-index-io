import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ApiError,
  ValidationError,
  createApiClient,
  transactionEventsUrl,
  trimTrailingSlashes,
} from './client';

const settings = {
  // The trailing slash checks that the client trims it before adding a path.
  baseUrl: 'https://api.example.test/',
  requestTimeoutMs: 20_000,
  transactionPageLimit: 500,
  fallbackUserIds: ['user_1001'],
};

const {
  fetchAllTransactions,
  fetchDiscovery,
  fetchMerchantCategories,
  fetchReliability,
  fetchTransactionPage,
} = createApiClient(settings);

const reliabilityResponse = {
  user_id: 'user_1001',
  from: '2026-02-20',
  currency: 'EUR',
  reliability_index: 64,
  score_band: 'MEDIUM',
  metrics: {
    income_regularity: 0.83,
    income_coverage_ratio: 1.41,
    essential_payments_consistency: 0.89,
    good_months: 4,
    negative_balance_days: 54,
    late_fee_events: 1,
  },
  drivers: ['Income present in 5/6 months', 'Savings behavior detected (+13 pts)'],
};

function transaction(id: string) {
  return {
    id,
    account_id: 'account_1',
    user_id: 'user_1001',
    amount: -12.5,
    currency: 'EUR',
    date: '2026-02-01',
    description: 'GROCERIES',
    merchant_category_code: '5411',
    merchant_name: 'Bio Company',
    type: 'debit',
    synced_at: '2026-02-02T08:00:00Z',
  };
}

const TRANSACTION_COUNT = 2000;
const allTransactions = Array.from({ length: TRANSACTION_COUNT }, (_, index) =>
  transaction(`tx_${index}`),
);

/*
 * Stands in for the hosted API, so the real client runs without the network.
 * A test that needs something else replaces it for that test.
 */
async function fakeBackend(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(String(input));
  if (url.pathname.endsWith('/reliability')) {
    if (!url.searchParams.get('from')) {
      return Response.json({ error: 'from is required' }, { status: 400 });
    }
    return Response.json(reliabilityResponse);
  }
  if (url.pathname.endsWith('/transactions')) {
    const page = Number(url.searchParams.get('page'));
    const limit = Number(url.searchParams.get('limit'));
    const start = (page - 1) * limit;
    return Response.json({
      transactions: allTransactions.slice(start, start + limit),
      total: allTransactions.length,
      page,
      limit,
      has_more: start + limit < allTransactions.length,
    });
  }
  throw new Error(`The fake backend has no response for ${url.href}`);
}

const fetchMock = vi.fn(fakeBackend);

function answerWith(body: unknown, status = 200): void {
  fetchMock.mockImplementation(async () => Response.json(body, { status }));
}

function requestedUrl(call = 0): string {
  return String(fetchMock.mock.calls[call]?.[0]);
}

// A request that never answers, and fails the way fetch does when it is aborted.
function fetchThatHangs(): void {
  fetchMock.mockImplementation(
    (_input, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(fakeBackend);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('requests', () => {
  it('sends requests to the base URL without a double slash', async () => {
    await fetchReliability('user_1001', '2026-02-20');
    expect(requestedUrl()).toBe(
      'https://api.example.test/api/users/user_1001/reliability?from=2026-02-20',
    );
  });

  it('gives up on a hung request with a clear error', async () => {
    vi.useFakeTimers();
    fetchThatHangs();

    const result = fetchReliability('user_1001', '2026-02-20').catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(settings.requestTimeoutMs);

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
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns a success response that is not JSON into an ApiError', async () => {
    fetchMock.mockImplementation(async () => new Response('<html>Oops</html>'));

    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      name: 'ApiError',
      status: 200,
    });
  });

  it('encodes the user id in the reliability path', async () => {
    await fetchReliability('user/1', '2026-02-20');
    expect(requestedUrl()).toContain('/api/users/user%2F1/reliability');
  });

  it('encodes the user id in the transactions path', async () => {
    await fetchTransactionPage({ userId: 'user/1', from: '2025-09-01', to: '2026-02-20' });
    expect(requestedUrl()).toContain('/api/users/user%2F1/transactions');
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
  });

  it('accepts a missing income comparison, sent as null', async () => {
    const metrics = { ...reliabilityResponse.metrics, income_coverage_ratio: null };
    answerWith({ ...reliabilityResponse, metrics });

    const reliability = await fetchReliability('user_1001', '2026-02-20');

    expect(reliability.metrics.income_coverage_ratio).toBeNull();
  });

  it('throws ApiError with status 400 when from is empty', async () => {
    await expect(fetchReliability('user_1001', '')).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'from is required',
    });
  });

  it('reports the message the backend sends with a failure', async () => {
    answerWith({ error: 'User not found' }, 404);

    const failure = fetchReliability('user_9999', '2026-02-20');

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 404, message: 'User not found' });
  });

  it('reports the message the gateway sends when the service is down', async () => {
    answerWith({ message: 'Service Unavailable' }, 503);
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      status: 503,
      message: 'Service Unavailable',
    });
  });

  it('prefers the error field when a response has both', async () => {
    answerWith({ error: 'User not found', message: 'Not Found' }, 404);
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      message: 'User not found',
    });
  });

  it('falls back to a plain message when the response has neither', async () => {
    answerWith({}, 500);
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toMatchObject({
      message: 'Request failed',
    });
  });

  it('throws ValidationError when the response is missing required fields', async () => {
    answerWith({});
    const error = await fetchReliability('user_1001', '2026-02-20').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ValidationError);
    // Any of the required fields would do; finding one in the message proves validation ran.
    expect((error as ValidationError).message).toMatch(/user_id|reliability_index|score_band/);
  });

  it('throws ValidationError for a score band it does not know', async () => {
    answerWith({ ...reliabilityResponse, score_band: 'UNKNOWN' });
    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

describe('fetchTransactionPage', () => {
  it('returns one page with the page number, limit, total, and has_more flag', async () => {
    const page = await fetchTransactionPage(window);
    expect(page.transactions).toHaveLength(500);
    expect(page.total).toBe(2000);
    expect(page.page).toBe(1);
    expect(page.limit).toBe(500);
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
  it('returns one flat list containing every transaction with no duplicates', async () => {
    const all = await fetchAllTransactions(window);
    expect(all).toHaveLength(2000);
    expect(new Set(all.map((tx) => tx.id)).size).toBe(2000);
  });

  it('asks for the next page with the page size from the settings', async () => {
    await fetchAllTransactions(window);
    expect(requestedUrl(1)).toContain('page=2');
    expect(requestedUrl(1)).toContain('limit=500');
  });

  it('stops asking for pages once the caller cancels', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      return Response.json({
        transactions: [transaction('tx_1')],
        total: 9,
        page: 1,
        limit: 500,
        has_more: true,
      });
    });

    await expect(
      fetchAllTransactions({ ...window, signal: controller.signal }),
    ).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skips a malformed transaction and keeps the rest of the page', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answerWith({
      transactions: [transaction('tx_good'), { id: 'tx_bad' }],
      total: 2,
      page: 1,
      limit: 500,
      has_more: false,
    });

    const all = await fetchAllTransactions(window);

    expect(all.map(({ id }) => id)).toEqual(['tx_good']);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('rejects when any page fails', async () => {
    answerWith({ error: 'boom' }, 500);
    await expect(fetchAllTransactions(window)).rejects.toBeInstanceOf(ApiError);
  });

  it('stops instead of looping forever when the backend reports more pages but sends an empty one', async () => {
    answerWith({ transactions: [], total: 10, page: 1, limit: 500, has_more: true });
    await expect(fetchAllTransactions(window)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 2000);
});

describe('fetchMerchantCategories', () => {
  it('returns the code, name and group of each category', async () => {
    const categories = [{ code: '6011', name: 'ATM Withdrawals', group: 'cash' }];
    answerWith({ categories });
    await expect(fetchMerchantCategories()).resolves.toEqual(categories);
  });

  it('throws a ValidationError when the response has no category list', async () => {
    answerWith({});
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
  it('returns the users and the stream host', async () => {
    answerWith({
      available_users: ['user_1001', 'user_1002'],
      sse: { base_url: 'https://stream.example.com/' },
    });

    await expect(fetchDiscovery()).resolves.toEqual({
      userIds: ['user_1001', 'user_1002'],
      streamBaseUrl: 'https://stream.example.com/',
    });
  });

  it('never falls back to the REST host for the stream', async () => {
    answerWith({ available_users: ['user_1001'] });
    expect((await fetchDiscovery()).streamBaseUrl).toBeUndefined();
  });

  it('also accepts a users array, since the spec does not pin the shape', async () => {
    answerWith({ users: ['user_1001', 'user_1002'] });
    expect((await fetchDiscovery()).userIds).toEqual(['user_1001', 'user_1002']);
  });

  it('also accepts a userIds array', async () => {
    answerWith({ userIds: ['user_2001'] });
    expect((await fetchDiscovery()).userIds).toEqual(['user_2001']);
  });

  it('falls back to the sample user when none of the known keys are present', async () => {
    answerWith({ endpoints: ['/api/users/:userId/reliability'] });
    expect((await fetchDiscovery()).userIds).toEqual(['user_1001']);
  });

  it('uses the sample user and no stream host when the response has an unexpected layout', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    answerWith({ available_users: 'not a list' });

    await expect(fetchDiscovery()).resolves.toEqual({
      userIds: ['user_1001'],
      streamBaseUrl: undefined,
    });
  });

  it('throws an ApiError when the discovery endpoint itself fails', async () => {
    answerWith({ error: 'boom' }, 500);
    await expect(fetchDiscovery()).rejects.toBeInstanceOf(ApiError);
  });

  it('passes on a failed request, since the network being down is a different problem', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchDiscovery()).rejects.toThrow('Network request failed');
  });
});
