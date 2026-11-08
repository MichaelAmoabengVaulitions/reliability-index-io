import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SAMPLE_DASHBOARD_ROUTE, renderWithProviders } from '@/test-utils/renderWithProviders';

import { Root } from './Root';

describe('Root', () => {
  it('asks for a user when none is selected', () => {
    renderWithProviders(<Root />);
    expect(screen.getByRole('heading', { name: /pick a user to begin/i })).toBeInTheDocument();
    expect(screen.getByText(/choose a user above to load their dashboard/i)).toBeInTheDocument();
  });

  it('names the page after the selected user, for screen readers', () => {
    renderWithProviders(<Root />, SAMPLE_DASHBOARD_ROUTE);
    expect(screen.getByRole('heading', { name: 'user_1001' })).toBeInTheDocument();
  });

  it('has the top bar', () => {
    renderWithProviders(<Root />);
    expect(screen.getByRole('banner')).toHaveTextContent('Reliability Index');
  });
});
