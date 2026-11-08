import type { ReliabilityResponse } from '@/api/schemas';
import { config } from '@/config';
import { useDashboardParams } from '@/data/useDashboardParams';
import { useReliability } from '@/data/useReliability';
import { formatMonth, parseISODate, windowFor } from '@/domain/dates';
import { bandEdgeNote } from '@/domain/scoring';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

const CARD_TITLE = 'Reliability score';
const MAX_SCORE = 100;
const { mediumBandMin, highBandMin } = config.scoring;

const BAND_STYLES: Record<ReliabilityResponse['score_band'], { score: string; chip: string }> = {
  LOW: { score: 'text-negative', chip: 'bg-negative-soft text-negative-strong' },
  MEDIUM: { score: 'text-warning', chip: 'bg-warning-soft text-warning-strong' },
  HIGH: { score: 'text-positive', chip: 'bg-positive-soft text-positive-strong' },
};

function ScoreScale({ score }: { score: number }) {
  return (
    <div role="img" aria-label={`Score ${score} on a scale of 0 to ${MAX_SCORE}`}>
      <div className="relative flex h-3 gap-0.5">
        <div className="rounded-l-md bg-negative-border" style={{ flexGrow: mediumBandMin }} />
        <div className="bg-warning-dot" style={{ flexGrow: highBandMin - mediumBandMin }} />
        <div
          className="rounded-r-md bg-positive-dot"
          style={{ flexGrow: MAX_SCORE - highBandMin }}
        />
        <div
          data-testid="score-marker"
          className="absolute -top-1.5 -ml-0.5 h-6 w-1 rounded-sm bg-slate-900"
          style={{ left: `${score}%` }}
        />
      </div>
      <div className="relative mt-2 h-4 text-xs text-slate-600" aria-hidden="true">
        <span className="absolute left-0">0</span>
        <span className="absolute" style={{ left: `${mediumBandMin}%` }}>
          {mediumBandMin}
        </span>
        <span className="absolute" style={{ left: `${highBandMin}%` }}>
          {highBandMin}
        </span>
        <span className="absolute right-0">{MAX_SCORE}</span>
      </div>
    </div>
  );
}

/**
 * The headline for a user: the score, its band, where it sits on the 0 to 100
 * scale, and how close it is to the next band.
 */
export function Verdict() {
  const { userId, from } = useDashboardParams();
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <Card title={CARD_TITLE} className="h-full">
        <Skeleton height="160px" />
      </Card>
    );
  }

  if (reliability.error !== null) {
    return (
      <Card title={CARD_TITLE} className="h-full">
        <ErrorState
          title="Could not load the score"
          description={reliability.error.message}
          onRetry={() => void reliability.refetch()}
        />
      </Card>
    );
  }

  const response = reliability.data;
  if (response === undefined) {
    return (
      <Card title={CARD_TITLE} className="h-full">
        <p className="text-sm text-slate-500">No score available.</p>
      </Card>
    );
  }

  const { reliability_index: score, score_band: band, currency } = response;
  const scoringWindow = windowFor(from);
  const windowLabel = `${formatMonth(parseISODate(scoringWindow.start))} to ${formatMonth(parseISODate(scoringWindow.end))}`;

  return (
    <Card title={CARD_TITLE} className="h-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-3">
          <span className={`text-score ${BAND_STYLES[band].score}`}>{score}</span>
          <span className="text-sm text-slate-600">out of {MAX_SCORE}</span>
          <span
            className={`ml-auto rounded-full px-3 py-1 text-sm font-semibold ${BAND_STYLES[band].chip}`}
          >
            {band}
          </span>
        </div>
        <ScoreScale score={score} />
        <p className="m-0 text-sm text-slate-700">{bandEdgeNote(score)}.</p>
        <p className="m-0 text-sm text-slate-600">
          {windowLabel}, in {currency}.
        </p>
      </div>
    </Card>
  );
}
