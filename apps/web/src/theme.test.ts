import { describe, expect, it } from 'vitest';

import { colors } from './theme';

const WHITE = '#ffffff';
const MINIMUM_TEXT_CONTRAST = 4.5;

function channelBrightness(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function brightness(hex: string): number {
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return (
    0.2126 * channelBrightness(red) +
    0.7152 * channelBrightness(green) +
    0.0722 * channelBrightness(blue)
  );
}

function contrast(first: string, second: string): number {
  const lighter = Math.max(brightness(first), brightness(second));
  const darker = Math.min(brightness(first), brightness(second));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('text colours', () => {
  it.each([
    ['positive on white', colors.positive.DEFAULT, WHITE],
    ['warning on white', colors.warning.DEFAULT, WHITE],
    ['negative on white', colors.negative.DEFAULT, WHITE],
    ['positive chip', colors.positive.strong, colors.positive.soft],
    ['warning chip', colors.warning.strong, colors.warning.soft],
    ['negative chip', colors.negative.strong, colors.negative.soft],
    ['error box', colors.negative.strong, colors.negative.faint],
    ['muted top bar text', colors.topbar.muted, colors.topbar.DEFAULT],
    ['muted text on the top bar dropdown', colors.topbar.muted, colors.topbar.hover],
    ['error text on the top bar', colors.negative.onDark, colors.topbar.DEFAULT],
    ['links', colors.brand[600], WHITE],
  ])('%s is readable', (_name, text, background) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
  });
});

describe('component styles', () => {
  const sources = import.meta.glob('./**/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
  const components = Object.entries(sources).filter(([file]) => !file.includes('.test.'));

  it('finds the components to check', () => {
    expect(components.length).toBeGreaterThan(10);
  });

  it('take status colours from the theme, not raw Tailwind shades', () => {
    const rawColour = /\b(bg|text|border)-(red|amber|emerald|green)-\d+/;
    const offenders = components.filter(([, source]) => rawColour.test(source));
    expect(offenders.map(([file]) => file)).toEqual([]);
  });

  it('leave focus styles to the one shared rule in index.css', () => {
    const ownFocusStyle = /\bfocus(-visible)?:/;
    const offenders = components.filter(([, source]) => ownFocusStyle.test(source));
    expect(offenders.map(([file]) => file)).toEqual([]);
  });
});
