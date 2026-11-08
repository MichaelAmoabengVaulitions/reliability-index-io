import { formatWholeAmount } from './money';
import { formatMonthOfDate, monthLabelsInScoringWindow } from './scoringWindow';
import type { Transaction } from './transactionList';

export interface MonthlyCashflow {
  label: string;
  moneyIn: number;
  moneyOut: number;
}

/*
 * Adds up money in and money out for each of the six months, oldest first.
 * Every month is listed, so a month with no transactions shows as zero.
 */
export function buildMonthlyCashflow(
  transactions: Transaction[],
  endDate: string,
): MonthlyCashflow[] {
  const months = monthLabelsInScoringWindow(endDate).map((label) => ({
    label,
    moneyIn: 0,
    moneyOut: 0,
  }));
  const monthsByLabel = new Map(months.map((month) => [month.label, month]));

  for (const { date, amount } of transactions) {
    const month = monthsByLabel.get(formatMonthOfDate(date));
    if (month === undefined) continue;
    if (amount > 0) month.moneyIn += amount;
    else month.moneyOut += Math.abs(amount);
  }
  return months;
}

export function summarizeCashflow(months: MonthlyCashflow[]) {
  const results = months.map((month) => month.moneyIn - month.moneyOut);
  const largestResult = Math.max(...results.map(Math.abs));
  const total = results.reduce((sum, result) => sum + result, 0);
  const average = Math.round(total / months.length);

  return {
    heading: average < 0 ? 'Overspent on average each month' : 'Left over on average each month',
    averageText: formatWholeAmount(Math.abs(average)),
    months: months.map((month, position) => {
      const result = results[position];
      return {
        label: month.label,
        resultText: formatWholeAmount(result),
        detailText: `In ${formatWholeAmount(month.moneyIn)} · Out ${formatWholeAmount(month.moneyOut)}`,
        barWidthPercent: largestResult === 0 ? 0 : (Math.abs(result) / largestResult) * 100,
        isOverspent: result < 0,
      };
    }),
  };
}
