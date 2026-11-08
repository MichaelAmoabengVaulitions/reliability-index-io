import {
  ApiError,
  fetchAllTransactions,
  fetchDiscovery,
  fetchMerchantCategories,
  fetchReliability,
  transactionEventsUrl,
  ValidationError,
} from './client';

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

function transactionPage(ids: string[], hasMore: boolean, page = 1) {
  return { transactions: ids.map(transaction), total: 3, page, limit: 500, has_more: hasMore };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

function requestedUrl(call = 0): string {
  return fetchMock.mock.calls[call][0];
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('fetchReliability', () => {
  it('asks for the score at the end date and returns it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(reliabilityResponse));

    const reliability = await fetchReliability('user_1001', '2026-02-20');

    expect(requestedUrl()).toMatch(/\/api\/users\/user_1001\/reliability\?from=2026-02-20$/);
    expect(reliability.reliability_index).toBe(64);
  });

  it('accepts a missing income comparison, sent as null', async () => {
    const metrics = { ...reliabilityResponse.metrics, income_coverage_ratio: null };
    fetchMock.mockResolvedValue(jsonResponse({ ...reliabilityResponse, metrics }));

    const reliability = await fetchReliability('user_1001', '2026-02-20');

    expect(reliability.metrics.income_coverage_ratio).toBeNull();
  });

  it('reports the message the backend sends with a failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'User not found' }, 404));

    const failure = fetchReliability('user_9999', '2026-02-20');

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ status: 404, message: 'User not found' });
  });

  it('reports the message the gateway sends with a failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Too many requests, slow down' }, 429));

    const failure = fetchReliability('user_1001', '2026-02-20');

    await expect(failure).rejects.toMatchObject({
      status: 429,
      message: 'Too many requests, slow down',
    });
  });

  it('rejects a response that does not match what we expect', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...reliabilityResponse, score_band: 'UNKNOWN' }));

    await expect(fetchReliability('user_1001', '2026-02-20')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('stops when the caller cancels', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchReliability('user_1001', '2026-02-20', controller.signal)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fetchAllTransactions', () => {
  const window = { userId: 'user_1001', from: '2025-09-01', to: '2026-02-20' };

  it('joins every page into one list', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(transactionPage(['1', '2'], true)))
      .mockResolvedValueOnce(jsonResponse(transactionPage(['3'], false, 2)));

    const transactions = await fetchAllTransactions(window);

    expect(transactions.map(({ id }) => id)).toEqual(['1', '2', '3']);
    expect(requestedUrl(1)).toContain('page=2');
    expect(requestedUrl(1)).toContain('limit=500');
  });

  it('stops on an empty page even if the backend says there is more', async () => {
    fetchMock.mockResolvedValue(jsonResponse(transactionPage([], true)));

    await expect(fetchAllTransactions(window)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves out one bad row and keeps the rest', async () => {
    const page = transactionPage(['1'], false);
    fetchMock.mockResolvedValue(
      jsonResponse({ ...page, transactions: [...page.transactions, { id: 'broken' }] }),
    );

    const transactions = await fetchAllTransactions(window);

    expect(transactions.map(({ id }) => id)).toEqual(['1']);
  });
});

describe('fetchMerchantCategories', () => {
  it('returns the category names', async () => {
    const categories = [{ code: '5411', name: 'Groceries', group: 'Essentials' }];
    fetchMock.mockResolvedValue(jsonResponse({ categories }));

    await expect(fetchMerchantCategories()).resolves.toEqual(categories);
  });
});

describe('fetchDiscovery', () => {
  it('returns the users and the stream host', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        available_users: ['user_1001', 'user_1002'],
        sse: { base_url: 'https://stream.example.com/' },
      }),
    );

    await expect(fetchDiscovery()).resolves.toEqual({
      userIds: ['user_1001', 'user_1002'],
      streamBaseUrl: 'https://stream.example.com/',
    });
  });

  it('never falls back to the REST host for the stream', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ available_users: ['user_1001'] }));

    const discovery = await fetchDiscovery();

    expect(discovery.streamBaseUrl).toBeUndefined();
  });

  it('uses the sample user when the response has an unexpected layout', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ available_users: 'not a list' }));

    await expect(fetchDiscovery()).resolves.toEqual({
      userIds: ['user_1001'],
      streamBaseUrl: undefined,
    });
  });

  it('passes on a failed request', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(fetchDiscovery()).rejects.toThrow('Network request failed');
  });
});

describe('transactionEventsUrl', () => {
  it('avoids a double slash when the stream host ends in one', () => {
    expect(transactionEventsUrl('https://stream.example.com/', 'user_1001')).toBe(
      'https://stream.example.com/api/users/user_1001/transaction-events',
    );
  });
});
