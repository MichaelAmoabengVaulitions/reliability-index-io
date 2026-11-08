import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createTestQueryClient } from '@/test-utils/createTestQueryClient';

import { SelectionProvider, useSelection } from './SelectionContext';
import { UsersGate } from './UsersGate';

const screenMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

function SelectedUser() {
  const { selectedUserId } = useSelection();
  return <Text>Selected {selectedUserId}</Text>;
}

async function renderGate() {
  const queryClient = createTestQueryClient();
  await render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={screenMetrics}>
        <SelectionProvider>
          <UsersGate>
            <SelectedUser />
          </UsersGate>
        </SelectionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

function usersResponse() {
  return new Response(JSON.stringify({ available_users: ['user_2001', 'user_2002'] }));
}

const fetchMock = jest.fn<Promise<Response>, []>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

// Finishing the request at the end of a test stops its timeout from outliving the test.
function holdRequestOpen() {
  let finishRequest = () => {};
  fetchMock.mockReturnValue(
    new Promise((resolve) => {
      finishRequest = () => resolve(usersResponse());
    }),
  );
  return () => finishRequest();
}

describe('UsersGate', () => {
  it('shows the loading state until the users arrive', async () => {
    const finishRequest = holdRequestOpen();
    await renderGate();
    expect(screen.getByLabelText('Loading score')).toBeOnTheScreen();
    await act(async () => finishRequest());
  });

  it('selects the first user the backend lists', async () => {
    fetchMock.mockResolvedValue(usersResponse());
    await renderGate();
    expect(await screen.findByText('Selected user_2001')).toBeOnTheScreen();
  });

  it('shows the error state, and tries again when asked', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await renderGate();
    expect(await screen.findByText("We couldn't load this score")).toBeOnTheScreen();

    fetchMock.mockResolvedValue(usersResponse());
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Selected user_2001')).toBeOnTheScreen();
  });
});
