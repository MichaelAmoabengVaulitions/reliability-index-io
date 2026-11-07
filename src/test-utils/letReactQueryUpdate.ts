import { act } from '@testing-library/react-native';

/*
 * React Query tells components about a change on the next tick, not straight
 * away. Waiting one tick lets the hook redraw before the test reads it.
 */
export async function letReactQueryUpdate() {
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
}
