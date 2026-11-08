import { useMemo } from 'react';

import { fromState } from '@/data/transactionState';
import { useDashboardParams } from '@/data/useDashboardParams';
import type { StreamState, StreamStatus } from '@/data/useTransactionEventStream';
import { useTransactions } from '@/data/useTransactions';
import { windowFor } from '@/domain/dates';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Skeleton } from '@/ui/Skeleton';

import { Filters } from './Filters';
import { applyTransactionFilters } from './filterTransactions';
import { VirtualTable } from './VirtualTable';

const LOADING_ROW_COUNT = 8;

/*
 * How each connection state of the live updates stream looks, and what it
 * announces to screen readers. Colour is not the only signal: every state
 * also has a short label, so colour-blind users and screen-reader users get
 * the same information.
 */
const STREAM_BADGE_BY_STATUS: Record<StreamStatus, { dot: string; text: string; label: string }> = {
  idle: { dot: 'bg-slate-300', text: 'text-slate-500', label: 'Live updates idle' },
  connecting: {
    dot: 'bg-warning-dot animate-pulse',
    text: 'text-warning',
    label: 'Connecting to live updates',
  },
  open: { dot: 'bg-positive-dot animate-pulse', text: 'text-positive', label: 'Live' },
};

function LiveBadge({ status }: { status: StreamStatus }) {
  const tone = STREAM_BADGE_BY_STATUS[status];
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden="true" />
      {tone.label}
    </span>
  );
}

/**
 * The transaction explorer feature card.
 *
 * It puts together the toolbar (Filters), the long list (VirtualTable) and a
 * count line. The filtering and sorting is all done by applyTransactionFilters
 * in ./filterTransactions.ts; this component just gathers the inputs and shows
 * the result.
 */
export function Explorer({ stream }: { stream: StreamState }) {
  const { userId, from, filters, resetFilters } = useDashboardParams();
  const scoringWindow = windowFor(from);
  const transactions = useTransactions(userId, scoringWindow.start, scoringWindow.end);

  const allTransactions = useMemo(() => {
    if (transactions.data === undefined) return [];
    return fromState(transactions.data.state);
  }, [transactions.data]);

  const visibleTransactions = useMemo(
    () => applyTransactionFilters(allTransactions, filters),
    [allTransactions, filters],
  );

  const availableCategoryCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const tx of allTransactions) codes.add(tx.merchant_category_code);
    return [...codes].sort();
  }, [allTransactions]);

  if (transactions.isLoading) {
    return (
      <Card title="Transactions" actions={<LiveBadge status={stream.status} />}>
        <div className="space-y-2">
          {Array.from({ length: LOADING_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} height="44px" />
          ))}
        </div>
      </Card>
    );
  }

  if (transactions.error !== null) {
    return (
      <Card title="Transactions" actions={<LiveBadge status={stream.status} />}>
        <ErrorState
          title="Could not load transactions"
          description={transactions.error.message}
          onRetry={() => void transactions.refetch()}
        />
      </Card>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Card title="Transactions" actions={<LiveBadge status={stream.status} />}>
        <EmptyState
          icon="📋"
          title="No transactions in this window"
          description="Try a different scoring window or a different user."
        />
      </Card>
    );
  }

  const totalCount = allTransactions.length;
  const visibleCount = visibleTransactions.length;

  return (
    <Card title="Transactions" actions={<LiveBadge status={stream.status} />}>
      <div className="mb-3">
        <Filters availableCategoryCodes={availableCategoryCodes} />
      </div>
      {visibleCount === 0 ? (
        <EmptyState
          icon="🔍"
          title="No transactions match these filters"
          description="Try widening your search or removing a filter."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <VirtualTable transactions={visibleTransactions} />
          <p className="m-0 mt-3 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{visibleCount}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalCount}</span> transactions
            {stream.eventCount > 0 && (
              <span className="ml-2 font-semibold text-positive">
                · {stream.eventCount} live {stream.eventCount === 1 ? 'update' : 'updates'}
              </span>
            )}
          </p>
        </>
      )}
    </Card>
  );
}
