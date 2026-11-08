import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { todayAsIsoDate } from '@/domain/dates';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { useDashboardParams } from './useDashboardParams';

function Harness() {
  const { userId, from, filters, updateFilters, resetFilters } = useDashboardParams();
  return (
    <div>
      <p data-testid="user">{userId}</p>
      <p data-testid="from">{from}</p>
      <p data-testid="sign">{filters.sign}</p>
      <button type="button" onClick={() => updateFilters({ sign: 'inflow' })}>
        Money in
      </button>
      <button type="button" onClick={resetFilters}>
        Reset
      </button>
    </div>
  );
}

const USER_ROUTE = { path: '/users/:userId' };

describe('useDashboardParams', () => {
  it('reads the user, the date and the filters from the URL', () => {
    renderWithProviders(<Harness />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-02-28&sign=outflow'],
    });
    expect(screen.getByTestId('user')).toHaveTextContent('user_1001');
    expect(screen.getByTestId('from')).toHaveTextContent('2026-02-28');
    expect(screen.getByTestId('sign')).toHaveTextContent('outflow');
  });

  it('gives an empty user id and the default date when the URL has neither', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByTestId('user')).toBeEmptyDOMElement();
    expect(screen.getByTestId('from')).toHaveTextContent(todayAsIsoDate());
  });

  it('changes one filter and leaves the rest of the URL alone', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Harness />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-02-28&search=Amazon'],
    });

    await user.click(screen.getByRole('button', { name: 'Money in' }));

    await waitFor(() => {
      expect(screen.getByTestId('sign')).toHaveTextContent('inflow');
    });
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('from')).toBe('2026-02-28');
    expect(params.get('search')).toBe('Amazon');
    expect(router.state.location.pathname).toBe('/users/user_1001');
  });

  it('resets the filters but keeps the date', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Harness />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-02-28&sign=outflow&search=Amazon'],
    });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?from=2026-02-28');
    });
  });

  it('does not add a back button step when a filter changes', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<Harness />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1000', '/users/user_1001'],
    });

    await user.click(screen.getByRole('button', { name: 'Money in' }));
    await waitFor(() => {
      expect(screen.getByTestId('sign')).toHaveTextContent('inflow');
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user_1000');
    });
  });

  it('follows the URL when the analyst goes back', async () => {
    const { router } = renderWithProviders(<Harness />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001'],
    });

    await act(async () => {
      await router.navigate('/users/user_1001?sign=outflow');
    });
    await waitFor(() => {
      expect(screen.getByTestId('sign')).toHaveTextContent('outflow');
    });

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sign')).toHaveTextContent('all');
    });
  });
});
