import { FlatList, type FlatListProps } from 'react-native';

/*
 * FlashList runs timers that outlive a test. Tests check what the list shows,
 * so the plain React Native list stands in for it.
 */
export function FlashList<Item>(props: FlatListProps<Item>) {
  return <FlatList {...props} />;
}
