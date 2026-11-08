import { StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';

interface ThinBarProps {
  widthPercent: number;
  color: string;
}

export function ThinBar({ widthPercent, color }: ThinBarProps) {
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.fill, { width: `${widthPercent}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: layout.thinBarHeight,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: colors.controlBackground,
  },
  fill: { height: layout.thinBarHeight, borderRadius: 4 },
});
