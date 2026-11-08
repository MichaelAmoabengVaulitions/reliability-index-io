/**
 * The one place colour values are defined for the app.
 *
 * tailwind.config.ts feeds these into Tailwind, so styling classes like
 * text-negative or bg-topbar work. Code that needs a colour as a plain value
 * rather than a class (the Recharts chart) imports this
 * same object. No file should write a raw colour code anywhere else.
 */
export const colors = {
  /*
   * The main accent colour for buttons, links and the focus ring.
   */
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    500: '#4f46e5',
    600: '#4338ca',
    700: '#3730a3',
  },
  // A deep navy, so the dashboard reads as an analyst tool rather than a marketing site.
  topbar: {
    DEFAULT: '#0f172a',
    hover: '#1e293b',
    border: '#1e293b',
    text: '#cbd5e1',
    muted: '#94a3b8',
  },
  /*
   * Colours for good, middling and bad news. The plain shade is for text on
   * white, `strong` is for text on `soft`, and `dot` is for small marks.
   */
  positive: {
    DEFAULT: '#047857',
    strong: '#065f46',
    soft: '#d1fae5',
    dot: '#10b981',
  },
  warning: {
    DEFAULT: '#b45309',
    strong: '#78350f',
    soft: '#fef3c7',
    dot: '#f59e0b',
  },
  negative: {
    DEFAULT: '#b91c1c',
    strong: '#7f1d1d',
    soft: '#fee2e2',
    faint: '#fef2f2',
    border: '#fca5a5',
    onDark: '#fca5a5',
  },
  // Bright colours for the chart bars. They are too light to read as text on white.
  money: {
    inflow: '#10b981',
    outflow: '#ef4444',
  },
  /*
   * Colours used inside the Recharts chart, where a
   * colour must be a plain value rather than a Tailwind class.
   */
  chart: {
    ink: '#0f172a', // the net cashflow line
    grid: '#e2e8f0', // chart gridlines and axis lines
    axis: '#64748b', // axis tick labels
  },
};
