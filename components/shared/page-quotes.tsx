import { PAGE_QUOTES_LEAD } from "@/lib/engines/shared/citation-check";

/**
 * The official-quote component (2026-10-23): words copied word for word from an official page, always after
 * the label that says whose words they are (`PAGE_QUOTES_LEAD`), each in its own quotation marks, on the row
 * that cites the page. It is the only place a screen draws such words: an official page's own durations ("It
 * will cost $200 and will take 1 day.") may stand only here, never as a line of DotAmi's own
 * (tests/prerelease-honesty.spec.ts checks that no other component draws a citation's quotes).
 *
 * `inline` runs the quotes on after the label, separated by a dot, in a span the caller styles (`block` for a
 * line of its own); `lines` gives the label and each quote a line of its own, the quotes in italics (Your plan,
 * made for printing).
 */
export function PageQuotes({
  quotes,
  layout = "inline",
  className = "",
}: {
  quotes: readonly string[];
  layout?: "inline" | "lines";
  className?: string;
}) {
  if (quotes.length === 0) return null;
  if (layout === "lines") {
    return (
      <div className={className || undefined}>
        <p>{PAGE_QUOTES_LEAD}</p>
        {quotes.map((quote, i) => (
          <p key={`${i}-${quote}`} className="italic">
            “{quote}”
          </p>
        ))}
      </div>
    );
  }
  return (
    <span className={className || undefined}>
      {PAGE_QUOTES_LEAD}{" "}
      {quotes.map((quote, i) => (
        <span key={`${i}-${quote}`} className="text-paper-dim">
          {i > 0 ? " · " : ""}“{quote}”
        </span>
      ))}
    </span>
  );
}
