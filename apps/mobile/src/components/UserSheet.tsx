import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { useSelection } from '@/selection/SelectionContext';
import { colors, layout } from '@/theme';

import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';

export function UserSheet({ onClose }: { onClose: () => void }) {
  const { userIds, selectedUserId, selectUser } = useSelection();

  function pickUser(userId: string) {
    selectUser(userId);
    onClose();
  }

  return (
    <BottomSheet title="Choose a user" onClose={onClose} style={styles.sheet}>
      <ScrollView style={styles.list}>
        {userIds.map((userId) => (
          <Pressable
            key={userId}
            accessibilityRole="button"
            accessibilityState={{ selected: userId === selectedUserId }}
            onPress={() => pickUser(userId)}
            style={styles.row}
          >
            <AppText>{userId}</AppText>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { height: layout.userSheetHeight },
  list: { flex: 1, marginTop: 8 },
  row: {
    minHeight: 56,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
});
