import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { TopBar } from './TopBar';

describe('TopBar', () => {
  it('shows the product name', () => {
    renderWithProviders(<TopBar />);
    expect(screen.getByText('Reliability Index')).toBeInTheDocument();
  });

  it('stays at the top of the page on scroll, above the content', () => {
    renderWithProviders(<TopBar />);
    expect(screen.getByRole('banner')).toHaveClass('sticky', 'top-0', 'z-20');
  });

  it('shows one user picker', async () => {
    renderWithProviders(<TopBar />);
    expect(await screen.findAllByRole('combobox')).toHaveLength(1);
  });

  it('shows the date picker once a user is picked', () => {
    renderWithProviders(<TopBar />, SAMPLE_DASHBOARD_ROUTE);
    expect(screen.getByLabelText(/scoring window ends/i)).toHaveValue('2026-02-28');
  });

  it('hides the date picker until a user is picked', () => {
    renderWithProviders(<TopBar />);
    expect(screen.queryByLabelText(/scoring window ends/i)).not.toBeInTheDocument();
  });
});
