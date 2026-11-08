const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const earliestScoringDate = '2026-02-28';
export const scoringWindowMonths = 6;

interface CalendarMonth {
  year: number;
  // Counted from 0, so January is 0.
  monthIndex: number;
}

function readDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return { year, monthIndex: month - 1, day };
}

// The end date's month counts as the last of the six months.
function listMonthsInWindow(endDate: string): CalendarMonth[] {
  const { year, monthIndex } = readDate(endDate);
  return Array.from({ length: scoringWindowMonths }, (_, position) => {
    const monthsFromStart = monthIndex - (scoringWindowMonths - 1) + position;
    const firstOfMonth = new Date(Date.UTC(year, monthsFromStart, 1));
    return {
      year: firstOfMonth.getUTCFullYear(),
      monthIndex: firstOfMonth.getUTCMonth(),
    };
  });
}

export function describeScoringWindow(endDate: string) {
  const end = readDate(endDate);
  const [start] = listMonthsInWindow(endDate);
  const startMonth = monthNames[start.monthIndex];
  const endMonth = monthNames[end.monthIndex];
  const isSameYear = start.year === end.year;

  return {
    shortLabel: isSameYear
      ? `${startMonth} – ${endMonth} ${end.year}`
      : `${startMonth} ${start.year} – ${endMonth} ${end.year}`,
    longLabel: isSameYear
      ? `${startMonth} 1 – ${endMonth} ${end.day}, ${end.year}`
      : `${startMonth} 1, ${start.year} – ${endMonth} ${end.day}, ${end.year}`,
  };
}

export function monthLabelsInScoringWindow(endDate: string): string[] {
  const monthsInScoringWindow = listMonthsInWindow(endDate).map(
    ({ year, monthIndex }) => `${monthNames[monthIndex]} ${year}`,
  );
  return monthsInScoringWindow;
}

// Written the same way as the scoring window, so dates match everywhere.
export function formatDate(date: string): string {
  const { year, monthIndex, day } = readDate(date);
  return `${monthNames[monthIndex]} ${day}, ${year}`;
}

// The dates to ask the backend for: the first day of the window up to the end date.
export function scoringWindowDates(endDate: string) {
  const [start] = listMonthsInWindow(endDate);
  const startMonth = String(start.monthIndex + 1).padStart(2, '0');
  return { start: `${start.year}-${startMonth}-01`, end: endDate };
}

// The month a date falls in, written the same way as the scoring window's months.
export function formatMonthOfDate(date: string): string {
  const { year, monthIndex } = readDate(date);
  return `${monthNames[monthIndex]} ${year}`;
}

// The date picker works with local dates, so these stay in local time on purpose.
export function toPickerDate(date: string): Date {
  const { year, monthIndex, day } = readDate(date);
  return new Date(year, monthIndex, day);
}

export function fromPickerDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// The backend works in UTC, so the viewer's time zone must not change the day.
export function todayAsDate(): string {
  return new Date().toISOString().slice(0, 10);
}
