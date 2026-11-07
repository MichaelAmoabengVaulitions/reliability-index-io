import { minusSign, type ReliabilityScore } from './score';

export interface BreakdownStep {
  name: string;
  points: string;
  barWidthPercent: number;
  kind: 'added' | 'takenAway';
  note: string;
}

function pointsAdded(name: string, points: number, note: string): BreakdownStep {
  return {
    name,
    points: `+${points}`,
    barWidthPercent: points,
    kind: 'added',
    note,
  };
}

function pointsTakenAway(name: string, points: number, note: string): BreakdownStep {
  return {
    name,
    points: `${minusSign}${points}`,
    barWidthPercent: points,
    kind: 'takenAway',
    note,
  };
}

/*
 * Income and bills is what remains of the score after the savings and penalty
 * points, so the steps always add up to the score. The score itself is never
 * worked out here.
 */
export function buildBreakdownSteps(score: ReliabilityScore): BreakdownStep[] {
  const {
    savingsPoints,
    daysBelowZeroPenaltyPoints,
    lateFeePenaltyPoints,
    lateFees,
    highRiskPenaltyPoints,
    otherDrivers,
  } = score;

  const otherPoints = otherDrivers.reduce((total, driver) => total + driver.points, 0);
  const incomeAndBillsPoints =
    score.score -
    savingsPoints +
    daysBelowZeroPenaltyPoints +
    lateFeePenaltyPoints +
    highRiskPenaltyPoints -
    otherPoints;

  const steps = [
    pointsAdded(
      'Income and bills',
      incomeAndBillsPoints,
      'Regular income, income compared with bills, and bills paid',
    ),
  ];
  if (savingsPoints > 0) {
    steps.push(pointsAdded('Savings', savingsPoints, 'Saves money regularly'));
  }
  if (daysBelowZeroPenaltyPoints > 0) {
    steps.push(
      pointsTakenAway(
        'Days below zero',
        daysBelowZeroPenaltyPoints,
        `About ${score.daysBelowZero} days`,
      ),
    );
  }
  if (lateFeePenaltyPoints > 0) {
    const note = lateFees === 1 ? '1 late fee' : `${lateFees} late fees`;
    steps.push(pointsTakenAway('Late fees', lateFeePenaltyPoints, note));
  }
  if (highRiskPenaltyPoints > 0) {
    steps.push(
      pointsTakenAway(
        'High-risk spending',
        highRiskPenaltyPoints,
        'Spending in high-risk categories',
      ),
    );
  }
  for (const { text, points } of otherDrivers) {
    if (points > 0) steps.push(pointsAdded(text, points, ''));
    if (points < 0) steps.push(pointsTakenAway(text, Math.abs(points), ''));
  }
  return steps;
}
