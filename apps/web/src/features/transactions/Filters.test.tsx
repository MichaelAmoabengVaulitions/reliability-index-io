import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { config } from '@/config';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { Filters } from './Filters';

function urlParam(search: string, name: string): string | null {
  return new URLSearchParams(search).get(name);
}

describe('Filters', () => {
  it('shows the search box and the inflow/outflow controls', () => {
    renderWithProviders(<Filters availableCategoryCodes={['5411']} />);

    expect(screen.getByPlaceholderText(/search merchant/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inflow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outflow' })).toBeInTheDocument();
  });

  it('shows the choices already in the URL', () => {
    renderWithProviders(<Filters availableCategoryCodes={['5411']} />, {
      initialEntries: ['/?search=coffee&sign=inflow&categories=5411&sort=merchant_name:desc'],
    });

    expect(screen.getByPlaceholderText(/search merchant/i)).toHaveValue('coffee');
    expect(screen.getByRole('button', { name: 'Inflow' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Categories (1)')).toBeInTheDocument();
    expect(screen.getByLabelText(/sort/i)).toHaveValue('merchant_name:desc');
  });

  it('puts what the analyst types into the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={[]} />);

    await user.type(screen.getByPlaceholderText(/search merchant/i), 'coffee');

    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'search')).toBe('coffee');
    });
  });

  it('puts the money in or out choice into the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={[]} />);

    await user.click(screen.getByRole('button', { name: 'Outflow' }));

    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'sign')).toBe('outflow');
    });
  });

  it('adds a category to the URL, and removes it when it is unticked', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={['5411']} />);

    await user.click(screen.getByText('Categories'));
    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'categories')).toBe('5411');
    });

    await user.click(screen.getByRole('checkbox'));
    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'categories')).toBeNull();
    });
  });

  it("shows the backend's category names, and the raw code when it has no name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Filters availableCategoryCodes={['6011', '9999']} />);

    await user.click(screen.getByText('Categories'));

    expect(await screen.findByText('ATM Withdrawals')).toBeInTheDocument();
    expect(screen.getAllByText('9999')).toHaveLength(2);
  });

  it('shows raw codes when the category names fail to load', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    const user = userEvent.setup();
    renderWithProviders(<Filters availableCategoryCodes={['6011']} />);

    await user.click(screen.getByText('Categories'));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.getAllByText('6011')).toHaveLength(2);
  });

  it('lets the analyst untick a selected category that is not in the current data', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={['5411']} />, {
      initialEntries: ['/?categories=6011'],
    });

    await user.click(screen.getByText('Categories (1)'));
    await user.click(screen.getByRole('checkbox', { name: /ATM Withdrawals|6011/ }));

    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'categories')).toBeNull();
    });
  });

  describe('closing the Categories dropdown', () => {
    async function openDropdown() {
      const user = userEvent.setup();
      renderWithProviders(<Filters availableCategoryCodes={['5411']} />);
      await user.click(screen.getByText('Categories'));
      const dropdown = screen.getByText('Categories').closest('details');
      expect(dropdown).toHaveAttribute('open');
      return { user, dropdown };
    }

    it('closes on a click outside', async () => {
      const { user, dropdown } = await openDropdown();
      await user.click(document.body);
      expect(dropdown).not.toHaveAttribute('open');
    });

    it('closes on Escape', async () => {
      const { user, dropdown } = await openDropdown();
      await user.keyboard('{Escape}');
      expect(dropdown).not.toHaveAttribute('open');
    });

    it('stays open when a category inside it is ticked', async () => {
      const { user, dropdown } = await openDropdown();
      await user.click(screen.getByRole('checkbox'));
      expect(dropdown).toHaveAttribute('open');
    });
  });

  it('puts the sort choice into the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={[]} />);

    await user.selectOptions(screen.getByLabelText(/sort/i), 'amount:desc');

    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'sort')).toBe('amount:desc');
    });
  });

  it('clears the search box when the URL search is cleared and does not restore the old term', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Filters availableCategoryCodes={[]} />);
    const searchBox = screen.getByPlaceholderText(/search merchant/i);

    await user.type(searchBox, 'no-such-merchant');
    await waitFor(() => {
      expect(urlParam(router.state.location.search, 'search')).toBe('no-such-merchant');
    });

    // Stands in for the "Clear filters" button or the back button.
    await act(async () => {
      await router.navigate('/');
    });

    await waitFor(() => {
      expect(searchBox).toHaveValue('');
    });

    // Wait past the debounce: the old term must not creep back into the URL.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, config.ui.searchDebounceMs * 2));
    });

    expect(urlParam(router.state.location.search, 'search')).toBeNull();
    expect(searchBox).toHaveValue('');
  });
});
