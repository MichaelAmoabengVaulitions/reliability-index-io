import { StyleSheet, View } from 'react-native';

import { colors, fontSizes } from '@/theme';

import { AppText } from './AppText';

// The dot and the word both change, so the state is clear without relying on colour alone.
export function StreamStatus({ isConnected }: { isConnected: boolean }) {
  const color = isConnected ? colors.streamConnected : colors.streamConnecting;
  return (
    <View style={styles.streamStatus}>
      <View style={[styles.streamDot, { backgroundColor: color }]} />
      <AppText size={fontSizes.secondary} weight="medium" color={color}>
        {isConnected ? 'Live' : 'Connecting'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  streamStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streamDot: { width: 8, height: 8, borderRadius: 4 },
});
