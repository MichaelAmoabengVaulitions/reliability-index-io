import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Breakdown } from './Breakdown';

describe('Breakdown', () => {
  it('renders all four signal cards with the fixture values', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Regularity' })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Essential Payments Consistency' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resilience Adjustments' })).toBeInTheDocument();
  });

  it('shows the income regularity as a rounded percentage', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText('83%')).toBeInTheDocument();
    });
  });

  it('shows the income coverage ratio with two decimals and an x suffix', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText('1.41x')).toBeInTheDocument();
    });
  });

  it('shows the resilience total added up from the driver points', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    // The fixture has +13, -10 and -1.
    expect(await screen.findByText('+2 pts')).toBeInTheDocument();
    expect(screen.getByText(/-20 to \+25 pts/)).toBeInTheDocument();
  });

  it('shows zero points when no driver has any', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(
        buildReliabilityResponse({ response: { drivers: ['Income present in 0/6 months'] } }),
      ),
    );
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('0 pts')).toBeInTheDocument();
  });

  describe('the resilience bar', () => {
    function respondWithDrivers(drivers: string[]) {
      vi.mocked(fetch).mockImplementation(async () =>
        Response.json(buildReliabilityResponse({ response: { drivers } })),
      );
    }

    it('has a mark at zero, and runs right for positive points', async () => {
      respondWithDrivers(['Savings behavior detected (+11 pts)']);
      renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);

      const bar = await screen.findByRole('img', { name: /Resilience adjustments: \+11 pts/ });
      expect(bar.querySelector('[data-testid="zero-mark"]')).toBeInTheDocument();
      const fill = bar.querySelector<HTMLElement>('[data-testid="resilience-fill"]');
      expect(parseFloat(fill?.style.left ?? '')).toBeCloseTo(44.44, 1);
      expect(parseFloat(fill?.style.width ?? '')).toBeCloseTo(24.44, 1);
    });

    it('runs left of zero for negative points', async () => {
      respondWithDrivers(['Estimated 35 negative balance day(s) (-16 pts)']);
      renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);

      const bar = await screen.findByRole('img', { name: /Resilience adjustments: -16 pts/ });
      const fill = bar.querySelector<HTMLElement>('[data-testid="resilience-fill"]');
      expect(parseFloat(fill?.style.left ?? '')).toBeCloseTo(8.89, 1);
    });

    it('shows no fill at zero points, so zero does not look like a score', async () => {
      respondWithDrivers(['Income present in 0/6 months']);
      renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);

      const bar = await screen.findByRole('img', { name: /Resilience adjustments: 0 pts/ });
      expect(bar.querySelector('[data-testid="resilience-fill"]')).toHaveStyle({ width: '0%' });
    });
  });

  it('describes each percentage bar for screen readers', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByRole('img', { name: 'Income Regularity: 83%' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Essential Payments Consistency: 89%' }),
    ).toBeInTheDocument();
  });

  it('draws no bar for income coverage, because the API gives it no scale', async () => {
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    const heading = await screen.findByRole('heading', { name: 'Income Coverage Ratio' });
    expect(within(heading.closest('section') as HTMLElement).queryByRole('img')).toBeNull();
    expect(screen.getByText('1.41x')).toBeInTheDocument();
  });

  it('shows a dash on the coverage card when the ratio is null', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(buildReliabilityResponse({ metrics: { income_coverage_ratio: null } })),
    );
    renderWithProviders(<Breakdown />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Income Coverage Ratio' })).toBeInTheDocument();
    });
    const coverageCard = screen
      .getByRole('heading', { name: 'Income Coverage Ratio' })
      .closest('section');
    expect(coverageCard).toHaveTextContent('—');
  });
});
