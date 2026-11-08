import { config } from '@/config';
import { useDashboardParams } from '@/data/useDashboardParams';
import { useReliability } from '@/data/useReliability';
import { formatCoverageRatio } from '@/domain/scoring';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

const CARD_TITLE = 'Key numbers';
const TILE_COUNT = 6;

/*
 * One plain line under each tile, saying what the number measures. The
 * wording follows the backend's own driver phrasing, so we describe the
 * number rather than invent a meaning for it.
 */
const METRIC_DESCRIPTIONS = {
  incomeRegularity: 'Share of months that had income.',
  incomeCoverage: 'How far income covers essential expenses.',
  essentialPayments: 'How consistently essential bills were paid.',
  goodMonths: 'Months with healthy cashflow in the scoring window.',
  negativeBalanceDays: 'Days the balance was estimated below zero.',
  lateFees: 'Late-fee charges detected.',
} as const;

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface MetricTileProps {
  label: string;
  value: string;
  description: string;
}

function MetricTile({ label, value, description }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-xl font-semibold text-slate-900">{value}</p>
      <p className="m-0 mt-0.5 text-xs text-slate-500">{description}</p>
    </div>
  );
}

/**
 * Six tiles of key numbers from the reliability response.
 */
export function Overview() {
  const { userId, from } = useDashboardParams();
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <Card title={CARD_TITLE}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: TILE_COUNT }).map((_, index) => (
            <Skeleton key={index} height="56px" />
          ))}
        </div>
      </Card>
    );
  }

  if (reliability.error !== null) {
    return (
      <Card title={CARD_TITLE}>
        <ErrorState
          title="Could not load the key numbers"
          description={reliability.error.message}
          onRetry={() => void reliability.refetch()}
        />
      </Card>
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return (
      <Card title={CARD_TITLE}>
        <p className="text-sm text-slate-500">No key numbers available.</p>
      </Card>
    );
  }

  const { metrics } = response;

  return (
    <Card title={CARD_TITLE}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile
          label="Income regularity"
          value={formatPercent(metrics.income_regularity)}
          description={METRIC_DESCRIPTIONS.incomeRegularity}
        />
        <MetricTile
          label="Income vs expenses"
          value={formatCoverageRatio(metrics.income_coverage_ratio)}
          description={METRIC_DESCRIPTIONS.incomeCoverage}
        />
        <MetricTile
          label="Essential payments"
          value={formatPercent(metrics.essential_payments_consistency)}
          description={METRIC_DESCRIPTIONS.essentialPayments}
        />
        <MetricTile
          label="Good months"
          value={`${metrics.good_months} / ${config.api.scoringWindowMonths}`}
          description={METRIC_DESCRIPTIONS.goodMonths}
        />
        <MetricTile
          label="Negative balance days"
          value={`${metrics.negative_balance_days}`}
          description={METRIC_DESCRIPTIONS.negativeBalanceDays}
        />
        <MetricTile
          label="Late fees"
          value={`${metrics.late_fee_events}`}
          description={METRIC_DESCRIPTIONS.lateFees}
        />
      </div>
    </Card>
  );
}
