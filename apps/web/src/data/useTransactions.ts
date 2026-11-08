import { useQuery } from '@tanstack/react-query';

import { transactionsQuery } from './queries';

/**
 * Reads every page of transactions for a user and window, arranged so a
 * transaction can be found straight away by its id.
 */
export function useTransactions(userId: string, from: string, to: string) {
  return useQuery({
    ...transactionsQuery(userId, from, to),
    /*
     * Skip the fetch when there is no user or window date yet, so we do not
     * call "/api/users//transactions".
     */
    enabled: userId.length > 0 && from.length > 0 && to.length > 0,
  });
}
