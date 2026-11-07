import { act, fireEvent, screen } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { useLiveUpdates } from '@/data/LiveUpdates';
import { useTransactions, type TransactionsResult } from '@/data/useTransactions';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { sampleTransactions } from '@/test-utils/sampleTransactions';

import { TransactionsScreen } from './TransactionsScreen';

jest.mock('@shopify/flash-list', () => require('@/test-utils/mockFlashList'));
jest.mock('@/data/useTransactions');
jest.mock('@/data/LiveUpdates');

const retry = jest.fn();

function showStatus(result: Partial<TransactionsResult>) {
  jest
    .mocked(useTransactions)
    .mockReturnValue({ status: 'ready', transactions: sampleTransactions, retry, ...result });
}

/*
 * The category and sort fields open the system's list of options. This presses
 * one of those options, as a person would.
 */
async function pressSystemOption(optionLabel: string) {
  const showOptions = jest.mocked(ActionSheetIOS.showActionSheetWithOptions);
  const [settings, onOptionPressed] = showOptions.mock.calls[showOptions.mock.calls.length - 1];
  await act(async () => onOptionPressed(settings.options.indexOf(optionLabel)));
}

describe('TransactionsScreen', () => {
  beforeEach(() => {
    retry.mockReset();
    showStatus({});
    jest.mocked(useLiveUpdates).mockReturnValue({ isConnected: true });
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
  });

  it('asks for the selected user and scoring window', async () => {
    await renderWithProviders(<TransactionsScreen />);
    expect(useTransactions).toHaveBeenLastCalledWith('user_1009', '2026-10-31');
  });

  it('shows the loading state while the transactions load', async () => {
    showStatus({ status: 'loading', transactions: [] });
    await renderWithProviders(<TransactionsScreen />);

    expect(screen.getByLabelText('Loading transactions')).toBeOnTheScreen();
    expect(screen.queryByPlaceholderText('Search by merchant')).not.toBeOnTheScreen();
  });

  it('explains a failed load and tries again', async () => {
    showStatus({ status: 'error', transactions: [] });
    await renderWithProviders(<TransactionsScreen />);

    expect(
      screen.getByRole('header', { name: "We couldn't load these transactions" }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalled();
  });

  it('says so when the scoring window has no transactions', async () => {
    showStatus({ transactions: [] });
    await renderWithProviders(<TransactionsScreen />);

    expect(screen.getByText('No transactions in this window')).toBeOnTheScreen();
    expect(screen.queryByText('Clear filters')).not.toBeOnTheScreen();
  });

  it('shows "Live" in green while the stream is connected', async () => {
    await renderWithProviders(<TransactionsScreen />);

    expect(screen.getByText('Live')).toHaveStyle({ color: '#15803D' });
    expect(screen.queryByText('Connecting')).not.toBeOnTheScreen();
  });

  it('shows "Connecting" in amber while the stream is not connected', async () => {
    jest.mocked(useLiveUpdates).mockReturnValue({ isConnected: false });
    await renderWithProviders(<TransactionsScreen />);

    expect(screen.getByText('Connecting')).toHaveStyle({ color: '#B45309' });
    expect(screen.queryByText('Live')).not.toBeOnTheScreen();
  });

  it('shows the controls, the count and the live label', async () => {
    await renderWithProviders(<TransactionsScreen />);

    expect(screen.getByPlaceholderText('Search by merchant')).toBeOnTheScreen();
    expect(screen.getByText('All categories')).toBeOnTheScreen();
    expect(screen.getByText('Newest first')).toBeOnTheScreen();
    expect(screen.getByText('All')).toBeOnTheScreen();
    expect(screen.getByText('Money in')).toBeOnTheScreen();
    expect(screen.getByText('Money out')).toBeOnTheScreen();
    expect(screen.getByText('90 of 90 transactions')).toBeOnTheScreen();
    expect(screen.getByText('Live')).toBeOnTheScreen();
  });

  it('searches by merchant', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search by merchant'), 'bigtech');

    expect(screen.getByText('6 of 90 transactions')).toBeOnTheScreen();
    expect(screen.getAllByText('BigTech AG').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+€4,200.00').length).toBeGreaterThan(0);
  });

  it('filters by money in', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.press(screen.getByText('Money in'));
    expect(screen.getByText('18 of 90 transactions')).toBeOnTheScreen();
  });

  it('filters by category', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.press(screen.getByLabelText('Category'));
    await pressSystemOption('Rent');

    expect(screen.getByText('6 of 90 transactions')).toBeOnTheScreen();
    expect(screen.getByText('Rent')).toBeOnTheScreen();
  });

  it('changes the sort', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.press(screen.getByLabelText('Sort'));
    await pressSystemOption('Largest amount');
    expect(screen.getByText('Largest amount')).toBeOnTheScreen();
  });

  it('offers a way out when nothing matches', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search by merchant'), 'nothing here');

    expect(screen.getByText('No matching transactions')).toBeOnTheScreen();
    expect(screen.getByText('Try another search or filter.')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Clear filters'));
    expect(screen.getByText('90 of 90 transactions')).toBeOnTheScreen();
    expect(screen.getByPlaceholderText('Search by merchant').props.value).toBe('');
  });

  it('starts a new user with clear filters', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Search by merchant'), 'bigtech');
    await fireEvent.press(screen.getByLabelText(/Switch user/));
    await fireEvent.press(screen.getByText('user_1002'));

    expect(useTransactions).toHaveBeenLastCalledWith('user_1002', '2026-10-31');
    expect(screen.getByText('90 of 90 transactions')).toBeOnTheScreen();
  });
});
