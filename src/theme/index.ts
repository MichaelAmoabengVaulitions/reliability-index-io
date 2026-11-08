// Every color, font and size comes from docs/design/README.md and the screen files.
export const colors = {
  background: '#FFFFFF',
  text: '#111114',
  secondaryText: '#4F4F59',
  divider: '#ECECEF',
  controlBackground: '#F4F4F6',
  scoreMarker: '#5B4BF5',
  pointsAdded: '#5B4BF5',
  pointsTakenAway: '#4F4F59',
  moneyLeftOver: '#13B8A8',
  moneyOverspent: '#F2643C',
  sheetBackdrop: 'rgba(17, 17, 20, 0.4)',
  // Not in the design. Dark enough to read as small text on white.
  tabSelected: '#2563EB',
  streamConnected: '#15803D',
  streamConnecting: '#B45309',
} as const;

// A custom font has one file per weight, so weight is chosen by font family.
export const fontFamilies = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
} as const;

export const fontSizes = {
  scoreNumber: 96,
  mainNumber: 52,
  errorHeading: 30,
  sheetHeading: 22,
  sectionHeading: 19,
  emphasis: 18,
  body: 16,
  secondary: 15,
  scaleLabel: 14,
  tabLabel: 12,
  // Not in the design: the "User" and "Scoring window" labels inside the header buttons.
  caption: 13,
} as const;

export const layout = {
  screenPadding: 20,
  controlHeight: 44,
  controlRadius: 12,
  largeControlHeight: 48,
  keyNumberRowHeight: 52,
  transactionRowHeight: 60,
  thinBarHeight: 8,
  tabBarContentHeight: 56,
  tabBarMinimumBottomSpace: 24,
  sheetRadius: 20,
  userSheetHeight: 640,
} as const;
