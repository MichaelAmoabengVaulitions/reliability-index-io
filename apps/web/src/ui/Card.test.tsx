import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card } from './Card';

describe('Card', () => {
  it('renders its children inside the body', () => {
    render(<Card>some body content</Card>);
    expect(screen.getByText('some body content')).toBeInTheDocument();
  });

  it('renders the title in the header when one is provided', () => {
    render(<Card title="Reliability Overview">body</Card>);
    expect(screen.getByRole('heading', { name: 'Reliability Overview' })).toBeInTheDocument();
  });

  it('renders the actions slot when provided', () => {
    render(
      <Card title="X" actions={<button type="button">Refresh</button>}>
        body
      </Card>,
    );
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
