/**
 * What DotAmi may know about the person, and the only shape it may hold it in.
 *
 * Charter rule (CLAUDE.md §"What it may know about the person", 2026-08-24): dated
 * statements in the person's own words — never summarised into a profile or an archetype,
 * never overwritten. A newer statement beats an older one by date, not by edit. Nothing
 * here feeds the evaluator (S2.5.4a): this is remembered and shown back, not scored.
 */

/** "typed" = entered in the app. "vault" is reserved for a self-hosted read-only source. */
export type StatementSource = "typed" | "vault";

export interface PersonStatement {
  /** Stable id — cuid for typed rows, the vault file path + anchor for vault rows. */
  id: string;
  /** Verbatim. The first line is what the surface shows collapsed. */
  text: string;
  /** Optional verbatim continuation (a constraint's body, a question's "why it is open"). */
  body?: string;
  /** ISO date (YYYY-MM-DD) the person said it — their claim, distinct from when it was stored. */
  saidAt: string;
  source: StatementSource;
  /** Where it lives: "app" for typed rows, the vault-relative file path for vault rows. */
  sourceRef: string;
  /** ISO datetime when it entered the store; undefined for vault rows (the file's own date is `saidAt`). */
  recordedAt?: string;
  /**
   * The idea a typed statement was typed for: set only on the sentence typed on the front door (or in
   * the intake's box), which the intake's first save links to the idea it made (2026-10-11). Absent
   * for statements typed on About you or in the map's rail, and once the idea is deleted.
   */
  idea?: { id: string; name: string };
  /**
   * Set only on the person's answer to "where do you want to be" (the future cockpit's destination,
   * 2026-10-11): the newest one is the current destination. Absent on every other statement.
   */
  kind?: "destination";
  /**
   * Client-only: false while a typed statement lives only in this browser tab because the
   * save failed (no database reachable). Never sent by the server.
   */
  persisted?: boolean;
}

/**
 * The small tag over each statement in "In your words" (About you, the map's rail). A sentence typed
 * for an idea names it; every other typed one says only "typed in DotAmi", because once its idea is
 * deleted a front-door sentence can't be told apart from one typed on About you, and "typed here" would
 * then be wrong on one screen or the other.
 */
export function statementSourceLabel(s: PersonStatement): string {
  if (s.source === "vault") return `vault · ${s.sourceRef}`;
  if (s.persisted === false) return "typed · not saved";
  return s.idea ? `typed for your idea “${s.idea.name}”` : "typed in DotAmi";
}

/** Newest first by `saidAt`, then by `recordedAt` for same-day rows. Pure. */
export function sortStatementsNewestFirst(items: PersonStatement[]): PersonStatement[] {
  return [...items].sort((a, b) => {
    if (a.saidAt !== b.saidAt) return a.saidAt < b.saidAt ? 1 : -1;
    const ra = a.recordedAt ?? "";
    const rb = b.recordedAt ?? "";
    return ra < rb ? 1 : ra > rb ? -1 : 0;
  });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts only a plain ISO date that is a real calendar day and not in the future. */
export function isValidSaidAt(value: unknown, today: string): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== value) return false;
  return value <= today;
}

export const STATEMENT_MAX_CHARS = 2000;

/**
 * Said under the front door's and the intake's box once it is full. The browser silently drops what
 * is typed or pasted past `maxLength`, so the person is told rather than left with a cut sentence.
 */
export const STATEMENT_FULL_NOTE =
  "That's the most this box holds: 2,000 characters. Anything typed or pasted past that wasn't taken, so check the end of your text.";
