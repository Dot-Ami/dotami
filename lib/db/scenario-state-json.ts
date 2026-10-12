import type { ScenarioState } from "@/lib/scenarios/types";

/**
 * The `ScenarioState.activeBranches` database column holds an idea's map answers as one JSON object:
 * the branch picks (`gstTiming`, `incorporationTiming`) and, since 2026-10-11, the person's own
 * "I'd incorporate at $___" under `incorporateAt`. Keeping it here needed no migration; the phase 1
 * storage work may move it to a column of its own (docs/architecture/future-cockpit.md § 7).
 *
 * Every reader goes through `readMapAnswers`, so the number never leaks into the branch picks, and a
 * row written before this change (no key) reads as "no number".
 */
const OWN_NUMBER_KEY = "incorporateAt";

/** The most a person's number may be: the same cap the save route puts on revenue estimates. */
export const INCORPORATE_AT_MAX = 1e9;

/** A whole-dollar amount the person could have typed, or null for anything else. */
export function cleanIncorporateAt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > INCORPORATE_AT_MAX) return null;
  return Math.round(value);
}

/** What is written to the column: the picks, plus the person's number when they gave one. */
export function writeMapAnswers(state: Pick<ScenarioState, "activeBranches" | "incorporateAt">): Record<string, string | number> {
  const own = cleanIncorporateAt(state.incorporateAt);
  return own === null ? { ...state.activeBranches } : { ...state.activeBranches, [OWN_NUMBER_KEY]: own };
}

/** The column read back: the picks alone, and the number (or null). */
export function readMapAnswers(json: Record<string, unknown>): {
  activeBranches: ScenarioState["activeBranches"];
  incorporateAt: number | null;
} {
  const { [OWN_NUMBER_KEY]: own, ...picks } = json;
  return { activeBranches: picks as ScenarioState["activeBranches"], incorporateAt: cleanIncorporateAt(own) };
}
