import { config } from '@/config';

export type DriverKind = 'positive' | 'risk' | 'neutral';

// Shown in place of a coverage ratio the backend could not work out.
const NO_RATIO_PLACEHOLDER = '—';

/*
 * Formats the income-to-expenses coverage ratio for display. A number shows
 * as, for example, "1.41x". Null (which the backend sends when the user has
 * no essential expenses, so there is no ratio) shows as a dash.
 */
export function formatCoverageRatio(value: number | null): string {
  if (value === null) {
    return NO_RATIO_PLACEHOLDER;
  }
  return `${value.toFixed(2)}x`;
}

/*
 * The backend's driver lines are short and a little compact (for example
 * "2.03x essential expenses"). We pair each one with a plain caption that
 * says what the line is telling the reader. The caption is matched on a
 * keyword in the driver, never on the numbers inside it, so if the backend
 * rewords a driver we simply lose the caption rather than show a wrong one.
 *
 * Each entry below is a pattern that recognises one kind of driver, and the
 * plain sentence to show under any driver line that matches it. Checked in
 * order.
 */
const DRIVER_CAPTIONS: ReadonlyArray<{ pattern: RegExp; caption: string }> = [
  { pattern: /income present/i, caption: 'How regularly income arrived during the window.' },
  {
    pattern: /coverage|covers essential/i,
    caption: 'Whether income was enough to cover the essential bills.',
  },
  {
    pattern: /essential payments/i,
    caption: 'Whether essential bills were paid on a regular schedule.',
  },
  { pattern: /savings|surplus/i, caption: 'Money regularly set aside.' },
  { pattern: /negative balance/i, caption: 'Days the account was overdrawn.' },
  { pattern: /late fee/i, caption: 'Charges for paying a bill late.' },
  { pattern: /cashflow month/i, caption: 'Months that ended in good financial shape.' },
  { pattern: /high-risk|risk category/i, caption: 'Spending in higher-risk categories.' },
];

/*
 * Returns a plain one-line caption saying what a driver line is about, or
 * undefined when the driver does not match any kind we recognise.
 */
export function captionForDriver(driver: string): string | undefined {
  return DRIVER_CAPTIONS.find((entry) => entry.pattern.test(driver))?.caption;
}

export interface ParsedDriver {
  raw: string;
  label: string;
  points?: number;
  kind: DriverKind;
}

/*
 * This pattern finds a points value like "(+5 pts)", "(-10 pts)" or
 * "(+2.5 pts)" at the very end of a driver string. It only matches at the end,
 * so a "(+5 pts)" in the middle of a sentence is left alone.
 */
const POINTS_SUFFIX = /\s*\(([+-]?\d+(?:\.\d+)?)\s*pts\)\s*$/;

const HELPING_WORDING = /strong income coverage|income covers essential|detected consistently/i;
const HURTING_WORDING = /inconsistent|some gaps|no income/i;
// A count like the "5/6" in "Income present in 5/6 months".
const COUNT_IN_WORDING = /(\d+)\/(\d+)/;
const HELPING_SHARE_OF_COUNT = 0.5;

/*
 * Most drivers come with no points, so their wording says which way they
 * point. Wording we don't recognise stays neutral rather than being guessed.
 */
function kindFromWording(driver: string): DriverKind {
  if (HURTING_WORDING.test(driver)) return 'risk';
  if (HELPING_WORDING.test(driver)) return 'positive';

  const count = driver.match(COUNT_IN_WORDING);
  const total = Number(count?.[2]);
  if (count === null || total === 0) return 'neutral';
  return Number(count[1]) / total >= HELPING_SHARE_OF_COUNT ? 'positive' : 'risk';
}

/*
 * Splits a driver string from the API into its wording and an optional points
 * value. The points decide whether the driver counts as positive, a risk, or
 * neutral, and the wording decides when there are no points, so the UI can
 * show it under the right column.
 */
export function parseDriver(raw: string): ParsedDriver {
  const match = raw.match(POINTS_SUFFIX);
  if (match === null) {
    return { raw, label: raw.trim(), kind: kindFromWording(raw) };
  }
  const points = Number(match[1]);
  const label = raw.replace(POINTS_SUFFIX, '').trim();
  if (points === 0) {
    return { raw, label, points: 0, kind: 'neutral' };
  }
  return {
    raw,
    label,
    points,
    kind: points > 0 ? 'positive' : 'risk',
  };
}

// Bigger point values first, whichever their sign. Reasons with no points keep their order at the end.
export function sortByImpact(drivers: readonly ParsedDriver[]): ParsedDriver[] {
  return [...drivers].sort((a, b) => Math.abs(b.points ?? 0) - Math.abs(a.points ?? 0));
}

function countOfPoints(points: number): string {
  return points === 1 ? '1 point' : `${points} points`;
}

// Says how far a score is from a band edge. A medium score has two edges, so it uses the nearer one.
export function bandEdgeNote(score: number): string {
  const { mediumBandMin, highBandMin } = config.scoring;
  if (score === highBandMin) return 'Right on the High cutoff';
  if (score === mediumBandMin) return 'Right on the Medium cutoff';
  if (score > highBandMin) return `${countOfPoints(score - highBandMin)} above the High cutoff`;
  if (score < mediumBandMin) return `${countOfPoints(mediumBandMin - score)} below Medium`;

  const pointsToHigh = highBandMin - score;
  const pointsAboveLow = score - mediumBandMin;
  return pointsToHigh <= pointsAboveLow
    ? `${countOfPoints(pointsToHigh)} below High`
    : `${countOfPoints(pointsAboveLow)} above Low`;
}

export function sumDriverPoints(drivers: readonly string[]): number {
  return drivers.reduce((total, driver) => total + (parseDriver(driver).points ?? 0), 0);
}

/*
 * Where the resilience bar sits on its -20 to +25 scale, as percentages. The
 * bar starts at zero, not at the left edge, so it runs left for negative
 * points and has no width at zero.
 */
export function resilienceBarSpan(points: number): { leftPercent: number; widthPercent: number } {
  const { resilienceMinPoints: minimum, resilienceMaxPoints: maximum } = config.scoring;
  const percentAlongScale = (value: number) => ((value - minimum) / (maximum - minimum)) * 100;

  const zero = percentAlongScale(0);
  const end = percentAlongScale(Math.min(maximum, Math.max(minimum, points)));
  return { leftPercent: Math.min(zero, end), widthPercent: Math.abs(end - zero) };
}

export function formatPoints(points: number): string {
  return `${points > 0 ? '+' : ''}${points} pts`;
}
