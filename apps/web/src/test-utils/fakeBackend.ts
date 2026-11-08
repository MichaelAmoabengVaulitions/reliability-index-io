import { buildReliabilityResponse } from './fixtures/reliability';
import { buildTransactions } from './fixtures/transactions';

export const STREAM_BASE_URL = 'https://stream.example.test/';

const TRANSACTION_COUNT = 2000;

const MERCHANT_CATEGORIES = [
  { code: '5411', name: 'Grocery Stores', group: 'essential' },
  { code: '4900', name: 'Utilities', group: 'essential' },
  { code: '6011', name: 'ATM Withdrawals', group: 'cash' },
];

function reliabilityResponse(url: URL): Response {
  if (!url.searchParams.get('from')) {
    return Response.json({ error: 'from is required' }, { status: 400 });
  }
  return Response.json(buildReliabilityResponse());
}

function transactionsResponse(url: URL): Response {
  const page = Number(url.searchParams.get('page'));
  const limit = Number(url.searchParams.get('limit'));
  const all = buildTransactions(TRANSACTION_COUNT, {
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });
  const start = (page - 1) * limit;
  return Response.json({
    transactions: all.slice(start, start + limit),
    total: all.length,
    page,
    limit,
    has_more: start + limit < all.length,
  });
}

/**
 * Stands in for `fetch` in every test, so the real API client runs without the
 * network. It answers the routes the app calls, in the same shape as the
 * hosted API. A test that needs something else replaces it for that test:
 *
 *   vi.mocked(fetch).mockImplementation(async () => Response.json({}));
 */
export async function fakeBackend(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(String(input));
  if (url.pathname === '/') {
    return Response.json({
      available_users: ['user_1001', 'user_1002'],
      sse: { base_url: STREAM_BASE_URL },
    });
  }
  if (url.pathname.endsWith('/merchant-categories')) {
    return Response.json({ categories: MERCHANT_CATEGORIES });
  }
  if (url.pathname.endsWith('/reliability')) return reliabilityResponse(url);
  if (url.pathname.endsWith('/transactions')) return transactionsResponse(url);
  throw new Error(`The fake backend has no response for ${url.href}`);
}
