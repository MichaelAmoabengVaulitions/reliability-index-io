interface ErrorStateProps {
  title: string;
  description?: string;
  /** Called when the visitor clicks the retry button. The button only appears when this is set. */
  onRetry?: () => void;
  /** Custom wording for the retry button. */
  retryLabel?: string;
}

/**
 * Shown when something failed and the visitor can try again. When the parent
 * passes onRetry, the button gives them a way forward, so the screen is never
 * a dead end.
 */
export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-negative-border bg-negative-faint p-4 text-negative-strong"
    >
      <p className="m-0 text-base font-semibold">{title}</p>
      {description !== undefined && (
        <p className="m-0 text-sm text-negative-strong">{description}</p>
      )}
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-md border border-negative-border bg-white px-3 py-1.5 text-sm font-medium text-negative-strong hover:bg-negative-soft"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
