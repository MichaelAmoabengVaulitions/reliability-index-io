import type { z } from 'zod';

import { config } from '@/config';

import {
  type DiscoveryResponse,
  type MerchantCategory,
  type OffsetPaginatedResponse,
  type ReliabilityResponse,
  type Transaction,
  discoveryResponseSchema,
  merchantCategoriesResponseSchema,
  offsetPaginatedSchema,
  reliabilityResponseSchema,
} from './schemas';

export function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL: string = trimTrailingSlashes(
  import.meta.env.VITE_API_BASE_URL ?? config.api.baseUrl,
);

export class ApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.path = path;
  }
}

export class ValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(message: string, issues: z.core.$ZodIssue[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body !== null && typeof body === 'object') {
      // Our API sends `error`. The gateway in front of it sends `message`.
      if ('error' in body && typeof body.error === 'string') return body.error;
      if ('message' in body && typeof body.message === 'string') return body.message;
    }
  } catch {
    // The body was not JSON, so use the fallback message instead.
  }
  return fallback;
}

async function readJson(response: Response, path: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ApiError(response.status, path, `Response from ${path} was not valid JSON.`);
    }
    throw error;
  }
}

async function readResponse<S extends z.ZodType>(
  response: Response,
  path: string,
  schema: S,
): Promise<z.infer<S>> {
  if (!response.ok) {
    const message = await readErrorMessage(response, response.statusText || 'Request failed');
    throw new ApiError(response.status, path, message);
  }
  const body = await readJson(response, path);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const summary = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ValidationError(
      `Response from ${path} did not match what we expected: ${summary}`,
      parsed.error.issues,
    );
  }
  return parsed.data;
}

/*
 * The signal lets React Query cancel a request nobody needs any more. The
 * timeout uses the same abort, so we track which of the two happened: a
 * timeout is an error to show, and a cancel is not.
 */
export async function request<S extends z.ZodType>(
  path: string,
  schema: S,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  signal?.throwIfAborted();

  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.api.requestTimeoutMs);
  signal?.addEventListener('abort', cancel);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    return await readResponse(response, path, schema);
  } catch (error) {
    if (timedOut) throw new ApiError(0, path, 'The request timed out.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

export function fetchReliability(
  userId: string,
  from: string,
  signal?: AbortSignal,
): Promise<ReliabilityResponse> {
  const search = new URLSearchParams({ from });
  return request(
    `/api/users/${encodeURIComponent(userId)}/reliability?${search.toString()}`,
    reliabilityResponseSchema,
    signal,
  );
}

interface FetchTransactionPageOptions {
  userId: string;
  from: string;
  to: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

const FIRST_PAGE = 1;

/*
 * Asks the backend for one page of transactions. The backend splits the list
 * into numbered pages, so we send a page number and a page size every time,
 * and it tells us with has_more whether any pages are left.
 */
export function fetchTransactionPage({
  userId,
  from,
  to,
  page = FIRST_PAGE,
  limit = config.api.transactionPageLimit,
  signal,
}: FetchTransactionPageOptions): Promise<OffsetPaginatedResponse> {
  const search = new URLSearchParams({
    from,
    to,
    page: String(page),
    limit: String(limit),
  });
  return request(
    `/api/users/${encodeURIComponent(userId)}/transactions?${search.toString()}`,
    offsetPaginatedSchema,
    signal,
  );
}

interface FetchAllTransactionsOptions {
  userId: string;
  from: string;
  to: string;
  signal?: AbortSignal;
}

/*
 * Asks the backend for one page at a time and joins the results into a single
 * list. We stop when the backend says there is no more data (has_more is false).
 */
export async function fetchAllTransactions({
  userId,
  from,
  to,
  signal,
}: FetchAllTransactionsOptions): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = FIRST_PAGE;
  while (true) {
    const result = await fetchTransactionPage({ userId, from, to, page, signal });
    all.push(...result.transactions);
    /*
     * Stop when there are no more pages, or when the backend reports more but
     * sends an empty one. Without the empty-page check, a wrong has_more flag
     * would loop forever.
     */
    if (!result.has_more || result.transactions.length === 0) return all;
    page += 1;
  }
}

export async function fetchMerchantCategories(): Promise<MerchantCategory[]> {
  const response = await request(
    '/api/dictionaries/merchant-categories',
    merchantCategoriesResponseSchema,
  );
  return response.categories;
}

export interface Discovery {
  userIds: readonly string[];
  streamBaseUrl: string;
}

function pickUserIds(discovery: DiscoveryResponse): readonly string[] {
  const userIdLists = [discovery.available_users, discovery.users, discovery.userIds];
  const firstFilledList = userIdLists.find((list) => list !== undefined && list.length > 0);
  return firstFilledList ?? config.api.fallbackUserIds;
}

/*
 * Asks the discovery endpoint which user ids are available and where the live
 * events are served from. The API specification does not say what this
 * response looks like, so we accept any of the three field names the backend
 * has used ('available_users', 'users' or 'userIds'). If the response has none
 * of them, or does not match what we expect, we fall back to a small sample
 * list so the dropdown is never empty. A failed request is different: that is
 * passed back to the caller, because the network being down is not the same
 * problem as an unexpected response.
 */
export async function fetchDiscovery(): Promise<Discovery> {
  try {
    const discovery = await request('/', discoveryResponseSchema);
    return {
      userIds: pickUserIds(discovery),
      streamBaseUrl: discovery.sse?.base_url ?? API_BASE_URL,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn(
        'Discovery response did not match the expected layout; falling back to the sample list.',
        error,
      );
      return { userIds: config.api.fallbackUserIds, streamBaseUrl: API_BASE_URL };
    }
    throw error;
  }
}

// The streaming host's URL ends in a slash, and a double slash gives a 404.
export function transactionEventsUrl(baseUrl: string, userId: string): string {
  const base = trimTrailingSlashes(baseUrl);
  return `${base}/api/users/${encodeURIComponent(userId)}/transaction-events`;
}
