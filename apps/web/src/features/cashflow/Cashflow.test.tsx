import { screen, waitFor } from '@testing-library/react';
import { type ReactElement, cloneElement } from 'react';
import type * as Recharts from 'recharts';
import { describe, expect, it, vi } from 'vitest';

import { fakeBackend } from '@/test-utils/fakeBackend';
import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Cashflow } from './Cashflow';

// The test page has no real size, so give the chart one to draw into.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof Recharts>()),
  ResponsiveContainer: ({ children }: { children: ReactElement<object> }) =>
    cloneElement(children, { width: 800, height: 320 } as object),
}));

/*
 * Drawing the chart is slow in the test page, and slower still on a busy or
 * shared machine such as GitHub's. These limits leave plenty of room, so the
 * tests fail only when something is really wrong, not because the machine was
 * busy.
 */
const CHART_WAIT_MS = 10_000;

describe('Cashflow', { timeout: 30_000 }, () => {
  it('renders the chart card heading once transactions resolve', async () => {
    renderWithProviders(<Cashflow />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: 'Monthly Cashflow' })).toBeInTheDocument();
      },
      { timeout: CHART_WAIT_MS },
    );
  });

  it('draws money in and money out side by side, not stacked', async () => {
    const { container } = renderWithProviders(<Cashflow />, SAMPLE_DASHBOARD_ROUTE);
    await screen.findAllByText(/€/, undefined, { timeout: CHART_WAIT_MS });

    await waitFor(
      () => {
        expect(container.querySelector('path[name="Inflow"]')).toBeInTheDocument();
        expect(container.querySelector('path[name="Outflow"]')).toBeInTheDocument();
      },
      { timeout: CHART_WAIT_MS },
    );

    const inflowX = container.querySelector('path[name="Inflow"]')?.getAttribute('x');
    const outflowX = container.querySelector('path[name="Outflow"]')?.getAttribute('x');
    expect(inflowX).not.toBe(outflowX);
  });

  it('shows the empty state when the window has no transactions', async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).includes('/transactions')
        ? Response.json({ transactions: [], total: 0, page: 1, limit: 500, has_more: false })
        : fakeBackend(input),
    );
    renderWithProviders(<Cashflow />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('No cashflow to show')).toBeInTheDocument();
  });

  it('uses the currency from the score response', async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      String(input).includes('/reliability')
        ? Response.json(buildReliabilityResponse({ response: { currency: 'USD' } }))
        : fakeBackend(input),
    );
    renderWithProviders(<Cashflow />, SAMPLE_DASHBOARD_ROUTE);
    expect(
      (await screen.findAllByText(/\$/, undefined, { timeout: CHART_WAIT_MS })).length,
    ).toBeGreaterThan(0);
  });
});
