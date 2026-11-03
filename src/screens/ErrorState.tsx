import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, fontSizes, layout } from '@/theme';

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.content}>
      <AppText accessibilityRole="header" size={fontSizes.errorHeading} style={styles.heading}>
        We couldn&apos;t load this score
      </AppText>
      <AppText color={colors.secondaryText} style={styles.message}>
        The connection may have dropped. Nothing has been lost, so try again.
      </AppText>
      <View style={styles.button}>
        <PrimaryButton label="Try again" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    position: 'absolute',
    top: 280,
    left: layout.screenPadding,
    right: layout.screenPadding,
  },
  heading: { lineHeight: 34.5, letterSpacing: -0.6 },
  message: { marginTop: 8, lineHeight: 23.2 },
  button: { marginTop: 20 },
});
