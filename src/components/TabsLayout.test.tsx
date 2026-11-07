import { Text } from 'react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import TabsLayout from '@/app/(tabs)/_layout';

// The real tabs layout, with simple screens in place of the real ones.
const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': () => <Text>Score screen</Text>,
  '(tabs)/breakdown': () => <Text>Breakdown screen</Text>,
  '(tabs)/cashflow': () => <Text>Cashflow screen</Text>,
  '(tabs)/transactions': () => <Text>Transactions screen</Text>,
};

describe('Tabs layout', () => {
  it('opens the pressed tab and marks it as selected', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(screen.getByRole('tab', { name: 'Score', selected: true })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('tab', { name: 'Transactions' }));

    expect(screen.getByText('Transactions screen')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Transactions', selected: true })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Score', selected: false })).toBeOnTheScreen();
  });
});
