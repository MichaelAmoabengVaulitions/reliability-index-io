import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildTransaction } from '@/test-utils/fixtures/transactions';

import { Row } from './Row';

describe('Row', () => {
  it('shows the merchant name and the formatted amount', () => {
    render(
      <Row
        transaction={buildTransaction({ merchant_name: 'Cafe Central', amount: -8.75 })}
        height={56}
      />,
    );
    expect(screen.getByText('Cafe Central')).toBeInTheDocument();
    expect(screen.getByText(/8\.75/)).toBeInTheDocument();
  });

  it('shows a plus for money in and a minus for money out', () => {
    const { rerender } = render(<Row transaction={buildTransaction({ amount: 5 })} height={56} />);
    expect(screen.getByText(/5\.00/)).toHaveTextContent('+');

    rerender(<Row transaction={buildTransaction({ amount: -5 })} height={56} />);
    expect(screen.getByText(/5\.00/)).toHaveTextContent('−');
  });

  it('shows money in as green', () => {
    render(<Row transaction={buildTransaction({ amount: 5 })} height={56} />);
    expect(screen.getByText(/5\.00/)).toHaveClass('text-positive');
  });

  it('shows money out in plain dark text, because spending is not a warning', () => {
    render(<Row transaction={buildTransaction({ amount: -5 })} height={56} />);
    expect(screen.getByText(/5\.00/)).toHaveClass('text-slate-900');
  });

  it('shows a zero amount with no sign and muted text', () => {
    render(<Row transaction={buildTransaction({ amount: 0 })} height={56} />);
    const amount = screen.getByText(/0\.00/);
    expect(amount.textContent).not.toMatch(/[+−]/);
    expect(amount).toHaveClass('text-slate-600');
  });

  it('shows the date in the readable format', () => {
    render(<Row transaction={buildTransaction({ date: '2026-08-28' })} height={56} />);
    expect(screen.getByText('28 Aug 2026')).toBeInTheDocument();
  });
});
