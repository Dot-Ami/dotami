import { PAGE_QUOTES_LEAD } from "@/lib/engines/shared/citation-check";

/**
 * The official-quote component (2026-10-23): the words a tool check found on an official page (since 2026-10-27
 * also on a provider's own page: Anthropic's, on how long it keeps what the intake sends) (a citation's
 * `toolCheck.quotes`, read through `toolCheckQuotes`, and the fee lines' quotes copied from them), always after
 * the label that says whose words they are (`PAGE_QUOTES_LEAD`), each in its own quotation marks, on the row
 * that cites the page. Those quotes are drawn here and nowhere else, so an official page's own durations ("It
 * will cost $200 and will take 1 day.") stand only after that label, never as a line of DotAmi's own.
 * tests/prerelease-honesty.spec.ts reads every other component's source for a `quotes` list or
 * `toolCheckQuotes(…)` being mapped over; it reads text, so a list under another name would get past it.
 *
 * It is not the only place a screen quotes an official source. Three others do, each under a label of its own:
 * OfficialWordsBlock (components/shared/official-words.tsx: a catalog's `officialWords`, under its `lead`),
 * About this job's requirement lines (components/cockpit/about-this-job-panel.tsx, under the government's label,
 * held by tests/helpers/official-quotes.ts) and the example's sources (components/cockpit/example-sources.tsx
 * `Seen`: the words seen beside a price or a statistic, under its link and day).
 *
 * `inline` runs the quotes on after the label, separated by a dot, in a span the caller styles (`block` for a
 * line of its own); `lines` gives the label and each quote a line of its own, the quotes in italics (Your plan,
 * made for printing).
 *
 * `lead` (since 2026-10-29) gives a second set of quotes from the same page a label of its own, in place of
 * `PAGE_QUOTES_LEAD`, never beside it: What DotAmi knows about you draws Anthropic's two further sections after
 * the five under "Anthropic's page also says:". The caller holds that label's words, as it holds its other labels;
 * the quotes are still drawn here and only here.
 */
export function PageQuotes({
  quotes,
  layout = "inline",
  className = "",
  lead = PAGE_QUOTES_LEAD,
}: {
  quotes: readonly string[];
  layout?: "inline" | "lines";
  className?: string;
  /** The label before the quotes; the usual one unless a second set from the same page needs its own. */
  lead?: string;
}) {
  if (quotes.length === 0) return null;
  if (layout === "lines") {
    return (
      <div className={className || undefined}>
        <p>{lead}</p>
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
      {lead}{" "}
      {quotes.map((quote, i) => (
        <span key={`${i}-${quote}`} className="text-paper-dim">
          {i > 0 ? " · " : ""}“{quote}”
        </span>
      ))}
    </span>
  );
}
