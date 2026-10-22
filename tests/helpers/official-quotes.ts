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
 *
 * The label and the quote marks are only the shape. A quoted line is lifted only when two more things hold
 * (`liftsQuotedLine`, since the review of #195): the piece stands at the kind's `place` (About this job's
 * rules row), and the line is one the run read from the shipped file for the group the label names
 * (`QuoteContext.read`, filled from 28a's import). So a sentence of DotAmi's own in quote marks under a copied
 * label is caught on every screen, and until 28a ships the lines nothing is lifted at all.
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
  /**
   * The words a piece's place holds where the kind may be quoted (its `where`, as the harness names places:
   * "… › about this job › rules"). A labelled run anywhere else is read as DotAmi's words.
   */
  place: string;
  /** Where the label and the quote are shown, so a reader can check them. */
  where: string;
  why: string;
}

/** About this job's first row, the government's "Employment requirements" (docs/ui-spec/cockpit/about-this-job.md). */
export const REQUIREMENT_LINES_PLACE = "about this job › rules";

export const QUOTED_SOURCE_KINDS: readonly QuotedSourceKind[] = [
  {
    id: "noc-employment-requirements",
    source: "Statistics Canada, National Occupational Classification 2021 Version 1.0, elements file, the “Employment requirements” lines",
    // "…for job group 72311 Cabinetmakers:". The group's code is the first capture; its title stops at the
    // colon, and a title has no quote marks.
    label: /The government's words, quoted in full for job group (\d{5}) [^:“”¶]{1,120}:/g,
    place: REQUIREMENT_LINES_PLACE,
    where:
      "About this job, row 1 (docs/ui-spec/cockpit/about-this-job.md; planned, task 25h; the label is `aboutJobWords.rules.lead` in lib/about-job/words.ts once it is built)",
    why: "The government's own requirement lines for the picked job group, quoted in full and in its order, labelled as its words. The durations in them (a four-year apprenticeship) are the government's, and DotAmi writes nothing about them.",
  },
];

/** One quoted line lifted from a labelled run: where it stands in the normalised text, quote marks included. */
export interface LabelledQuote {
  kind: QuotedSourceId;
  /** The job group the run's label names ("63210"). */
  group: string;
  /** The line's words, without its quote marks. */
  text: string;
  start: number;
  end: number;
}

/**
 * The lines a run read from a kind's shipped file, for one group each: what About this job is handed to
 * quote (25h, from 28a's import). Only these can be lifted. Empty until 28a ships the lines.
 */
export type QuotedLines = readonly { kind: QuotedSourceId; group: string; lines: readonly string[] }[];

/** Where a text stands and what its run read, for lifting labelled lines. Nothing given, nothing lifted. */
export interface QuoteContext {
  /** The piece's place on screen (the harness's `where`). */
  where?: string;
  /** The lines the run read from the shipped files. */
  read?: QuotedLines;
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
      const group = label[1] ?? "";
      let at = (label.index ?? 0) + label[0].length;
      for (;;) {
        NEXT_LINE.lastIndex = at;
        const line = NEXT_LINE.exec(text);
        if (!line) break;
        const end = NEXT_LINE.lastIndex;
        // The quoted line itself starts at its opening mark; a sub-heading before it stays in the text.
        const start = end - line[1].length - 2;
        out.push({ kind: kind.id, group, text: line[1], start, end });
        at = end;
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Whether a labelled line may be lifted where `context` says the text stands: the piece is at the kind's
 * place, and the run read that very line (spaces made one, ends trimmed) for the group the label names.
 */
export function liftsQuotedLine(context: QuoteContext): (quote: LabelledQuote) => boolean {
  const read = new Map<string, Set<string>>();
  for (const { kind, group, lines } of context.read ?? []) {
    const key = `${kind} ${group}`;
    const set = read.get(key) ?? new Set<string>();
    for (const line of lines) set.add(normaliseSpaces(line).trim());
    read.set(key, set);
  }
  return (quote) => {
    const place = QUOTED_SOURCE_KINDS.find((k) => k.id === quote.kind)?.place;
    if (!place || !context.where?.includes(place)) return false;
    return read.get(`${quote.kind} ${quote.group}`)?.has(quote.text.trim()) ?? false;
  };
}

/**
 * The text with the labelled runs' quoted lines taken out (each made one space), so what is left is
 * DotAmi's own words. `lift` picks which lines to take out: the no-times check takes out only the lines
 * `liftsQuotedLine` allows, the verdict check only the lines its allowances name. Returns normalised text.
 */
export function withoutLabelledQuotes(text: string, lift: (quote: LabelledQuote) => boolean): string {
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
