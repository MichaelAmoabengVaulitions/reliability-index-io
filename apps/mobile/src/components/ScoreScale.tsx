import { HIGH_BAND_MIN, MEDIUM_BAND_MIN } from '@reliability-index/core/scoring/bands';
import { StyleSheet, View } from 'react-native';

import { colors, fontSizes } from '@/theme';

import { AppText } from './AppText';

// A small gap is left between the sections, so each band reads as its own block.
const sectionGap = 0.5;

const scaleSections = [
  { label: 'Low', left: '0%', width: `${MEDIUM_BAND_MIN - sectionGap}%` },
  {
    label: 'Medium',
    left: `${MEDIUM_BAND_MIN}%`,
    width: `${HIGH_BAND_MIN - MEDIUM_BAND_MIN - sectionGap}%`,
  },
  { label: 'High', left: `${HIGH_BAND_MIN}%`, width: `${100 - HIGH_BAND_MIN}%` },
] as const;

export function ScoreScale({ score }: { score: number }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Low is 0 to ${MEDIUM_BAND_MIN - 1}, Medium is ${MEDIUM_BAND_MIN} to ${HIGH_BAND_MIN - 1}, High is ${HIGH_BAND_MIN} to 100. This score is ${score}.`}
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
