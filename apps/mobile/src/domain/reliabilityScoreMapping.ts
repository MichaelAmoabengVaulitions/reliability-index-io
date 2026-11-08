import type { ReliabilityResponse } from '@reliability-index/core/api/schemas';

import { parseDriver, type ParsedDriver } from './drivers';
import type { BillPayment, ReliabilityScore, ScoreBand } from './score';
import { scoringWindowMonths } from './scoringWindow';

const bandNames: Record<ReliabilityResponse['score_band'], ScoreBand> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const savingsDriver = /savings|surplus/i;
const daysBelowZeroDriver = /negative balance/i;
const lateFeeDriver = /late fee/i;
const highRiskDriver = /high-risk|risk category/i;
const billPaymentDriver = /essential payments/i;

// These lines repeat numbers the screens already show from the metrics.
const driversShownFromMetrics = [
  /income present/i,
  /no income/i,
  /income.*cover|coverage/i,
  /cashflow month/i,
];

const knownDrivers = [
  savingsDriver,
  daysBelowZeroDriver,
  lateFeeDriver,
  highRiskDriver,
  billPaymentDriver,
  ...driversShownFromMetrics,
];

function pointsFrom(drivers: ParsedDriver[], pattern: RegExp): number {
  const driver = drivers.find(({ label }) => pattern.test(label));
  return Math.abs(driver?.points ?? 0);
}

function readBillPayment(drivers: ParsedDriver[]): BillPayment {
  const driver = drivers.find(({ label }) => billPaymentDriver.test(label));
  if (driver === undefined) return 'unknown';
  if (/consistently/i.test(driver.label)) return 'regular';
  if (/some gaps/i.test(driver.label)) return 'gaps';
  return 'missed';
}

/*
 * Turns a backend response into what the screens show. The score and band are
 * passed through as sent. Driver wording the app does not recognise is kept,
 * so nothing the backend says is guessed at or hidden.
 */
export function toReliabilityScore(response: ReliabilityResponse): ReliabilityScore {
  const { metrics } = response;
  const drivers = response.drivers.map(parseDriver);

  return {
    userId: response.user_id,
    score: response.reliability_index,
    band: bandNames[response.score_band],
    monthsWithIncome: Math.round(metrics.income_regularity * scoringWindowMonths),
    incomeComparedWithBills: metrics.income_coverage_ratio,
    essentialBillsPaidPercent: Math.round(metrics.essential_payments_consistency * 100),
    billPayment: readBillPayment(drivers),
    goodMonths: metrics.good_months,
    lateFees: metrics.late_fee_events,
    daysBelowZero: metrics.negative_balance_days,
    savingsPoints: pointsFrom(drivers, savingsDriver),
    daysBelowZeroPenaltyPoints: pointsFrom(drivers, daysBelowZeroDriver),
    lateFeePenaltyPoints: pointsFrom(drivers, lateFeeDriver),
    highRiskPenaltyPoints: pointsFrom(drivers, highRiskDriver),
    otherDrivers: drivers
      .filter(({ label }) => !knownDrivers.some((pattern) => pattern.test(label)))
      .map(({ label, points }) => ({ text: label, points })),
  };
}
