import { fireEvent, screen } from '@testing-library/react-native';

import { useReliabilityScore } from '@/data/useReliabilityScore';
import { renderWithProviders } from '@/test-utils/renderWithProviders';
import { sampleScores } from '@/test-utils/sampleScores';

import { BreakdownScreen } from './BreakdownScreen';

jest.mock('@/data/useReliabilityScore');

const mockedScore = jest.mocked(useReliabilityScore);

describe('BreakdownScreen', () => {
  beforeEach(() => {
    mockedScore.mockImplementation((userId) => ({
      status: 'ready',
      retry: jest.fn(),
      score: sampleScores[userId],
    }));
  });

  it('shows the loading state', async () => {
    mockedScore.mockReturnValue({ status: 'loading', retry: jest.fn(), score: undefined });
    await renderWithProviders(<BreakdownScreen />);
    expect(screen.getByLabelText('Loading score')).toBeOnTheScreen();
  });

  it('shows the error state and retries', async () => {
    const retry = jest.fn();
    mockedScore.mockReturnValue({ status: 'error', retry, score: undefined });
    await renderWithProviders(<BreakdownScreen />);

    await fireEvent.press(screen.getByText('Try again'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows each step and the score at the end', async () => {
    await renderWithProviders(<BreakdownScreen />);

    expect(screen.getByText('How the score was reached')).toBeOnTheScreen();
    expect(screen.getByText('Income and bills')).toBeOnTheScreen();
    expect(screen.getByText('+75')).toBeOnTheScreen();
    expect(screen.getByText('Savings')).toBeOnTheScreen();
    expect(screen.getByText('+25')).toBeOnTheScreen();
    expect(screen.getByText('Days below zero')).toBeOnTheScreen();
    expect(screen.getByText('−10')).toBeOnTheScreen();
    expect(screen.getByText('About 24 days')).toBeOnTheScreen();
    expect(screen.getByText('Score')).toBeOnTheScreen();
    expect(screen.getAllByText('90')).toHaveLength(2);
  });

  it('reads the heading, each step and the total to screen readers as one item each', async () => {
    await renderWithProviders(<BreakdownScreen />);

    expect(screen.getByLabelText('How the score was reached, 90')).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Income and bills, +75, Regular income, income compared with bills, and bills paid',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Score, 90')).toBeOnTheScreen();
  });

  it('has the same user and window buttons as every tab', async () => {
    await renderWithProviders(<BreakdownScreen />);
    expect(screen.getByLabelText(/Switch user/)).toBeOnTheScreen();
    expect(screen.getByLabelText(/Change scoring window/)).toBeOnTheScreen();
  });
});
