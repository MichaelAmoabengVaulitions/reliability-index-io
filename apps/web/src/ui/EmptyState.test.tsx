import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title', () => {
    render(<EmptyState title="No transactions match these filters" />);
    expect(screen.getByText('No transactions match these filters')).toBeInTheDocument();
  });

  it('renders the description and action when both are provided', () => {
    render(
      <EmptyState
        title="No transactions"
        description="Try widening your date range."
        action={<button type="button">Reset filters</button>}
      />,
    );
    expect(screen.getByText('Try widening your date range.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });
});
