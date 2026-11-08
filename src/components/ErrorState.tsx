import { StyleSheet, View } from 'react-native';

import { colors, fontSizes, layout } from '@/theme';

import { AppText } from './AppText';
import { PrimaryButton } from './PrimaryButton';

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
}

export function ErrorState({ onRetry, title = "We couldn't load this score" }: ErrorStateProps) {
  return (
    <View style={styles.content}>
      <AppText accessibilityRole="header" size={fontSizes.errorHeading} style={styles.heading}>
        {title}
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
