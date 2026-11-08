import type { QueryClient } from '@tanstack/react-query';
import type { LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from 'react-router';

import {
  discoveryQuery,
  merchantCategoriesQuery,
  reliabilityQuery,
  transactionsQuery,
} from '@/data/queries';
import { readFrom } from '@/domain/dashboardParams';
import { windowFor } from '@/domain/dates';

/*
 * The loaders start the fetches but don't wait for them. The page opens
 * straight away with its skeletons, and a failed request shows up on the card
 * it belongs to rather than taking down the whole page.
 */
export function rootLoader(queryClient: QueryClient) {
  return async () => {
    void queryClient.prefetchQuery(discoveryQuery);
    void queryClient.prefetchQuery(merchantCategoriesQuery);
    return null;
  };
}

export function dashboardLoader(queryClient: QueryClient) {
  return async ({ params, request }: Pick<LoaderFunctionArgs, 'params' | 'request'>) => {
    const { userId } = params;
    if (userId === undefined) return null;

    const from = readFrom(new URL(request.url).searchParams);
    const { start, end } = windowFor(from);
    void queryClient.prefetchQuery(reliabilityQuery(userId, from));
    void queryClient.prefetchQuery(transactionsQuery(userId, start, end));
    return null;
  };
}

// Filters, search and sort work on data we already have, so they don't need a reload.
export function shouldReloadDashboard({
  currentParams,
  nextParams,
  currentUrl,
  nextUrl,
}: Pick<
  ShouldRevalidateFunctionArgs,
  'currentParams' | 'nextParams' | 'currentUrl' | 'nextUrl'
>): boolean {
  return (
    currentParams.userId !== nextParams.userId ||
    readFrom(currentUrl.searchParams) !== readFrom(nextUrl.searchParams)
  );
}
