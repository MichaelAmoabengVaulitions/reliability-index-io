import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSizes, layout } from '@/theme';

import { AppText } from './AppText';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  style?: ViewStyle;
}

export function BottomSheet({ title, onClose, children, style }: BottomSheetProps) {
  const { bottom: bottomInset } = useSafeAreaInsets();

  return (
    <Modal transparent visible onRequestClose={onClose}>
      <View style={styles.screen}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          style={styles.backdrop}
        />
        {/* The escape gesture is the screen reader's way to close, with two fingers on iOS. */}
        <View
          onAccessibilityEscape={onClose}
          style={[styles.sheet, { paddingBottom: bottomInset }, style]}
        >
          <AppText size={fontSizes.sheetHeading} weight="medium" accessibilityRole="header">
            {title}
          </AppText>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.sheetBackdrop },
  sheet: {
    maxHeight: '100%',
    paddingTop: layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
    borderTopLeftRadius: layout.sheetRadius,
    borderTopRightRadius: layout.sheetRadius,
    backgroundColor: colors.background,
  },
});
