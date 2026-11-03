import { minusSign, type ReliabilityScore } from './score';
import { scoringWindowMonths } from './scoringWindow';

export interface KeyNumber {
  label: string;
  value: string;
}

export interface ScoreGroupItem {
  text: string;
  points: string;
}

export interface ScoreGroup {
  title: string;
  items: ScoreGroupItem[];
}

// Income in at least this many months counts as helping the score.
const helpingMonthsMinimum = 3;

function describeBillsComparison(score: ReliabilityScore): string {
  if (score.incomeComparedWithBills === null) return 'No bills found';
  return `${score.incomeComparedWithBills.toFixed(2)} times`;
}

function formatDriverPoints(points: number): string {
  if (points === 0) return '';
  return points > 0 ? `+${points}` : `${minusSign}${Math.abs(points)}`;
}

export function buildKeyNumbers(score: ReliabilityScore): KeyNumber[] {
  return [
    {
      label: 'Months with income',
      value: `${score.monthsWithIncome} of ${scoringWindowMonths}`,
    },
    {
      label: 'Income compared with bills',
      value: describeBillsComparison(score),
    },
    {
      label: 'Essential bills paid',
      value: `${score.essentialBillsPaidPercent}%`,
    },
    {
      label: 'Good months',
      value: `${score.goodMonths} of ${scoringWindowMonths}`,
    },
    { label: 'Late fees', value: `${score.lateFees}` },
    { label: 'Estimated days below zero', value: `${score.daysBelowZero}` },
  ];
}

export function buildScoreGroups(score: ReliabilityScore): ScoreGroup[] {
  const helping: ScoreGroupItem[] = [];
  const hurting: ScoreGroupItem[] = [];
  const noted: ScoreGroupItem[] = [];
  const add = (group: ScoreGroupItem[], text: string, points = '') => group.push({ text, points });

  add(
    score.monthsWithIncome >= helpingMonthsMinimum ? helping : hurting,
    `Income arrived in ${score.monthsWithIncome} of ${scoringWindowMonths} months`,
  );

  const comparison = score.incomeComparedWithBills;
  const hasNoIncomeOrBills = score.monthsWithIncome === 0 && score.essentialBillsPaidPercent === 0;
  if (comparison === null) add(noted, 'No essential bills found');
  else if (comparison >= 1) add(helping, `Income covers essential bills ${comparison} times`);
  else if (hasNoIncomeOrBills) add(hurting, 'No income or essential bills found');
  else add(hurting, 'Income does not cover essential bills');

  if (score.billPayment === 'regular') add(helping, 'Essential bills paid regularly');
  if (score.billPayment === 'gaps') add(hurting, 'Essential bills paid, with some gaps');
  if (score.billPayment === 'missed') add(hurting, 'Essential bills missed or irregular');

  if (score.savingsPoints > 0) add(helping, 'Saves money regularly', `+${score.savingsPoints}`);
  if (score.daysBelowZeroPenaltyPoints > 0) {
    add(
      hurting,
      `About ${score.daysBelowZero} days below zero`,
      `${minusSign}${score.daysBelowZeroPenaltyPoints}`,
    );
  }
  if (score.lateFees > 0) {
    const text = score.lateFees === 1 ? '1 late fee' : `${score.lateFees} late fees`;
    add(hurting, text, `${minusSign}${score.lateFeePenaltyPoints}`);
  }
  if (score.highRiskPenaltyPoints > 0) {
    add(hurting, 'Spending in high-risk categories', `${minusSign}${score.highRiskPenaltyPoints}`);
  }

  add(
    score.goodMonths >= helpingMonthsMinimum ? helping : hurting,
    `Good months: ${score.goodMonths} of ${scoringWindowMonths}`,
  );

  for (const driver of score.otherDrivers) {
    add(noted, driver.text, formatDriverPoints(driver.points));
  }

  const groups = [
    { title: 'What is helping', items: helping },
    { title: 'What is hurting', items: hurting },
    { title: 'Also noted', items: noted },
  ];
  return groups.filter((group) => group.items.length > 0);
}
