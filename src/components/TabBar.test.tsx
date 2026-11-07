import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar } from './TabBar';

const routes = [
  { key: 'score', name: 'index' },
  { key: 'breakdown', name: 'breakdown' },
  { key: 'cashflow', name: 'cashflow' },
  { key: 'transactions', name: 'transactions' },
];

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

async function renderTabBar(activeIndex: number, navigateToTab = jest.fn()) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TabBar state={{ index: activeIndex, routes }} navigateToTab={navigateToTab} />
    </SafeAreaProvider>,
  );
}

describe('TabBar', () => {
  it('shows the four tabs and marks the active one', async () => {
    await renderTabBar(2);

    for (const label of ['Score', 'Breakdown', 'Cashflow', 'Transactions']) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    expect(screen.getByRole('tab', { name: 'Cashflow', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Score', selected: false })).toBeOnTheScreen();
  });

  it('shows the selected tab in blue and the others in grey', async () => {
    await renderTabBar(3);

    expect(screen.getByText('Transactions')).toHaveStyle({ color: '#2563EB' });
    expect(screen.getByText('Score')).toHaveStyle({ color: '#4F4F59' });
  });

  it('opens a tab when pressed', async () => {
    const navigateToTab = jest.fn();
    await renderTabBar(0, navigateToTab);
    await fireEvent.press(screen.getByText('Transactions'));
    expect(navigateToTab).toHaveBeenCalledWith('transactions');
  });
});
