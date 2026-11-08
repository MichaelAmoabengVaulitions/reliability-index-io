import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';

import { discoveryQuery } from '@/data/queries';

/**
 * Dropdown that lists every user id the backend's discovery endpoint
 * reports. Picking one takes the visitor to that user's dashboard, with the
 * default window and no filters, because each user starts fresh.
 */
export function UserPicker() {
  const navigate = useNavigate();
  const { userId: currentUserId } = useParams<{ userId: string }>();
  const { data, isLoading, error, refetch } = useQuery(discoveryQuery);

  function openUser(userId: string) {
    void navigate(`/users/${encodeURIComponent(userId)}`);
  }

  if (isLoading) {
    return <p className="px-3 text-sm text-topbar-muted">Loading users…</p>;
  }
  if (error !== null) {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-2 px-3 text-sm text-negative-onDark"
      >
        Could not load users
        <button type="button" onClick={() => void refetch()} className="rounded underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <label className="block">
      <span className="sr-only">Select a user</span>
      <span className="relative block">
        <select
          value={currentUserId ?? ''}
          onChange={(event) => openUser(event.target.value)}
          className="block w-full appearance-none rounded-md border border-topbar-border bg-topbar-hover px-3 py-2 pr-9 text-sm text-white shadow-sm"
        >
          <option value="" disabled>
            Choose a user…
          </option>
          {data?.userIds.map((id) => (
            <option key={id} value={id} className="bg-slate-900 text-white">
              {id}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-topbar-muted"
        />
      </span>
    </label>
  );
}
