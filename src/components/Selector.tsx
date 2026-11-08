import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fontSizes, layout } from '@/theme';

import { AppText } from './AppText';
import { ChevronIcon } from './ChevronIcon';

interface SelectorProps {
  label: string;
  value: string;
  valueSize?: number;
  valueWeight?: 'regular' | 'medium';
  accessibilityLabel: string;
  onPress: () => void;
}

// A button that shows what it picks in small text above the current choice.
export function Selector({
  label,
  value,
  valueSize,
  valueWeight,
  accessibilityLabel,
  onPress,
}: SelectorProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.selector}
    >
      <View>
        <AppText size={fontSizes.caption} color={colors.secondaryText}>
          {label}
        </AppText>
        <AppText size={valueSize} weight={valueWeight}>
          {value}
        </AppText>
      </View>
      <ChevronIcon direction="down" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  selector: {
    minHeight: layout.controlHeight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: layout.controlRadius,
    backgroundColor: colors.controlBackground,
  },
});
