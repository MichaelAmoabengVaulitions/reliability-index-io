import type { MonthlyCashflow } from '@/domain/cashflow';
import { monthLabelsInScoringWindow } from '@/domain/scoringWindow';

// Money in and money out for each of the six months, from the design.
const overspendingMonths = [
  [0, 1585],
  [0, 1502],
  [0, 1563],
  [0, 1506],
  [0, 1569],
  [0, 1500],
];
const savingMonths = [
  [6424, 1996],
  [6289, 2019],
  [6407, 1960],
  [6498, 1983],
  [6640, 2059],
  [6668, 2013],
];

const overspendingUserId = 'user_1006';

export function dummyCashflowFor(userId: string, endDate: string): MonthlyCashflow[] {
  const amounts = userId === overspendingUserId ? overspendingMonths : savingMonths;
  const labels = monthLabelsInScoringWindow(endDate);
  return amounts.map(([moneyIn, moneyOut], position) => ({
    label: labels[position],
    moneyIn,
    moneyOut,
  }));
}
