import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type RenderResult, render } from '@testing-library/react';
import { type ReactElement } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router';

interface RenderOptions {
  /** The starting URL or list of URLs the in-memory router opens with. */
  initialEntries?: string[];
  /** The route path the component is reached at. Defaults to '/'. */
  path?: string;
}

interface RenderWithProvidersResult extends RenderResult {
  /** The in-memory router, so a test can read the URL or move to a new one. */
  router: ReturnType<typeof createMemoryRouter>;
}

/** Opens a component on the dashboard URL for the sample user and date. */
export const SAMPLE_DASHBOARD_ROUTE: RenderOptions = {
  path: '/users/:userId',
  initialEntries: ['/users/user_1001?from=2026-02-28'],
};

/**
 * Draws a component wrapped in the same providers the real app uses:
 * a fresh React Query client and an in-memory router opened at the given URL.
 *
 * Every call builds a new React Query client so one test's cached data can
 * never leak into the next test.
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions = {},
): RenderWithProvidersResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const path = options.path ?? '/';
  const initialEntries = options.initialEntries ?? [path];
  const router = createMemoryRouter([{ path, element: ui }], { initialEntries });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { ...result, router };
}
