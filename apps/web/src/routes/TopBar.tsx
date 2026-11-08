import { Activity } from 'lucide-react';

import { useDashboardParams } from '@/data/useDashboardParams';

import { ScoringDatePicker } from './ScoringDatePicker';
import { UserPicker } from './UserPicker';

/**
 * The bar across the top of every page: the product name, the user picker,
 * and the date picker once a user is chosen. It wraps on narrow screens.
 */
export function TopBar() {
  const { userId } = useDashboardParams();

  return (
    <header className="on-dark sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-3 bg-topbar px-6 py-3 text-topbar-text">
      <div className="mr-auto flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold text-white">Reliability Index</span>
      </div>
      <div className="w-44">
        <UserPicker />
      </div>
      {userId.length > 0 && <ScoringDatePicker />}
    </header>
  );
}
