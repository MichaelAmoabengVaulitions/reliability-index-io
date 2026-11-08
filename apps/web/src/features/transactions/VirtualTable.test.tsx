import { useVirtualizer } from '@tanstack/react-virtual';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { buildTransaction, buildTransactions } from '@/test-utils/fixtures/transactions';

import { VirtualTable } from './VirtualTable';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(() => ({ getTotalSize: () => 0, getVirtualItems: () => [] })),
}));

describe('VirtualTable', () => {
  it('renders the column headers for a list of transactions', () => {
    render(<VirtualTable transactions={buildTransactions(50)} />);
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Merchant')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('keys rows by transaction id, so a live insert cannot reuse the wrong row', () => {
    const transactions = [buildTransaction({ id: 'tx_a' }), buildTransaction({ id: 'tx_b' })];
    render(<VirtualTable transactions={transactions} />);

    const options = vi.mocked(useVirtualizer).mock.lastCall?.[0];
    expect(options?.getItemKey?.(1)).toBe('tx_b');
  });
});
