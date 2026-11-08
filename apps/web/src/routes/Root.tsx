import { Outlet } from 'react-router';

import { useDashboardParams } from '@/data/useDashboardParams';

import { TopBar } from './TopBar';

/**
 * The page frame every screen sits inside: the top bar, then the page itself.
 */
export function Root() {
  const { userId } = useDashboardParams();

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <TopBar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
        {userId.length > 0 ? (
          <>
            <h1 className="sr-only">{userId}</h1>
            <Outlet />
          </>
        ) : (
          <>
            <h1 className="m-0 text-lg font-semibold text-slate-900">Pick a user to begin</h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose a user above to load their dashboard.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
