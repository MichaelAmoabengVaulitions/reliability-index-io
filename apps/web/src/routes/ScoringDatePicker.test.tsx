import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { ScoringDatePicker } from './ScoringDatePicker';

const USER_ROUTE = { path: '/users/:userId' };
const USER_ROUTE_ENTRY = { ...USER_ROUTE, initialEntries: ['/users/user_1001'] };

function datePicker() {
  return screen.getByLabelText(/scoring window ends/i);
}

function typeDate(value: string) {
  fireEvent.change(datePicker(), { target: { value } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-30T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ScoringDatePicker', () => {
  it('shows the date from the URL', () => {
    renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-05-31'],
    });
    expect(datePicker()).toHaveValue('2026-05-31');
  });

  it('limits the choice to the earliest full window and today', () => {
    renderWithProviders(<ScoringDatePicker />, USER_ROUTE);
    expect(datePicker()).toHaveAttribute('min', '2026-02-28');
    expect(datePicker()).toHaveAttribute('max', '2026-10-30');
  });

  it('puts a picked date in the URL and keeps the filters', async () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?sign=inflow'],
    });

    typeDate('2026-05-31');

    await waitFor(() => {
      expect(router.state.location.search).toBe('?sign=inflow&from=2026-05-31');
    });
  });

  it('adds a back button step, so the analyst can return to the previous date', async () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-05-31'],
    });

    typeDate('2026-06-30');
    await waitFor(() => expect(datePicker()).toHaveValue('2026-06-30'));

    await act(async () => {
      await router.navigate(-1);
    });

    await waitFor(() => expect(datePicker()).toHaveValue('2026-05-31'));
  });

  it('goes back to today when the date is cleared', async () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-05-31'],
    });

    typeDate('');

    await waitFor(() => expect(router.state.location.search).toBe(''));
    expect(datePicker()).toHaveValue('2026-10-30');
  });

  it('goes back to today when the URL loses its date, even right after typing', async () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, USER_ROUTE_ENTRY);

    typeDate('2026-10-02');
    await waitFor(() => expect(router.state.location.search).toBe('?from=2026-10-02'));

    await act(async () => {
      await router.navigate('/users/user_1002');
    });

    await waitFor(() => expect(datePicker()).toHaveValue('2026-10-30'));
  });

  it('drops a half-typed date when the user changes', async () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, USER_ROUTE_ENTRY);

    typeDate('0202-05-31');
    await act(async () => {
      await router.navigate('/users/user_1002?from=2026-05-31');
    });

    await waitFor(() => expect(datePicker()).toHaveValue('2026-05-31'));
  });

  it('leaves the URL alone while a date outside the range is being typed', () => {
    const { router } = renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-05-31'],
    });

    typeDate('0202-05-31');

    expect(datePicker()).toHaveValue('0202-05-31');
    expect(router.state.location.search).toBe('?from=2026-05-31');
  });

  it('puts the URL date back if the analyst leaves the box on a date outside the range', () => {
    renderWithProviders(<ScoringDatePicker />, {
      ...USER_ROUTE,
      initialEntries: ['/users/user_1001?from=2026-05-31'],
    });

    typeDate('2020-01-01');
    fireEvent.blur(datePicker());

    expect(datePicker()).toHaveValue('2026-05-31');
  });
});
