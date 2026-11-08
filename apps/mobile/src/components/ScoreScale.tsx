import { StyleSheet, View } from 'react-native';

import { colors, fontSizes } from '@/theme';

import { AppText } from './AppText';

const scaleSections = [
  { label: 'Low', left: '0%', width: '49.5%' },
  { label: 'Medium', left: '50%', width: '24.5%' },
  { label: 'High', left: '75%', width: '25%' },
] as const;

export function ScoreScale({ score }: { score: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Low is 0 to 49, Medium is 50 to 74, High is 75 to 100. This score is ${score}.`}
      style={styles.scale}
    >
      {scaleSections.map((section) => (
        <View
          key={section.label}
          style={[styles.section, { left: section.left, width: section.width }]}
        />
      ))}
      <View style={[styles.marker, { left: `${score}%` }]} />
      {scaleSections.map((section) => (
        <AppText
          key={section.label}
          size={fontSizes.scaleLabel}
          color={colors.secondaryText}
          style={[styles.label, { left: section.left }]}
        >
          {section.label}
        </AppText>
      ))}
    </View>
  );
}

const markerSize = 14;

const styles = StyleSheet.create({
  scale: { height: 34, marginTop: 10 },
  section: {
    position: 'absolute',
    top: 5,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: markerSize,
    height: markerSize,
    marginLeft: -markerSize / 2,
    borderRadius: markerSize / 2,
    borderWidth: 2,
    borderColor: colors.background,
    backgroundColor: colors.scoreMarker,
  },
  label: { position: 'absolute', top: 16 },
});
