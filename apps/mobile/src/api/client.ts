import type { z } from '@reliability-index/core/zod';

import { apiSettings } from './apiSettings';
import {
  discoveryResponseSchema,
  merchantCategoriesResponseSchema,
  offsetPaginatedSchema,
  reliabilityResponseSchema,
  type DiscoveryResponse,
  type MerchantCategory,
  type OffsetPaginatedResponse,
  type ReliabilityResponse,
  type Transaction,
} from '@reliability-index/core/api/schemas';

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, '');
}

const apiBaseUrl = trimTrailingSlashes(apiSettings.baseUrl);

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

async function readResponse<Schema extends z.ZodType>(
  response: Response,
  path: string,
  schema: Schema,
): Promise<z.infer<Schema>> {
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
async function request<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  signal?: AbortSignal,
): Promise<z.infer<Schema>> {
  if (signal?.aborted) throw new Error('The request was cancelled.');

  const controller = new AbortController();
  const cancel = () => controller.abort();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, apiSettings.requestTimeoutMs);
  signal?.addEventListener('abort', cancel);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, { signal: controller.signal });
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

interface TransactionWindow {
  userId: string;
  from: string;
  to: string;
  signal?: AbortSignal;
}

const firstPage = 1;

function fetchTransactionPage(
  { userId, from, to, signal }: TransactionWindow,
  page: number,
): Promise<OffsetPaginatedResponse> {
  const search = new URLSearchParams({
    from,
    to,
    page: String(page),
    limit: String(apiSettings.transactionPageLimit),
  });
  return request(
    `/api/users/${encodeURIComponent(userId)}/transactions?${search.toString()}`,
    offsetPaginatedSchema,
    signal,
  );
}

export async function fetchAllTransactions(window: TransactionWindow): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  let page = firstPage;
  while (true) {
    const result = await fetchTransactionPage(window, page);
    transactions.push(...result.transactions);
    // The empty page check stops a wrong has_more flag from looping forever.
    if (!result.has_more || result.transactions.length === 0) return transactions;
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
  // Undefined when the backend names no stream host. The REST host never stands in for it.
  streamBaseUrl: string | undefined;
}

function pickUserIds(discovery: DiscoveryResponse): readonly string[] {
  const userIdLists = [discovery.available_users, discovery.users, discovery.userIds];
  const firstFilledList = userIdLists.find((list) => list !== undefined && list.length > 0);
  return firstFilledList ?? apiSettings.fallbackUserIds;
}

/*
 * An unexpected layout falls back to the sample user so the picker is never
 * empty. A failed request is passed on, because the network being down is a
 * different problem.
 */
export async function fetchDiscovery(): Promise<Discovery> {
  try {
    const discovery = await request('/', discoveryResponseSchema);
    return { userIds: pickUserIds(discovery), streamBaseUrl: discovery.sse?.base_url };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn('Discovery response had an unexpected layout; using the sample user.', error);
      return { userIds: apiSettings.fallbackUserIds, streamBaseUrl: undefined };
    }
    throw error;
  }
}

// The stream host's URL ends in a slash, and a double slash gives a 404.
export function transactionEventsUrl(streamBaseUrl: string, userId: string): string {
  const base = trimTrailingSlashes(streamBaseUrl);
  return `${base}/api/users/${encodeURIComponent(userId)}/transaction-events`;
}
