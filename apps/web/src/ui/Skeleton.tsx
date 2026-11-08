interface SkeletonProps {
  /** Height as a CSS length, for example "16px" or "2rem". */
  height: string;
  /** Optional width. When left blank, the block fills its parent. */
  width?: string;
  /** Screen-reader announcement while the real content is loading. */
  ariaLabel?: string;
}

/**
 * A grey block with a moving highlight, shown while the real content is still
 * loading. If the visitor's system is set to reduce on-screen motion, the
 * highlight stops moving and the block stays a flat grey.
 */
export function Skeleton({ height, width, ariaLabel = 'Loading' }: SkeletonProps) {
  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className="block w-full animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none"
      style={{ height, width }}
    />
  );
}
