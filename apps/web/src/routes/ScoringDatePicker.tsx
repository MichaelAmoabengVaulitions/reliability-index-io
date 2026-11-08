import { useState } from 'react';

import { config } from '@/config';
import { useDashboardParams } from '@/data/useDashboardParams';
import { isSelectableDate } from '@/domain/dashboardParams';
import { todayAsIsoDate } from '@/domain/dates';

interface TypedDate {
  value: string;
  /** The URL's date when this was typed. Once the URL moves on, the typing is out of date. */
  typedOver: string;
}

/**
 * Picks the date the scoring window ends on. A date box reports half-typed
 * years as real dates, so what is being typed is held here and the URL only
 * changes for a date inside the allowed range. The box shows the URL's date
 * unless typing is under way, so it can't fall out of step with the URL.
 * Emptying the box goes back to today.
 */
export function ScoringDatePicker() {
  const { from, updateFrom } = useDashboardParams();
  const [typedDate, setTypedDate] = useState<TypedDate | null>(null);
  const isTyping = typedDate?.typedOver === from;
  if (typedDate !== null && !isTyping) setTypedDate(null);
  const shownDate = isTyping ? typedDate.value : from;

  function changeDate(date: string) {
    setTypedDate({ value: date, typedOver: from });
    if (date === '' || isSelectableDate(date)) updateFrom(date);
  }

  return (
    <label className="flex items-center gap-2 text-xs text-topbar-text">
      Scoring window ends
      <input
        type="date"
        value={shownDate}
        min={config.api.earliestScoringDate}
        max={todayAsIsoDate()}
        onChange={(event) => changeDate(event.target.value)}
        onBlur={() => setTypedDate(null)}
        className="rounded-md border border-topbar-border bg-topbar-hover px-2 py-1 text-sm text-white [color-scheme:dark]"
      />
    </label>
  );
}
