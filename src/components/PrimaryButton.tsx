import { Pressable, StyleSheet } from 'react-native';

import { colors, layout } from '@/theme';

import { AppText } from './AppText';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
}

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <AppText color={colors.background}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.largeControlHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.controlRadius,
    backgroundColor: colors.text,
  },
});
