import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Explorer } from './Explorer';

const IDLE_STREAM = { status: 'idle', eventCount: 0 } as const;

describe('Explorer', () => {
  it('shows the live badge and the update count from the stream it is given', async () => {
    renderWithProviders(
      <Explorer stream={{ status: 'open', eventCount: 2 }} />,
      SAMPLE_DASHBOARD_ROUTE,
    );
    expect(await screen.findByText(/2 live updates/, undefined, { timeout: 4000 })).toBeVisible();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders the transactions card heading once data resolves', async () => {
    renderWithProviders(<Explorer stream={IDLE_STREAM} />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it('shows the count footer with the total transactions loaded', async () => {
    renderWithProviders(<Explorer stream={IDLE_STREAM} />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(
      () => {
        expect(screen.getByText(/Showing/)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    /*
     * The fixture builds 2000 transactions for the default scoring window; both
     * "visible" and "total" land on 2000 when no filters are applied.
     */
    expect(screen.getAllByText('2000')).toHaveLength(2);
  });

  it('applies filters from the URL and clears them, keeping the date', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Explorer stream={IDLE_STREAM} />, {
      ...SAMPLE_DASHBOARD_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-02-28&search=no-such-merchant'],
    });

    const clearButton = await screen.findByRole(
      'button',
      { name: 'Clear filters' },
      { timeout: 4000 },
    );
    await user.click(clearButton);

    await waitFor(() => {
      expect(router.state.location.search).toBe('?from=2026-02-28');
    });
    expect(await screen.findByText(/Showing/)).toBeInTheDocument();
  });
});
