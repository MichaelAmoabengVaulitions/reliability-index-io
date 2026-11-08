import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Overview } from './Overview';

describe('Overview', () => {
  it('shows the six key numbers', async () => {
    renderWithProviders(<Overview />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByRole('heading', { name: 'Key numbers' })).toBeInTheDocument();
    expect(await screen.findByText('Income regularity')).toBeInTheDocument();
    expect(screen.getByText('Income vs expenses')).toBeInTheDocument();
    expect(screen.getByText('Essential payments')).toBeInTheDocument();
    expect(screen.getByText('Good months')).toBeInTheDocument();
    expect(screen.getByText('Negative balance days')).toBeInTheDocument();
    expect(screen.getByText('Late fees')).toBeInTheDocument();
  });

  it('shows a dash for the income vs expenses tile when the coverage ratio is null', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(buildReliabilityResponse({ metrics: { income_coverage_ratio: null } })),
    );
    renderWithProviders(<Overview />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('—')).toBeInTheDocument();
    // The static description still tells the analyst what the tile measures.
    expect(screen.getByText('How far income covers essential expenses.')).toBeInTheDocument();
  });
});
