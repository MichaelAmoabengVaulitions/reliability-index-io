import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { config } from '@/config';
import { merchantCategoriesQuery } from '@/data/queries';
import { useDashboardParams } from '@/data/useDashboardParams';
import { categoryLabel } from '@/domain/categories';
import type { SortDirection, SortField, TransactionSign } from '@/domain/dashboardParams';

interface FiltersProps {
  /** Category codes present in the loaded transactions; these become the dropdown options. */
  availableCategoryCodes: readonly string[];
}

const SIGN_OPTIONS: ReadonlyArray<{ value: TransactionSign; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'inflow', label: 'Inflow' },
  { value: 'outflow', label: 'Outflow' },
];

const SORT_OPTIONS: ReadonlyArray<{
  value: `${SortField}:${SortDirection}`;
  label: string;
  field: SortField;
  direction: SortDirection;
}> = [
  { value: 'date:desc', label: 'Newest first', field: 'date', direction: 'desc' },
  { value: 'date:asc', label: 'Oldest first', field: 'date', direction: 'asc' },
  { value: 'amount:desc', label: 'Largest amount', field: 'amount', direction: 'desc' },
  { value: 'amount:asc', label: 'Smallest amount', field: 'amount', direction: 'asc' },
  { value: 'merchant_name:asc', label: 'Merchant A → Z', field: 'merchant_name', direction: 'asc' },
  {
    value: 'merchant_name:desc',
    label: 'Merchant Z → A',
    field: 'merchant_name',
    direction: 'desc',
  },
];

/**
 * The toolbar above the transaction list: a category picker, a money in/out
 * toggle, a search box and a sort menu. Search keystrokes wait for a short
 * pause before they reach the URL, so the list is not re-filtered on every
 * key press.
 */
export function Filters({ availableCategoryCodes }: FiltersProps) {
  const { filters, updateFilters } = useDashboardParams();
  const { categoryCodes, sign, search, sort } = filters;
  const { data: merchantCategories } = useQuery(merchantCategoriesQuery);

  const categoryDropdown = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeDropdown() {
      if (categoryDropdown.current !== null) categoryDropdown.current.open = false;
    }
    function closeOnOutsideClick(event: MouseEvent) {
      const clickedInside = categoryDropdown.current?.contains(event.target as Node);
      if (clickedInside !== true) closeDropdown();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeDropdown();
    }

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const [searchDraft, setSearchDraft] = useState(search);

  /*
   * The last search text this component sent to the URL. When the URL's
   * search differs from this, the change came from elsewhere (the Clear
   * filters button, or the back button), and the box below should follow it
   * rather than overwrite it.
   */
  const lastSentSearch = useRef(search);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== search) {
        lastSentSearch.current = searchDraft;
        updateFilters({ search: searchDraft });
      }
    }, config.ui.searchDebounceMs);
    return () => clearTimeout(handle);
  }, [searchDraft, search, updateFilters]);

  useEffect(() => {
    if (search !== lastSentSearch.current) {
      lastSentSearch.current = search;
      setSearchDraft(search);
    }
  }, [search]);

  function toggleCategory(code: string) {
    const nextCodes = categoryCodes.includes(code)
      ? categoryCodes.filter((existing) => existing !== code)
      : [...categoryCodes, code];
    updateFilters({ categoryCodes: nextCodes });
  }

  const currentSortValue = `${sort.field}:${sort.direction}` as const;

  // A selected code may not be in this window's data, and it still has to be untickable.
  const listedCategoryCodes = [...new Set([...availableCategoryCodes, ...categoryCodes])].sort();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative">
        <span className="sr-only">Search merchant</span>
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search merchant…"
          className="block w-56 rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-500"
        />
      </label>

      <div
        role="group"
        aria-label="Sign filter"
        className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
      >
        {SIGN_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateFilters({ sign: option.value })}
            aria-pressed={sign === option.value}
            className={`px-3 py-1 text-sm font-medium ${
              sign === option.value
                ? 'rounded bg-brand-500 text-white'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <details ref={categoryDropdown} className="relative">
        <summary className="cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          Categories{categoryCodes.length > 0 ? ` (${categoryCodes.length})` : ''}
        </summary>
        <div className="absolute left-0 z-10 mt-1 max-h-60 w-56 overflow-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          {listedCategoryCodes.length === 0 ? (
            <p className="m-0 px-2 py-1 text-xs text-slate-500">No categories in this window.</p>
          ) : (
            listedCategoryCodes.map((code) => (
              <label
                key={code}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={categoryCodes.includes(code)}
                  onChange={() => toggleCategory(code)}
                  className="rounded border-slate-300 text-brand-500"
                />
                <span className="flex-1">{categoryLabel(code, merchantCategories)}</span>
                <span className="text-xs text-slate-500">{code}</span>
              </label>
            ))
          )}
        </div>
      </details>

      <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
        Sort:
        <select
          value={currentSortValue}
          onChange={(event) => {
            const next = SORT_OPTIONS.find((option) => option.value === event.target.value);
            if (next !== undefined) {
              updateFilters({ sort: { field: next.field, direction: next.direction } });
            }
          }}
          className="rounded-md border border-slate-300 bg-white py-1.5 pl-2 pr-7 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
