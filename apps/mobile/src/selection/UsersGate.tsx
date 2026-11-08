import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { ScreenContainer } from '@/components/ScreenContainer';
import { discoveryQuery } from '@/data/queries';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';

// Every tab needs a user, so tabs wait here until the list of users has loaded.
export function UsersGate({ children }: { children: ReactNode }) {
  const { isPending, isError, refetch } = useQuery(discoveryQuery);

  if (isError) {
    return (
      <ScreenContainer>
        <ErrorState onRetry={() => void refetch()} />
      </ScreenContainer>
    );
  }
  if (isPending) {
    return (
      <ScreenContainer>
        <LoadingState />
      </ScreenContainer>
    );
  }
  return children;
}
