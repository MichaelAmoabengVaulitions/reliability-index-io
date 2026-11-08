import { StyleSheet, Text, useWindowDimensions, type TextProps } from 'react-native';

import { colors, fontFamilies, fontSizes } from '@/theme';

interface AppTextProps extends TextProps {
  size?: number;
  weight?: keyof typeof fontFamilies;
  color?: string;
}

// The big numbers grow with the phone's text size up to this many times, so they still fit.
const bigNumberGrowthLimit = 1.3;

/*
 * All text in the app goes through here so it always uses Geist. Other text
 * grows with the phone's text size on its own. The big numbers are grown here
 * instead, so their line height grows with them and the top is never cut off.
 */
export function AppText({
  size = fontSizes.body,
  weight = 'regular',
  color = colors.text,
  style,
  ...textProps
}: AppTextProps) {
  const { fontScale } = useWindowDimensions();
  const isBigNumber = size >= fontSizes.mainNumber;
  const growth = isBigNumber ? Math.min(fontScale, bigNumberGrowthLimit) : 1;
  const { lineHeight } = StyleSheet.flatten(style) ?? {};

  return (
    <Text
      allowFontScaling={!isBigNumber}
      style={[
        styles.text,
        { fontFamily: fontFamilies[weight], fontSize: size * growth, color },
        style,
        lineHeight !== undefined && { lineHeight: lineHeight * growth },
      ]}
      {...textProps}
    />
  );
}

const styles = StyleSheet.create({
  // Android adds extra space around text by default, which would shift the layout.
  text: { includeFontPadding: false },
});
