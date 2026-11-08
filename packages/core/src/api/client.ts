import type { z } from '../zod';
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

/*
 * The settings each app passes in. Core reads no environment variables, so each
 * app decides its own host, for example from its .env file.
 */
export interface ApiSettings {
  baseUrl: string;
  requestTimeoutMs: number;
  transactionPageLimit: number;
  // Used when the discovery response has no usable list, so the picker is never empty.
  fallbackUserIds: readonly string[];
}

export function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

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

export interface FetchTransactionPageOptions {
  userId: string;
  from: string;
  to: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}

export interface TransactionWindow {
  userId: string;
  from: string;
  to: string;
  signal?: AbortSignal;
}

export interface Discovery {
  userIds: readonly string[];
  // Undefined when the backend names no stream host. The REST host never stands in for it.
  streamBaseUrl: string | undefined;
}

export interface ApiClient {
  fetchReliability(userId: string, from: string, signal?: AbortSignal): Promise<ReliabilityResponse>;
  fetchTransactionPage(options: FetchTransactionPageOptions): Promise<OffsetPaginatedResponse>;
  fetchAllTransactions(window: TransactionWindow): Promise<Transaction[]>;
  fetchMerchantCategories(): Promise<MerchantCategory[]>;
  fetchDiscovery(): Promise<Discovery>;
}

const FIRST_PAGE = 1;

export function createApiClient(settings: ApiSettings): ApiClient {
  const baseUrl = trimTrailingSlashes(settings.baseUrl);

  /*
   * The signal lets React Query cancel a request nobody needs any more. The
   * timeout uses the same abort, so we track which of the two happened: a
   * timeout is an error to show, and a cancel is not.
   */
  async function request<S extends z.ZodType>(
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
    }, settings.requestTimeoutMs);
    signal?.addEventListener('abort', cancel);

    try {
      const response = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
      return await readResponse(response, path, schema);
    } catch (error) {
      if (timedOut) throw new ApiError(0, path, 'The request timed out.');
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }

  function fetchReliability(
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

  /*
   * Asks the backend for one page of transactions. The backend splits the list
   * into numbered pages, so we send a page number and a page size every time,
   * and it tells us with has_more whether any pages are left.
   */
  function fetchTransactionPage({
    userId,
    from,
    to,
    page = FIRST_PAGE,
    limit = settings.transactionPageLimit,
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

  /*
   * Asks the backend for one page at a time and joins the results into a single
   * list. We stop when the backend says there is no more data (has_more is false).
   */
  async function fetchAllTransactions({
    userId,
    from,
    to,
    signal,
  }: TransactionWindow): Promise<Transaction[]> {
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

  async function fetchMerchantCategories(): Promise<MerchantCategory[]> {
    const response = await request(
      '/api/dictionaries/merchant-categories',
      merchantCategoriesResponseSchema,
    );
    return response.categories;
  }

  function pickUserIds(discovery: DiscoveryResponse): readonly string[] {
    const userIdLists = [discovery.available_users, discovery.users, discovery.userIds];
    const firstFilledList = userIdLists.find((list) => list !== undefined && list.length > 0);
    return firstFilledList ?? settings.fallbackUserIds;
  }

  /*
   * Asks the discovery endpoint which user ids are available and where the live
   * events are served from. The API specification does not say what this
   * response looks like, so we accept any of the three field names the backend
   * has used ('available_users', 'users' or 'userIds'). If the response has none
   * of them, or does not match what we expect, we fall back to a small sample
   * list so the picker is never empty. A failed request is different: that is
   * passed back to the caller, because the network being down is not the same
   * problem as an unexpected response.
   *
   * The stream host comes only from sse.base_url. The REST host does not serve
   * the stream, so when sse.base_url is missing there is no stream to open.
   */
  async function fetchDiscovery(): Promise<Discovery> {
    try {
      const discovery = await request('/', discoveryResponseSchema);
      return { userIds: pickUserIds(discovery), streamBaseUrl: discovery.sse?.base_url };
    } catch (error) {
      if (error instanceof ValidationError) {
        console.warn(
          'Discovery response did not match the expected layout; falling back to the sample list.',
          error,
        );
        return { userIds: settings.fallbackUserIds, streamBaseUrl: undefined };
      }
      throw error;
    }
  }

  return {
    fetchReliability,
    fetchTransactionPage,
    fetchAllTransactions,
    fetchMerchantCategories,
    fetchDiscovery,
  };
}

// The stream host's URL ends in a slash, and a double slash gives a 404.
export function transactionEventsUrl(streamBaseUrl: string, userId: string): string {
  const base = trimTrailingSlashes(streamBaseUrl);
  return `${base}/api/users/${encodeURIComponent(userId)}/transaction-events`;
}
