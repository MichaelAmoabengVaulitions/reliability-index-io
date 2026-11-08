import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactElement, type ReactNode } from 'react';

type Wrapper = ({ children }: { children: ReactNode }) => ReactElement;

/**
 * Creates a fresh React Query client together with a wrapper bound to it.
 *
 * A new client for each test means the cache, in-flight queries, and retry
 * state cannot leak from one test into the next. Retries are turned off so a
 * failed request shows up at once. The client is returned alongside the
 * wrapper for tests that need to read or seed the cache directly.
 */
export function createQueryClientAndWrapper(): { queryClient: QueryClient; wrapper: Wrapper } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    wrapper: function QueryWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

/** Wraps a hook or component under test with a fresh React Query client. */
export function createQueryWrapper(): Wrapper {
  return createQueryClientAndWrapper().wrapper;
}
