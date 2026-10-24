// Shared class strings. A plain module (no "use client"), so server components (ReaderBody) can import them too.

/** The bordered cream chip of `#58` and Read (card and Reader). */
export const chipClass =
  "whitespace-nowrap rounded-sm border border-cream-dark bg-cream px-2 py-1 text-micro font-semibold text-ink-muted transition-all duration-150 hover:border-ink-faint hover:bg-cream-dark hover:text-terracotta";

/** A terracotta text link (Reader controls, the not-found page). */
export const linkClass = "text-small font-medium text-terracotta underline-offset-4 transition-colors hover:text-terracotta-soft hover:underline";
