import { StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';

const textLineCount = 4;

// Grey shapes from the design that stand in for the content while it loads.
export function LoadingState({ label = 'Loading score' }: { label?: string }) {
  return (
    <View accessible accessibilityLabel={label} style={styles.content}>
      <View style={[styles.shape, styles.userButton]} />
      <View style={[styles.shape, styles.scoreNumber]} />
      <View style={[styles.shape, styles.band]} />
      <View style={[styles.shape, styles.scale]} />
      <View style={[styles.shape, styles.link]} />
      <View style={styles.bottomRow}>
        <View style={[styles.shape, styles.square]} />
        <View style={styles.lines}>
          {Array.from({ length: textLineCount }, (_, line) => (
            <View key={line} style={[styles.shape, styles.line]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.screenPadding },
  shape: { borderRadius: 12, backgroundColor: colors.controlBackground },
  userButton: { width: 120, height: 28, borderRadius: 8 },
  scoreNumber: { width: 180, height: 96, marginTop: 24 },
  band: { width: 150, height: 20, marginTop: 12, borderRadius: 6 },
  scale: { height: 4, marginTop: 16, borderRadius: 2 },
  link: { height: 48, marginTop: 28, borderRadius: 8 },
  bottomRow: { flexDirection: 'row', gap: 18, marginTop: 36 },
  square: { width: 160, height: 160 },
  lines: { flex: 1, gap: 12 },
  line: { height: 18, borderRadius: 6 },
});
