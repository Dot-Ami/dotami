/**
 * How a source was checked, in the words every screen shows (decided 2026-10-11, option B;
 * docs/engines/citations.md).
 *
 * A citation was read by a person (`lastVerified`), checked by a tool (`toolCheck`: a script found
 * the quoted words on the live page), or both. This is the one file that reads those dates: the map's
 * sources, the Delete menu's line, the Tax year hint, the playbook export and the readout all get
 * their words from here, so a tool check can never be shown as a person's read
 * (tests/citation-check.spec.ts refuses `.lastVerified` anywhere else in app/, components/ or lib/).
 */

import type { CitationCheck } from "./types";

export type HowChecked = { kind: "person"; on: string } | { kind: "tool"; on: string; quotes: readonly string[] };

/** The check a screen shows. When a person read the source, that wins over a tool check. */
export function howChecked(c: CitationCheck): HowChecked {
  if (c.lastVerified) return { kind: "person", on: c.lastVerified };
  // The type guarantees a tool check when there is no person's read.
  const tool = c.toolCheck!;
  return { kind: "tool", on: tool.checkedOn, quotes: tool.quotes };
}

/** What a tool check adds after its date: what the tool did, and that no person has read the page. */
export const TOOL_CHECK_MEANING = "the quoted words were found on the page. Not read by a person yet.";

/**
 * "Read by a person on 2026-10-10", or
 * "Checked by a tool on 2026-10-11: the quoted words were found on the page. Not read by a person yet."
 */
export function howCheckedWords(c: CitationCheck): string {
  const h = howChecked(c);
  return h.kind === "person" ? `Read by a person on ${h.on}` : `Checked by a tool on ${h.on}: ${TOOL_CHECK_MEANING}`;
}

/** The two check fields alone, for a copy of a citation that keeps how it was checked (the playbook). */
export function checkFields(c: CitationCheck): CitationCheck {
  if (c.lastVerified) return c.toolCheck ? { lastVerified: c.lastVerified, toolCheck: c.toolCheck } : { lastVerified: c.lastVerified };
  return { toolCheck: c.toolCheck! };
}

/** The oldest day a person read any of these sources, or undefined when no person has read one. */
export function oldestPersonRead(citations: readonly CitationCheck[]): string | undefined {
  const days = citations.map((c) => c.lastVerified).filter((d): d is string => Boolean(d));
  return days.length > 0 ? [...days].sort()[0] : undefined;
}

/** True for a YYYY-MM-DD that is a real day (no 2026-02-30). */
function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/**
 * What is wrong with a citation's check, in words a builder can act on; empty when nothing is.
 * The rules (docs/engines/citations.md): a person's read or a tool check (or both); a tool check has
 * at least one quote and no empty one; dates are YYYY-MM-DD; a tool check is never dated after
 * `today` (YYYY-MM-DD, the checker's own day). Checked on every catalog by
 * tests/engine-integrity.spec.ts.
 */
export function citationCheckProblems(c: CitationCheck, today: string): string[] {
  const problems: string[] = [];
  const person = c.lastVerified;
  const tool = c.toolCheck;
  if (!person && !tool) return ["has neither a person's read (lastVerified) nor a tool check"];

  if (person !== undefined && !isDay(person)) problems.push(`person's read date "${person}" is not a real day written YYYY-MM-DD`);

  if (tool) {
    if (!isDay(tool.checkedOn)) problems.push(`tool check date "${tool.checkedOn}" is not a real day written YYYY-MM-DD`);
    // Same-format ISO days compare correctly as strings.
    else if (tool.checkedOn > today) problems.push(`tool check date ${tool.checkedOn} is after today (${today})`);
    const quotes = tool.quotes ?? [];
    if (quotes.length === 0) problems.push("tool check has no quote");
    quotes.forEach((q, i) => {
      if (typeof q !== "string" || q.trim() === "") problems.push(`tool check quote ${i + 1} is empty`);
    });
  }
  return problems;
}
