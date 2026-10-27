/**
 * How a source was checked, in the words every screen shows (decided 2026-10-11, option B;
 * docs/engines/citations.md).
 *
 * A citation was read (`lastVerified`, with `readBy` saying who when that is on record), checked by
 * a tool (`toolCheck`: a script found the quoted words on the live page), or both. This is the one
 * file that reads those fields: the map's sources, the Delete menu's line, the Tax year hint, the
 * playbook export and the readout all get their words from here, and the road checks get their
 * rules and dates from here too, so a tool check or an unrecorded read can never be shown as a
 * person's read (tests/citation-check.spec.ts refuses a citation's `.lastVerified` and `.readBy`
 * anywhere else in app/, components/ or lib/).
 */

import type { CitationCheck } from "./types";

/**
 * - person: a read a person is recorded as doing
 * - model:  a read an AI model is recorded as doing
 * - read:   a read with no record of who did it (most entries written before 2026-10-11)
 * - tool:   only a tool check
 */
export type HowChecked =
  | { kind: "person" | "model" | "read"; on: string }
  | { kind: "tool"; on: string; quotes: readonly string[] };

/** The check a screen shows. A read of any kind wins over a tool check: it was read for meaning. */
export function howChecked(c: CitationCheck): HowChecked {
  if (c.lastVerified) {
    const kind = c.readBy === "person" ? "person" : c.readBy === "model" ? "model" : "read";
    return { kind, on: c.lastVerified };
  }
  // The type guarantees a tool check when there is no read.
  const tool = c.toolCheck!;
  return { kind: "tool", on: tool.checkedOn, quotes: tool.quotes };
}

/**
 * The words for each kind. The tool sentence doesn't say "the quoted words", because most screens
 * don't show them; the card and the export list them under it.
 */
export function howCheckedWords(c: CitationCheck): string {
  const h = howChecked(c);
  switch (h.kind) {
    case "person":
      return `Read by a person on ${h.on}`;
    case "model":
      return `Read by an AI model on ${h.on}. Not read by a person yet.`;
    case "read":
      return `Read on ${h.on}. Who read it wasn't recorded.`;
    case "tool":
      return `Checked by a tool on ${h.on}: it found on the page the exact words this entry relies on. Not read by a person yet.`;
  }
}

/**
 * The label every screen writes before words copied from an official page (components/shared/page-quotes.tsx):
 * the official-quote component. An official page's own durations ("It will cost $200 and will take 1 day.")
 * are shown only after it, on the row that cites the page (2026-10-23; NO TIMES in DotAmi's own words).
 */
export const PAGE_QUOTES_LEAD = "Words found on the page:";

/** The words a tool check found, when that is what a screen shows; empty otherwise. */
export function toolCheckQuotes(c: CitationCheck): readonly string[] {
  const h = howChecked(c);
  return h.kind === "tool" ? h.quotes : [];
}

/**
 * True when the shown check says no person has read the page (an AI model's read, or only a tool
 * check). Screens show these in amber, the map's "check first" colour. A read nobody recorded stays
 * grey: it makes no claim either way, and it is most of the catalog.
 */
export function isCheckFirst(c: CitationCheck): boolean {
  const kind = howChecked(c).kind;
  return kind === "model" || kind === "tool";
}

/** The check fields alone, for a copy of a citation that keeps how it was checked (the playbook). */
export function checkFields(c: CitationCheck): CitationCheck {
  if (c.lastVerified) {
    return {
      lastVerified: c.lastVerified,
      ...(c.readBy ? { readBy: c.readBy } : {}),
      ...(c.toolCheck ? { toolCheck: c.toolCheck } : {}),
    };
  }
  return { toolCheck: c.toolCheck! };
}

/** The oldest day any of these sources was read (by anyone), or undefined when none was read. */
export function oldestRead(citations: readonly CitationCheck[]): string | undefined {
  const days = citations.map((c) => c.lastVerified).filter((d): d is string => Boolean(d));
  return days.length > 0 ? [...days].sort()[0] : undefined;
}

/**
 * The newest real day any of these sources was read (by anyone), or undefined when none was. A tool
 * check is not a read, and a malformed date is skipped (citationCheckProblems reports it). A road's
 * own date is this (lib/engines/roads/v2026/validate.ts).
 */
export function newestRead(citations: readonly CitationCheck[]): string | undefined {
  const days = citations.map((c) => c.lastVerified).filter((d): d is string => d !== undefined && isDay(d));
  return days.length > 0 ? [...days].sort().at(-1) : undefined;
}

/** How many of these sources a person is recorded as having read. */
export function countReadByAPerson(citations: readonly CitationCheck[]): number {
  return citations.filter((c) => howChecked(c).kind === "person").length;
}

/** True for a YYYY-MM-DD that is a real day (no 2026-02-30). */
function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The fewest words a tool check's quote may have. scripts/check-quotes.mjs refuses shorter ones too. */
export const MIN_QUOTE_WORDS = 3;

/** Words in a quote: runs between spaces that hold a letter or a digit ("$40,000 or less" is three). */
function wordCount(quote: string): number {
  return quote.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/**
 * What is wrong with a citation's check, in words a builder can act on; empty when nothing is.
 * The rules (docs/engines/citations.md): a read or a tool check (or both); readBy only with a read,
 * and only "person" or "model"; a tool check has at least one quote, none empty and none under three
 * words; dates are YYYY-MM-DD; neither date is after `today` (YYYY-MM-DD, the checker's own day).
 * Checked on every catalog by tests/engine-integrity.spec.ts.
 */
export function citationCheckProblems(c: CitationCheck, today: string): string[] {
  const problems: string[] = [];
  const read = c.lastVerified;
  const tool = c.toolCheck;
  if (!read && !tool) return ["has neither a read (lastVerified) nor a tool check"];

  // Same-format ISO days compare correctly as strings.
  if (read !== undefined) {
    if (!isDay(read)) problems.push(`read date "${read}" is not a real day written YYYY-MM-DD`);
    else if (read > today) problems.push(`read date ${read} is after today (${today})`);
  }

  const readBy: unknown = c.readBy;
  if (readBy !== undefined) {
    if (!read) problems.push(`readBy "${String(readBy)}" needs a read date (lastVerified)`);
    else if (readBy !== "person" && readBy !== "model") problems.push(`readBy "${String(readBy)}" is not "person" or "model"`);
  }

  if (tool) {
    if (!isDay(tool.checkedOn)) problems.push(`tool check date "${tool.checkedOn}" is not a real day written YYYY-MM-DD`);
    else if (tool.checkedOn > today) problems.push(`tool check date ${tool.checkedOn} is after today (${today})`);
    const quotes = tool.quotes ?? [];
    if (quotes.length === 0) problems.push("tool check has no quote");
    quotes.forEach((q, i) => {
      if (typeof q !== "string" || q.trim() === "") problems.push(`tool check quote ${i + 1} is empty`);
      else if (wordCount(q) < MIN_QUOTE_WORDS) problems.push(`tool check quote ${i + 1} has fewer than ${MIN_QUOTE_WORDS} words`);
    });
  }
  return problems;
}
