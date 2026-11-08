/**
 * Builds the keys React Query uses to label cached data.
 *
 * Keeping them all here means every component uses the same key for the same
 * data, so reading the cache, clearing it, and loading ahead all line up.
 */
export const queryKeys = {
  all: ['reliability'] as const,
  discovery: ['reliability', 'discovery'] as const,
  merchantCategories: ['reliability', 'merchant-categories'] as const,
  reliability: (userId: string, from: string) => [...queryKeys.all, 'score', userId, from] as const,
  transactions: (userId: string, from: string, to: string) =>
    [...queryKeys.all, 'transactions', userId, from, to] as const,
};
