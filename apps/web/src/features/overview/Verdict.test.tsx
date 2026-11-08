import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Verdict } from './Verdict';

function respondWithScore(reliabilityIndex: number, scoreBand: 'LOW' | 'MEDIUM' | 'HIGH') {
  vi.mocked(fetch).mockImplementation(async () =>
    Response.json(
      buildReliabilityResponse({
        response: { reliability_index: reliabilityIndex, score_band: scoreBand },
      }),
    ),
  );
}

describe('Verdict', () => {
  it('shows the score and the band', async () => {
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('64')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
  });

  it('says how far the score is from the nearest band edge', async () => {
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText(/11 points below High/)).toBeInTheDocument();
  });

  it('shows the scoring window and the currency', async () => {
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText(/Sep 2025 to Feb 2026/)).toBeInTheDocument();
    expect(screen.getByText(/EUR/)).toBeInTheDocument();
  });

  it('marks the score on the scale, and describes it for screen readers', async () => {
    respondWithScore(81, 'HIGH');
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);

    const scale = await screen.findByRole('img', { name: 'Score 81 on a scale of 0 to 100' });
    expect(scale.querySelector('[data-testid="score-marker"]')).toHaveStyle({ left: '81%' });
  });

  it('marks the band edges on the scale', async () => {
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByText('50')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it.each([
    [0, 'LOW'],
    [100, 'HIGH'],
  ] as const)('keeps the marker on the scale at %i', async (score, band) => {
    respondWithScore(score, band);
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);

    const scale = await screen.findByRole('img', { name: /on a scale of 0 to 100/ });
    expect(scale.querySelector('[data-testid="score-marker"]')).toHaveStyle({ left: `${score}%` });
  });

  it('shows an error with a retry when the score fails to load', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json({ error: 'boom' }, { status: 500 }),
    );
    renderWithProviders(<Verdict />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the score/i);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
