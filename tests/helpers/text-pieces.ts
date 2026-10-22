import type { PublishedWageRow } from "./number-provenance";

/**
 * The words a screen shows, as pieces the idea harness checks one by one (tests/idea-harness.spec.ts).
 * Each piece says whose words it holds, because the checks differ:
 *
 * - "dotami": a sentence DotAmi writes from its words files (lib/cockpit/words.ts, lib/roads/words.ts,
 *   lib/front-door/words.ts): every check applies, the strictest verdict words included.
 * - "catalog": a catalog's own prose (a step's name and summary, a done-when line, a cost line's name, a
 *   source's title): DotAmi's words too, held to the verdict phrases, no times and cited numbers.
 * - "official-quote": words a citation copied from its official page. They are the page's own, so no
 *   verdict or time check applies to them, and any amount in them is quoted by definition.
 * - "person": the person's own words, shown back word for word. Never checked as DotAmi's.
 *
 * Official text quoted by source kind (the government's "Employment requirements" lines on *About this
 * job*, tests/helpers/official-quotes.ts) is not an "official-quote" piece: it is collected the way the
 * screen draws it, the label and the quoted lines in one "dotami" piece (`quotedRun`), so the checks see the
 * label the lines stand under, at the row's place (its `where`), with the lines the run read from the shipped
 * file (`CockpitRun.quotedLines`). Without any of those, the lines read as DotAmi's own and fail.
 */
export type TextKind = "dotami" | "catalog" | "official-quote" | "person";

export interface TextPiece {
  /** Where the words are on screen, so a failure can be found: "typed › plan › money › Sole Prop activation". */
  where: string;
  text: string;
  kind: TextKind;
  /**
   * The published wage row the piece shows, on *About this job*'s wage row only (tests/helpers/
   * number-provenance.ts): its figures are cited facts there, and nowhere else.
   */
  wageRow?: PublishedWageRow;
}

/** One space for every run of spaces and line breaks, and straight apostrophes. */
export function normaliseSpaces(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/\s+/g, " ");
}

/**
 * A DotAmi sentence with the catalog labels it quotes taken out: “Register your business name, if you use
 * one” is a step's name, checked as catalog prose on its own, so the strict one-word verdict list doesn't
 * read a catalog word inside a DotAmi sentence twice.
 */
export function withoutQuotedLabels(text: string): string {
  return text.replace(/“[^”]*”/g, "“…”");
}
