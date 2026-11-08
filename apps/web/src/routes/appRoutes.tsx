import type { QueryClient } from '@tanstack/react-query';
import type { RouteObject } from 'react-router';

import { ErrorBoundary } from '@/ui/ErrorBoundary';

import { Dashboard } from './Dashboard';
import { dashboardLoader, rootLoader, shouldReloadDashboard } from './loaders';
import { NotFound } from './NotFound';
import { Root } from './Root';

export function appRoutes(queryClient: QueryClient): RouteObject[] {
  return [
    {
      path: '/',
      // Each card has its own boundary. This one catches a crash in the page frame.
      element: (
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      ),
      loader: rootLoader(queryClient),
      shouldRevalidate: () => false,
      // The loaders don't wait for data, so this only shows for a moment.
      hydrateFallbackElement: <></>,
      children: [
        {
          path: 'users/:userId',
          element: <Dashboard />,
          loader: dashboardLoader(queryClient),
          shouldRevalidate: shouldReloadDashboard,
        },
      ],
    },
    { path: '*', element: <NotFound /> },
  ];
}
