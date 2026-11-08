import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { appRoutes } from './appRoutes';

const topBar = vi.hoisted(() => ({ crashes: false }));

vi.mock('./TopBar', () => ({
  TopBar: () => {
    if (topBar.crashes) throw new Error('The top bar broke');
    return null;
  },
}));

function renderAt(url: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(appRoutes(queryClient), { initialEntries: [url] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  topBar.crashes = false;
});

describe('appRoutes', () => {
  it('shows the start page at the root', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: /pick a user/i })).toBeInTheDocument();
  });

  it('shows a page not found message at an unknown address', async () => {
    renderAt('/no-such-page');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the dashboard/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('shows page not found for an address below a user', async () => {
    renderAt('/users/user_1001/extra');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows a recovery message when the page frame crashes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    topBar.crashes = true;

    renderAt('/');

    expect(await screen.findByRole('alert')).toHaveTextContent('The top bar broke');
    consoleError.mockRestore();
  });
});
