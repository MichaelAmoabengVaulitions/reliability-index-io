import { render, screen } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import { fontSizes } from '@/theme';

import { AppText } from './AppText';

// Sets the phone's text size, where 1 is the normal size.
function setTextSize(fontScale: number) {
  Dimensions.set({ window: { ...Dimensions.get('window'), fontScale } });
}

function styleOf(text: string) {
  return StyleSheet.flatten(screen.getByText(text).props.style);
}

afterEach(() => setTextSize(1));

describe('AppText', () => {
  it('grows a big number and its line height together, up to 1.3 times', async () => {
    setTextSize(2);
    await render(
      <AppText size={fontSizes.scoreNumber} style={{ lineHeight: fontSizes.scoreNumber }}>
        90
      </AppText>,
    );

    expect(styleOf('90').fontSize).toBeCloseTo(124.8);
    expect(styleOf('90').lineHeight).toBeCloseTo(124.8);
    expect(screen.getByText('90').props.allowFontScaling).toBe(false);
  });

  it('grows a big number by the text size when that is below the limit', async () => {
    setTextSize(1.2);
    await render(
      <AppText size={fontSizes.mainNumber} style={{ lineHeight: 57.2 }}>
        €450
      </AppText>,
    );

    expect(styleOf('€450').fontSize).toBeCloseTo(62.4);
    expect(styleOf('€450').lineHeight).toBeCloseTo(68.64);
  });

  it('leaves all other text to grow with the system setting', async () => {
    setTextSize(2);
    await render(<AppText size={fontSizes.errorHeading}>Heading</AppText>);

    expect(styleOf('Heading').fontSize).toBe(fontSizes.errorHeading);
    expect(screen.getByText('Heading').props.allowFontScaling).not.toBe(false);
  });
});
