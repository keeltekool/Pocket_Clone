import { linkClass } from "./styles";

// The Reader's text (SPEC §4.6), rendered on the server: the saved text never changes after load, so it is not sent to
// the browser a second time for hydration, and heart or toast updates never re-render it. Text nodes only: page text is
// never HTML.
export function ReaderBody({ pageText, truncated, url }: { pageText: string | null; truncated: boolean; url: string }) {
  const paragraphs = pageText?.split(/\n{2,}/).filter((p) => p.trim()) ?? [];
  if (!paragraphs.length)
    return (
      <div className="reader-empty rounded-md border border-cream-dark bg-warm-white px-5 py-6">
        <p className="text-body text-ink-soft">No text was saved for this link.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-2 inline-block ${linkClass}`}>
          Open the original ↗
        </a>
      </div>
    );
  return (
    <>
      {/* wrap-anywhere: page text carries long URLs and tokens that would widen the phone column. */}
      <div className="font-display text-[1.125rem] leading-[1.65] text-pretty wrap-anywhere text-ink md:text-[1.25rem] md:leading-[1.7] [&>p+p]:mt-[1.1em]">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {truncated && (
        <div className="reader-cut mt-10 border-t border-cream-dark pt-5">
          <p className="text-body text-ink-soft">The saved text ends here.</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className={`mt-1 inline-block ${linkClass}`}>
            Read the rest on the original ↗
          </a>
        </div>
      )}
    </>
  );
}
