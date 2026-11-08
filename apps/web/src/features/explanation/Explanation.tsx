import type { ReliabilityResponse } from '@/api/schemas';
import { useDashboardParams } from '@/data/useDashboardParams';
import { useReliability } from '@/data/useReliability';
import {
  type ParsedDriver,
  captionForDriver,
  formatPoints,
  parseDriver,
  sortByImpact,
} from '@/domain/scoring';
import { Card } from '@/ui/Card';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

const CARD_TITLE = 'Why this score';

/*
 * A short opening line for each band. The detail that makes an explanation
 * useful is in the driver rows below, not in this sentence.
 */
const BAND_SUMMARY: Record<ReliabilityResponse['score_band'], string> = {
  LOW: 'A low score. The signals below show what is holding it back.',
  MEDIUM: 'A middle-band score: a mix of strengths and risks, listed below.',
  HIGH: 'A high score. The signals below show a consistent profile.',
};

interface DriverRowProps {
  driver: ParsedDriver;
}

function pointsChipClasses(driver: ParsedDriver): string {
  if (driver.kind === 'positive') return 'bg-positive-soft text-positive-strong';
  if (driver.kind === 'risk') return 'bg-negative-soft text-negative-strong';
  return 'bg-slate-100 text-slate-700';
}

function DriverRow({ driver }: DriverRowProps) {
  const caption = captionForDriver(driver.raw);
  return (
    <li className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="m-0 text-sm text-slate-700">{driver.label}</p>
        {caption !== undefined && <p className="m-0 mt-0.5 text-xs text-slate-500">{caption}</p>}
      </div>
      {driver.points !== undefined && (
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pointsChipClasses(driver)}`}
        >
          {formatPoints(driver.points)}
        </span>
      )}
    </li>
  );
}

interface ColumnProps {
  title: string;
  drivers: ParsedDriver[];
  emptyHint: string;
}

function Column({ title, drivers, emptyHint }: ColumnProps) {
  return (
    <div>
      <h3 className="m-0 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </h3>
      {drivers.length === 0 ? (
        <p className="m-0 text-sm text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="m-0 divide-y divide-slate-100 p-0">
          {drivers.map((driver, index) => (
            <DriverRow key={`${index}-${driver.raw}`} driver={driver} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Splits the API's driver strings into "what's helping", "what's hurting",
 * and a Notes column for the ones we can't place.
 *
 * The short line above the columns changes with the band, so the page always
 * opens with a sentence the analyst can read out loud.
 */
export function Explanation() {
  const { userId, from } = useDashboardParams();
  const reliability = useReliability(userId, from);

  if (reliability.isLoading) {
    return (
      <Card title={CARD_TITLE} className="h-full">
        <Skeleton height="220px" />
      </Card>
    );
  }

  if (reliability.error !== null) {
    return (
      <Card title={CARD_TITLE} className="h-full">
        <ErrorState
          title="Could not load explanations"
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
        <p className="text-sm text-slate-500">No explanation available.</p>
      </Card>
    );
  }

  const parsed = sortByImpact(response.drivers.map(parseDriver));
  const helping = parsed.filter((driver) => driver.kind === 'positive');
  const hurting = parsed.filter((driver) => driver.kind === 'risk');
  const notes = parsed.filter((driver) => driver.kind === 'neutral');

  return (
    <Card title={CARD_TITLE} className="h-full">
      <p className="m-0 mb-4 text-sm text-slate-700">{BAND_SUMMARY[response.score_band]}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Column
          title="What's helping"
          drivers={helping}
          emptyHint="No positive drivers in the window."
        />
        <Column
          title="What's hurting"
          drivers={hurting}
          emptyHint="No risk drivers in the window."
        />
      </div>
      {notes.length > 0 && (
        <div className="mt-6">
          <Column title="Notes" drivers={notes} emptyHint="" />
        </div>
      )}
    </Card>
  );
}
