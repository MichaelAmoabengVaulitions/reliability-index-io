import type { ReactNode } from 'react';

import { config } from '@/config';
import { useDashboardParams } from '@/data/useDashboardParams';
import { useReliability } from '@/data/useReliability';
import {
  formatCoverageRatio,
  formatPoints,
  resilienceBarSpan,
  sumDriverPoints,
} from '@/domain/scoring';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

// Each signal shows a "cap label" with the points range it can score.
const SIGNAL_CAP_LABELS = {
  regularity: '0–25 pts',
  coverage: '0–25 pts',
  essentials: '0–25 pts',
  resilience: '-20 to +25 pts',
} as const;

function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function ShareBar({ label, fraction }: { label: string; fraction: number }) {
  const width = formatPercent(Math.max(0, Math.min(1, fraction)));
  return (
    <div
      role="img"
      aria-label={`${label}: ${formatPercent(fraction)}`}
      className="h-2 w-full rounded-full bg-slate-200"
    >
      <div className="h-2 rounded-full bg-brand-500" style={{ width }} />
    </div>
  );
}

// Points can be negative, so this bar grows out from a mark at zero.
function ResilienceBar({ points }: { points: number }) {
  const { leftPercent, widthPercent } = resilienceBarSpan(points);
  const zeroPercent = resilienceBarSpan(0).leftPercent;
  return (
    <div
      role="img"
      aria-label={`Resilience adjustments: ${formatPoints(points)}`}
      className="relative h-2 w-full rounded-full bg-slate-200"
    >
      <div
        data-testid="resilience-fill"
        className="absolute h-2 bg-brand-500"
        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
      />
      <div
        data-testid="zero-mark"
        className="absolute -top-1 h-4 w-0.5 bg-slate-900"
        style={{ left: `${zeroPercent}%` }}
      />
    </div>
  );
}

interface SignalCardProps {
  title: string;
  /** The displayed value, already formatted for human reading. */
  value: string;
  /** Left out when the API gives the value no scale to draw it against. */
  bar?: ReactNode;
  capLabel: string;
  extraRow?: { label: string; value: string };
}

function SignalCard({ title, value, bar, capLabel, extraRow }: SignalCardProps) {
  return (
    <Card title={title}>
      <p className="m-0 text-3xl font-semibold text-slate-900">{value}</p>
      <p className="m-0 mt-1 text-xs text-slate-500">{capLabel}</p>
      {bar !== undefined && <div className="mt-4">{bar}</div>}
      {extraRow !== undefined && (
        <p className="m-0 mt-3 text-sm text-slate-600">
          <span className="text-slate-500">{extraRow.label}:</span>{' '}
          <span className="font-medium text-slate-800">{extraRow.value}</span>
        </p>
      )}
    </Card>
  );
}

/**
 * A four-card breakdown of the signals that make up the score.
 *
 * The first three signals come straight from the metrics. The API doesn't say
 * how many points each of those earned, and the score belongs to the backend,
 * so we show the value and the range rather than work the points out. The
 * fourth (Resilience) is the only signal with points in the API: they are the
 * ones on the driver lines, so we add those up.
 */
export function Breakdown() {
  const { userId, from } = useDashboardParams();
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} height="180px" />
        ))}
      </div>
    );
  }

  if (reliability.error !== null) {
    return (
      <ErrorState
        title="Could not load the breakdown"
        description={reliability.error.message}
        onRetry={() => void reliability.refetch()}
      />
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return <p className="text-sm text-slate-500">No breakdown data available.</p>;
  }

  const { metrics } = response;
  const resiliencePoints = sumDriverPoints(response.drivers);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SignalCard
        title="Income Regularity"
        value={formatPercent(metrics.income_regularity)}
        bar={<ShareBar label="Income Regularity" fraction={metrics.income_regularity} />}
        capLabel={SIGNAL_CAP_LABELS.regularity}
      />
      <SignalCard
        title="Income Coverage Ratio"
        value={formatCoverageRatio(metrics.income_coverage_ratio)}
        capLabel={SIGNAL_CAP_LABELS.coverage}
      />
      <SignalCard
        title="Essential Payments Consistency"
        value={formatPercent(metrics.essential_payments_consistency)}
        bar={
          <ShareBar
            label="Essential Payments Consistency"
            fraction={metrics.essential_payments_consistency}
          />
        }
        capLabel={SIGNAL_CAP_LABELS.essentials}
      />
      <SignalCard
        title="Resilience Adjustments"
        value={formatPoints(resiliencePoints)}
        bar={<ResilienceBar points={resiliencePoints} />}
        capLabel={SIGNAL_CAP_LABELS.resilience}
        extraRow={{
          label: 'Good months',
          value: `${metrics.good_months} / ${config.api.scoringWindowMonths}`,
        }}
      />
    </div>
  );
}
