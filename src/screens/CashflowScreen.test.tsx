import { fireEvent, screen } from '@testing-library/react-native';

import { useTransactions, type TransactionsResult } from '@/data/useTransactions';
import type { Transaction } from '@/domain/transactionList';
import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { CashflowScreen } from './CashflowScreen';

jest.mock('@/data/useTransactions');

const retry = jest.fn();

function transaction(id: string, date: string, amount: number): Transaction {
  return { id, date, amount, merchantName: 'Bio Company', category: 'Groceries' };
}

function showStatus(result: Partial<TransactionsResult>) {
  jest
    .mocked(useTransactions)
    .mockReturnValue({ status: 'ready', transactions: [], retry, ...result });
}

describe('CashflowScreen', () => {
  beforeEach(() => {
    retry.mockReset();
    showStatus({});
  });

  it('asks for the selected user and scoring window', async () => {
    await renderWithProviders(<CashflowScreen />);
    expect(useTransactions).toHaveBeenLastCalledWith('user_1009', '2026-10-31');
  });

  it('shows the loading state while the transactions load', async () => {
    showStatus({ status: 'loading' });
    await renderWithProviders(<CashflowScreen />);

    expect(screen.getByLabelText('Loading cashflow')).toBeOnTheScreen();
    expect(screen.queryByText('May 2026')).not.toBeOnTheScreen();
  });

  it('explains a failed load and tries again', async () => {
    showStatus({ status: 'error' });
    await renderWithProviders(<CashflowScreen />);

    expect(
      screen.getByRole('header', { name: "We couldn't load this cashflow" }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('shows the average left over and each month from the transactions', async () => {
    showStatus({
      transactions: [
        transaction('1', '2026-10-25', 4200),
        transaction('2', '2026-10-01', -1000),
        transaction('3', '2026-05-14', -500),
      ],
    });
    await renderWithProviders(<CashflowScreen />);

    expect(screen.getByText('Left over on average each month')).toBeOnTheScreen();
    expect(screen.getByText('€450')).toBeOnTheScreen();
    expect(screen.getByText('May 2026')).toBeOnTheScreen();
    expect(screen.getByText('−€500')).toBeOnTheScreen();
    expect(screen.getByText('In €0 · Out €500')).toBeOnTheScreen();
    expect(screen.getByText('Oct 2026')).toBeOnTheScreen();
    expect(screen.getByText('€3,200')).toBeOnTheScreen();
    expect(screen.getByText('In €4,200 · Out €1,000')).toBeOnTheScreen();
  });

  it('shows a user who overspends', async () => {
    showStatus({ transactions: [transaction('1', '2026-10-02', -600)] });
    await renderWithProviders(<CashflowScreen />);

    expect(screen.getByText('Overspent on average each month')).toBeOnTheScreen();
    expect(screen.getByText('€100')).toBeOnTheScreen();
  });

  it('asks for the new user after switching', async () => {
    await renderWithProviders(<CashflowScreen />);
    await fireEvent.press(screen.getByLabelText(/Switch user/));
    await fireEvent.press(screen.getByText('user_1006'));

    expect(useTransactions).toHaveBeenLastCalledWith('user_1006', '2026-10-31');
  });
});
