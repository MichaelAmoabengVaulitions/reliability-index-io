export type ScoreBand = 'Low' | 'Medium' | 'High';
export type BillPayment = 'regular' | 'gaps' | 'missed' | 'unknown';

// A driver line from the backend whose wording the app does not recognise.
export interface OtherDriver {
  text: string;
  points: number;
}

export interface ReliabilityScore {
  userId: string;
  score: number;
  band: ScoreBand;
  monthsWithIncome: number;
  // Null when no essential bills were found, so there is nothing to compare.
  incomeComparedWithBills: number | null;
  essentialBillsPaidPercent: number;
  billPayment: BillPayment;
  goodMonths: number;
  lateFees: number;
  daysBelowZero: number;
  savingsPoints: number;
  daysBelowZeroPenaltyPoints: number;
  lateFeePenaltyPoints: number;
  highRiskPenaltyPoints: number;
  otherDrivers: OtherDriver[];
}

export const minusSign = '−';
