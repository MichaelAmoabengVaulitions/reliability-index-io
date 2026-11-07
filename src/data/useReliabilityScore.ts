import { useQuery } from '@tanstack/react-query';

import type { ReliabilityScore } from '@/domain/score';

import { reliabilityQuery } from './queries';

export interface ReliabilityScoreResult {
  status: 'loading' | 'error' | 'ready';
  score: ReliabilityScore | undefined;
  retry: () => void;
}

export function useReliabilityScore(userId: string, endDate: string): ReliabilityScoreResult {
  const { data, isError, refetch } = useQuery(reliabilityQuery(userId, endDate));
  const retry = () => void refetch();

  // A failed refresh keeps the score already on screen. The error only shows when there is none.
  if (data !== undefined) return { status: 'ready', score: data, retry };
  if (isError) return { status: 'error', score: undefined, retry };
  return { status: 'loading', score: undefined, retry };
}
