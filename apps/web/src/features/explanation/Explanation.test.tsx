import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildReliabilityResponse } from '@/test-utils/fixtures/reliability';
import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Explanation } from './Explanation';

describe('Explanation', () => {
  it('shows the medium-band lead-in for the fixture', async () => {
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText(/a middle-band score/i)).toBeInTheDocument();
    });
  });

  it('splits the fixture drivers into helping and hurting columns', async () => {
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);
    await waitFor(() => {
      expect(screen.getByText(/savings behavior detected/i)).toBeInTheDocument();
    });
    // The savings driver (+13 pts) goes in the "helping" column.
    expect(screen.getByText('+13 pts')).toBeInTheDocument();
    // The negative balance driver (-10 pts) goes in the "hurting" column.
    expect(screen.getByText('-10 pts')).toBeInTheDocument();
    // The late fee driver (-1 pts) is also a risk.
    expect(screen.getByText('-1 pts')).toBeInTheDocument();
  });

  it('is titled as the answer to why the score is what it is', async () => {
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);
    expect(await screen.findByRole('heading', { name: 'Why this score' })).toBeInTheDocument();
  });

  it('lists the biggest point values first, then reasons with no points', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(
        buildReliabilityResponse({
          response: {
            drivers: [
              'Essential payments present but with some gaps',
              '3 late fee event(s) detected (-3 pts)',
              'Estimated 35 negative balance day(s) (-10 pts)',
            ],
          },
        }),
      ),
    );
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);

    const hurtingHeading = await screen.findByRole('heading', { name: "What's hurting" });
    const rows = within(hurtingHeading.parentElement as HTMLElement).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('negative balance');
    expect(rows[1]).toHaveTextContent('late fee');
    expect(rows[2]).toHaveTextContent('some gaps');
  });

  it('sorts drivers with no points by their wording', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(
        buildReliabilityResponse({
          response: {
            drivers: ['Income present in 0/6 months', 'Strong income coverage: 2.42x'],
          },
        }),
      ),
    );
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);

    const hurtingHeading = await screen.findByRole('heading', { name: "What's hurting" });
    const helpingHeading = screen.getByRole('heading', { name: "What's helping" });
    const hurting = hurtingHeading.parentElement as HTMLElement;
    const helping = helpingHeading.parentElement as HTMLElement;
    expect(within(hurting).getByText('Income present in 0/6 months')).toBeInTheDocument();
    expect(within(helping).getByText('Strong income coverage: 2.42x')).toBeInTheDocument();
  });

  it('puts drivers it does not recognise in the Notes section', async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      Response.json(
        buildReliabilityResponse({ response: { drivers: ['Some new driver from the backend'] } }),
      ),
    );
    renderWithProviders(<Explanation />, SAMPLE_DASHBOARD_ROUTE);

    const notesHeading = await screen.findByRole('heading', { name: 'Notes' });
    const notesSection = notesHeading.parentElement as HTMLElement;
    expect(within(notesSection).getByText('Some new driver from the backend')).toBeInTheDocument();
  });
});
