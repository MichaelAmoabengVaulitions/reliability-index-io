import { type ReactNode } from 'react';

interface EmptyStateProps {
  /** Optional emoji or icon. It is decoration only, so screen readers skip it. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional button or link the visitor can click to do something next. */
  action?: ReactNode;
}

/**
 * Shown when a feature has nothing to display, for example when no
 * transactions match the current filters, or no user is selected yet. The
 * parent can include an action so the visitor has a next step rather than a
 * dead end.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-slate-500">
      {icon !== undefined && (
        <span aria-hidden="true" className="mb-3 text-3xl leading-none">
          {icon}
        </span>
      )}
      <p className="m-0 mb-1 text-base font-semibold text-slate-900">{title}</p>
      {description !== undefined && <p className="m-0 mb-4 max-w-[36ch] text-sm">{description}</p>}
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}
