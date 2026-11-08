import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the title inside an alert region', () => {
    render(<ErrorState title="Could not load reliability" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load reliability');
  });

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorState title="X" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the retry button when no onRetry handler is given', () => {
    render(<ErrorState title="X" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
