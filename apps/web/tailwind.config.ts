import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

import { colors } from './src/theme';

// Font sizes and shadows live here; colours come from src/theme.ts so the
// same values feed both these utility classes and the SVG/chart code.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        topbar: colors.topbar,
        positive: colors.positive,
        warning: colors.warning,
        negative: colors.negative,
      },
      fontSize: {
        // The score number in the gauge. Large enough to be the visual anchor.
        score: ['72px', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [forms],
};

export default config;
