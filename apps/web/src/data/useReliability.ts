import { useQuery } from '@tanstack/react-query';

import { reliabilityQuery } from './queries';

/**
 * Reads the reliability score for a user and a window-start date.
 *
 * A failed request, or a response that does not match what we expect, comes
 * back on result.error, so a component can show an error message and a retry
 * button instead of handling the call itself.
 */
export function useReliability(userId: string, from: string) {
  return useQuery({
    ...reliabilityQuery(userId, from),
    /*
     * Skip the fetch when there is no user or window date yet, so we do not
     * call "/api/users//reliability".
     */
    enabled: userId.length > 0 && from.length > 0,
  });
}
