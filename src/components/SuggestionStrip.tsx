"use client";
import type { Suggestion } from "./types";

// Suggestion strip (SPEC §3, §4.2): the newest open suggestion, above the list. The owner creates; the AI never does.
// A quiet surface in the card's own language (terracotta-pale ground, 1px cream-dark), with the name set in the serif
// so it reads as a proposed title rather than a system notice; one terracotta action, one quiet one.
export function SuggestionStrip({ suggestion, onCreate, onDismiss }: { suggestion: Suggestion; onCreate: () => void; onDismiss: () => void }) {
  const n = suggestion.itemNumbers.length;
  return (
    <section
      id="suggestion-strip"
      aria-label="Bucket suggestion"
      className="mb-4 flex flex-col gap-3 rounded-md border border-cream-dark bg-terracotta-pale px-4 py-3 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <p className="text-small text-ink-soft">
          Suggested bucket: <span className="font-display text-subheading text-ink">{suggestion.name}</span>
          <span className="text-ink-muted"> · </span>
          {n} {n === 1 ? "link" : "links"} in Unsorted
        </p>
        <p className="mt-0.5 text-micro text-ink-muted">{suggestion.reason}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 md:flex-row">
        <button
          type="button"
          onClick={onCreate}
          className="suggestion-create cursor-pointer rounded-sm bg-terracotta px-4 py-2 text-small font-semibold text-warm-white transition-all duration-200 hover:bg-terracotta-soft"
        >
          Create bucket
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="suggestion-dismiss cursor-pointer rounded-sm border-[1.5px] border-cream-dark px-4 py-2 text-small font-medium text-ink-muted transition-all duration-200 hover:border-ink-faint hover:bg-cream hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </section>
  );
}
