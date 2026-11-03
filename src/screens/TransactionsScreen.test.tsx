import { fireEvent, screen } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { renderWithProviders } from '@/test-utils/renderWithProviders';

import { TransactionsScreen } from './TransactionsScreen';

jest.mock('@shopify/flash-list', () => require('@/test-utils/mockFlashList'));

/*
 * The category and sort fields open the system's list of options. This presses
 * one of those options, as a person would.
 */
function pressSystemOption(optionLabel: string) {
  const showOptions = jest.mocked(ActionSheetIOS.showActionSheetWithOptions);
  const [settings, onOptionPressed] = showOptions.mock.calls[showOptions.mock.calls.length - 1];
  onOptionPressed(settings.options.indexOf(optionLabel));
}

describe('TransactionsScreen', () => {
  beforeEach(() => {
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
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
    await pressSystemOptionInsideAct('Rent');

    expect(screen.getByText('6 of 90 transactions')).toBeOnTheScreen();
    expect(screen.getByText('Rent')).toBeOnTheScreen();
  });

  it('changes the sort', async () => {
    await renderWithProviders(<TransactionsScreen />);
    await fireEvent.press(screen.getByLabelText('Sort'));
    await pressSystemOptionInsideAct('Largest amount');
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

    expect(screen.getByText('90 of 90 transactions')).toBeOnTheScreen();
  });
});

async function pressSystemOptionInsideAct(optionLabel: string) {
  const { act } = require('@testing-library/react-native');
  await act(async () => pressSystemOption(optionLabel));
}
