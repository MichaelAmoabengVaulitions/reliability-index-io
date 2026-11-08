import type { ReliabilityResponse } from '@/api/schemas';

import { toReliabilityScore } from './reliabilityScoreMapping';

// The example response from the API specification.
const response: ReliabilityResponse = {
  user_id: 'user_1001',
  from: '2026-02-20',
  currency: 'EUR',
  reliability_index: 64,
  score_band: 'MEDIUM',
  metrics: {
    income_regularity: 0.83,
    income_coverage_ratio: 1.41,
    essential_payments_consistency: 0.89,
    good_months: 4,
    negative_balance_days: 54,
    late_fee_events: 1,
  },
  drivers: [
    'Income present in 5/6 months',
    'Income covers essential expenses (1.41x)',
    'Essential payments detected consistently',
    'Savings behavior detected (+13 pts)',
    'Estimated 54 negative balance day(s) (-10 pts)',
    '1 late fee event(s) detected (-1 pts)',
    'Good cashflow months: 4/6',
  ],
};

function withDrivers(...drivers: string[]) {
  return toReliabilityScore({ ...response, drivers });
}

describe('toReliabilityScore', () => {
  it('turns the backend response into what the screens show', () => {
    expect(toReliabilityScore(response)).toEqual({
      userId: 'user_1001',
      score: 64,
      band: 'Medium',
      monthsWithIncome: 5,
      incomeComparedWithBills: 1.41,
      essentialBillsPaidPercent: 89,
      billPayment: 'regular',
      goodMonths: 4,
      lateFees: 1,
      daysBelowZero: 54,
      savingsPoints: 13,
      daysBelowZeroPenaltyPoints: 10,
      lateFeePenaltyPoints: 1,
      highRiskPenaltyPoints: 0,
      otherDrivers: [],
    });
  });

  it('keeps the score the backend sent, whatever the drivers say', () => {
    expect(withDrivers('Savings behavior detected (+25 pts)').score).toBe(64);
  });

  it('keeps a missing income comparison as missing', () => {
    const metrics = { ...response.metrics, income_coverage_ratio: null };
    expect(toReliabilityScore({ ...response, metrics }).incomeComparedWithBills).toBeNull();
  });

  it.each([
    ['Essential payments detected consistently', 'regular'],
    ['Essential payments present with some gaps', 'gaps'],
    ['Essential payments inconsistent', 'missed'],
  ])('reads "%s" as %s bill payment', (driver, billPayment) => {
    expect(withDrivers(driver).billPayment).toBe(billPayment);
  });

  it('reads high-risk spending points', () => {
    const score = withDrivers('High-risk category spending detected (-3 pts)');
    expect(score.highRiskPenaltyPoints).toBe(3);
  });

  it('keeps wording it does not recognise instead of hiding it', () => {
    expect(withDrivers('Something new (+2 pts)', 'Another note').otherDrivers).toEqual([
      { text: 'Something new', points: 2 },
      { text: 'Another note', points: 0 },
    ]);
  });
});
