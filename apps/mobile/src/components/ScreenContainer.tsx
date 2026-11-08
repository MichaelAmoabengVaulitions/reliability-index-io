import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme';

// Keeps every screen clear of the status bar and notch.
export function ScreenContainer({ children }: { children: ReactNode }) {
  const { top: topInset } = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: topInset }]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
