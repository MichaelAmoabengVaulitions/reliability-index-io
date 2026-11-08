import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { fakeBackend } from '@/test-utils/fakeBackend';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { UserPicker } from './UserPicker';

describe('UserPicker', () => {
  it('renders a dropdown listing the discovered user ids', async () => {
    renderWithProviders(<UserPicker />);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'user_1001' })).toBeInTheDocument();
    });
  });

  it('shows a loading status while the discovery request is in flight', () => {
    renderWithProviders(<UserPicker />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  });

  it('shows an error status when the discovery endpoint fails', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    renderWithProviders(<UserPicker />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load users/i);
    });
  });

  it('offers a retry when the user list fails, and shows the list once it loads', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    renderWithProviders(<UserPicker />);
    const retryButton = await screen.findByRole('button', { name: 'Try again' });

    vi.mocked(fetch).mockImplementation(fakeBackend);
    await user.click(retryButton);

    expect(await screen.findByRole('option', { name: 'user_1001' })).toBeInTheDocument();
  });

  it('opens the picked user with a fresh window and no filters', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<UserPicker />, {
      path: '*',
      initialEntries: ['/users/user_2002?from=2026-02-28&sign=inflow'],
    });

    await user.selectOptions(await screen.findByRole('combobox'), 'user_1001');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/users/user_1001');
    });
    expect(router.state.location.search).toBe('');
  });
});
