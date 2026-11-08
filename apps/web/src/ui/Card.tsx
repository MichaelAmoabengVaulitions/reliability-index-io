import { type ReactNode } from 'react';

interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Screen-reader name for the card. Use this when no visible title is shown. */
  ariaLabel?: string;
  /** Extra Tailwind classes to add to the outer container, for layout tweaks. */
  className?: string;
}

/**
 * A boxed panel with an optional title bar (title on the left, action buttons
 * on the right) and a body that holds whatever children you pass in. Used
 * wherever a feature needs its own boxed area on the dashboard.
 */
export function Card({ title, actions, children, ariaLabel, className }: CardProps) {
  return (
    <section
      aria-label={ariaLabel ?? title}
      className={[
        'flex flex-col min-w-0 rounded-xl border border-slate-200 bg-white p-6 shadow-card',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title !== undefined || actions !== undefined) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title !== undefined && (
            <h2 className="m-0 text-base font-semibold text-slate-900">{title}</h2>
          )}
          {actions !== undefined && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}
