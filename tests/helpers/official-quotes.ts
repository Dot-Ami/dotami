import { normaliseSpaces } from "./text-pieces";

/**
 * Official text DotAmi quotes word for word, allowed through the screen checks BY SOURCE KIND (task 29k).
 *
 * The no-times list (tests/helpers/time-words.ts `OFFICIAL_TIME_ALLOWANCES`) and the verdict list
 * (tests/helpers/verdict-words.ts `OFFICIAL_QUOTE_ALLOWANCES`) name their allowed lines one by one. That
 * works for the roads' few dozen lines, and can't work for *About this job*, which quotes the government's
 * "Employment requirements" lines for any of about 500 job groups (2,122 lines in the NOC 2021 elements file).
 * The maintainer's call for phase 2: NO TIMES in DotAmi's own words, and the government's quoted requirement
 * text allowed, labelled as the government's words. So a source kind is allowed instead of each line:
 *
 * - The screen writes the kind's **label** first, saying whose words follow (*The government's words, quoted
 *   in full for job group 63210 Hairstylists and barbers:*, docs/ui-spec/cockpit/about-this-job.md row 1).
 * - Then each line **inside quote marks** (“…”), one after another. A sub-heading the file gives within a
 *   group (*Hairstylists*, *Barbers*) may stand between two lines, unquoted.
 *
 * Only the quoted lines in that run are lifted. The label, the sub-headings and anything after the run are
 * still read as DotAmi's words, and the same line written without its label, or without its quote marks,
 * is DotAmi's own sentence and is caught. tests/official-quotes.spec.ts holds the planted controls.
 */

/** The kinds of official text allowed by source kind. */
export type QuotedSourceId = "noc-employment-requirements";

export interface QuotedSourceKind {
  id: QuotedSourceId;
  /** The source, as a reader would look it up. */
  source: string;
  /**
   * The words the screen writes before the quote, saying whose words they are. Matched against text with
   * its spaces made one and its apostrophes straight (`normaliseSpaces`).
   */
  label: RegExp;
  /** Where the label and the quote are shown, so a reader can check them. */
  where: string;
  why: string;
}

export const QUOTED_SOURCE_KINDS: readonly QuotedSourceKind[] = [
  {
    id: "noc-employment-requirements",
    source: "Statistics Canada, National Occupational Classification 2021 Version 1.0, elements file, the “Employment requirements” lines",
    // "…for job group 72311 Cabinetmakers:". The group's title stops at the colon; a title has no quote marks.
    label: /The government's words, quoted in full for job group \d{5} [^:“”¶]{1,120}:/g,
    where:
      "About this job, row 1 (docs/ui-spec/cockpit/about-this-job.md; planned, task 25h; the label is `aboutJobWords.rules.lead` in lib/about-job/words.ts once it is built)",
    why: "The government's own requirement lines for the picked job group, quoted in full and in its order, labelled as its words. The durations in them (a four-year apprenticeship) are the government's, and DotAmi writes nothing about them.",
  },
];

/** One quoted line lifted from a labelled run: where it stands in the normalised text, quote marks included. */
export interface LabelledQuote {
  kind: QuotedSourceId;
  /** The line's words, without its quote marks. */
  text: string;
  start: number;
  end: number;
}

// After the label, or after the line before: spaces or the sweep's block mark, then an optional sub-heading
// (a capitalised short run with no sentence punctuation), then one quoted line.
const NEXT_LINE = /(?:\s|¶)*(?:[A-Z][^“”¶.:;!?]{0,60}?(?:\s|¶)+)?“([^”]*)”/y;

/**
 * Every quoted line that stands in a labelled run, in a text already normalised with `normaliseSpaces`.
 * A run is the label, then quoted lines one after another; it ends at the first thing that isn't one.
 */
export function labelledQuotes(text: string): LabelledQuote[] {
  const out: LabelledQuote[] = [];
  for (const kind of QUOTED_SOURCE_KINDS) {
    for (const label of text.matchAll(new RegExp(kind.label.source, kind.label.flags.includes("g") ? kind.label.flags : `${kind.label.flags}g`))) {
      let at = (label.index ?? 0) + label[0].length;
      for (;;) {
        NEXT_LINE.lastIndex = at;
        const line = NEXT_LINE.exec(text);
        if (!line) break;
        const end = NEXT_LINE.lastIndex;
        // The quoted line itself starts at its opening mark; a sub-heading before it stays in the text.
        const start = end - line[1].length - 2;
        out.push({ kind: kind.id, text: line[1], start, end });
        at = end;
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * The text with the labelled runs' quoted lines taken out (each made one space), so what is left is
 * DotAmi's own words. `lift` picks which lines to take out (all of them when it isn't given): the verdict
 * check takes out only the lines its allowances name. Returns normalised text.
 */
export function withoutLabelledQuotes(text: string, lift: (quote: LabelledQuote) => boolean = () => true): string {
  const rest = normaliseSpaces(text);
  let out = "";
  let from = 0;
  for (const quote of labelledQuotes(rest)) {
    if (quote.start < from || !lift(quote)) continue;
    out += `${rest.slice(from, quote.start)} `;
    from = quote.end;
  }
  return out + rest.slice(from);
}

/**
 * The text a screen shows for a labelled run, as the harness collects it (one piece, the way the screen
 * draws it): the label, then each line inside quote marks, a sub-heading unquoted.
 */
export function quotedRun(label: string, lines: readonly (string | { subheading: string })[]): string {
  const parts = lines.map((line) => (typeof line === "string" ? `“${line.trim()}”` : line.subheading.trim()));
  return [label, ...parts].join(" ");
}
