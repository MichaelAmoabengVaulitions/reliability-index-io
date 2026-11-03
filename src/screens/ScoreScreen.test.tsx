import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useReliabilityScore } from '@/data/useReliabilityScore';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { sampleScores } from '@/test-utils/sampleScores';

import { ScoreScreen } from './ScoreScreen';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn() } }));
jest.mock('@/data/useReliabilityScore');
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => <View testID="date-picker" {...props} />,
  };
});

const mockedScore = jest.mocked(useReliabilityScore);

function showStatus(status: 'ready' | 'loading' | 'error', retry = jest.fn()) {
  mockedScore.mockImplementation((userId) => ({
    status,
    retry,
    score: status === 'ready' ? sampleScores[userId] : undefined,
  }));
}

async function pickUser(userId: string) {
  await fireEvent.press(screen.getByLabelText(/Switch user/));
  await fireEvent.press(screen.getByText(userId));
}

describe('ScoreScreen', () => {
  beforeEach(() => showStatus('ready'));

  it('shows the score, its band and the key numbers', async () => {
    await renderWithProviders(<ScoreScreen />);

    expect(screen.getByText('90')).toBeOnTheScreen();
    expect(screen.getByText('out of 100')).toBeOnTheScreen();
    expect(screen.getByText('High reliability')).toBeOnTheScreen();
    expect(screen.getByText('Income compared with bills')).toBeOnTheScreen();
    expect(screen.getByText('3.29 times')).toBeOnTheScreen();
    expect(screen.getByText('What is helping')).toBeOnTheScreen();
    expect(screen.getByText('What is hurting')).toBeOnTheScreen();
  });

  it('describes the score scale to screen readers', async () => {
    await renderWithProviders(<ScoreScreen />);
    expect(
      screen.getByLabelText(
        'Low is 0 to 49, Medium is 50 to 74, High is 75 to 100. This score is 90.',
      ),
    ).toBeOnTheScreen();
  });

  it('opens Breakdown from the link', async () => {
    await renderWithProviders(<ScoreScreen />);
    await fireEvent.press(screen.getByText('See how this score was reached'));
    expect(router.navigate).toHaveBeenCalledWith('/breakdown');
  });

  it('switches user from the sheet and closes it', async () => {
    await renderWithProviders(<ScoreScreen />);
    await pickUser('user_1005');

    expect(screen.getByText('15')).toBeOnTheScreen();
    expect(screen.getByText('Low reliability')).toBeOnTheScreen();
    expect(screen.getByText('No income or essential bills found')).toBeOnTheScreen();
    expect(screen.queryByText('Choose a user')).not.toBeOnTheScreen();
  });

  it('closes a sheet when the backdrop is pressed', async () => {
    await renderWithProviders(<ScoreScreen />);
    await fireEvent.press(screen.getByLabelText(/Switch user/));
    await fireEvent.press(screen.getByLabelText('Close'));
    expect(screen.queryByText('Choose a user')).not.toBeOnTheScreen();
  });

  it('applies a new end date only after Show this window', async () => {
    await renderWithProviders(<ScoreScreen />);
    await fireEvent.press(screen.getByLabelText(/Change scoring window/));

    expect(screen.getByText('Scoring window')).toBeOnTheScreen();
    expect(
      screen.getByText('Pick an end date. The score uses the 6 months up to that date.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Window: May 1 – Oct 31, 2026')).toBeOnTheScreen();

    await fireEvent(screen.getByTestId('date-picker'), 'valueChange', {}, new Date(2026, 1, 28));
    expect(screen.getByText('Window: Sep 1, 2025 – Feb 28, 2026')).toBeOnTheScreen();
    expect(screen.getByText('May – Oct 2026')).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Show this window'));
    expect(screen.getByText('Sep 2025 – Feb 2026')).toBeOnTheScreen();
  });

  it('asks for the score of the selected user and end date', async () => {
    await renderWithProviders(<ScoreScreen />);
    expect(mockedScore).toHaveBeenCalledWith('user_1009', '2026-10-31');
  });

  it('shows the loading state', async () => {
    showStatus('loading');
    await renderWithProviders(<ScoreScreen />);
    expect(screen.getByLabelText('Loading score')).toBeOnTheScreen();
    expect(screen.queryByText('out of 100')).not.toBeOnTheScreen();
  });

  it('shows the error state and retries', async () => {
    const retry = jest.fn();
    showStatus('error', retry);
    await renderWithProviders(<ScoreScreen />);

    expect(screen.getByText("We couldn't load this score")).toBeOnTheScreen();
    expect(
      screen.getByText('The connection may have dropped. Nothing has been lost, so try again.'),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
