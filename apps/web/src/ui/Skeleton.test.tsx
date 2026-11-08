import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a status region with a default loading label', () => {
    render(<Skeleton height="16px" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading');
  });

  it('uses the custom aria-label when provided', () => {
    render(<Skeleton height="16px" ariaLabel="Loading transactions" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('Loading transactions');
  });
});
