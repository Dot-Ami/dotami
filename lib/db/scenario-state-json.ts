import type { ScenarioState } from "@/lib/scenarios/types";

/**
 * The `ScenarioState.activeBranches` database column holds an idea's map answers as one JSON object:
 * the branch picks (`gstTiming`, `incorporationTiming`) and, each under its own key, the person's own
 * answers kept with the map. Keeping them here needed no migration; the phase 1 storage work may move
 * them to columns of their own (docs/architecture/future-cockpit.md § 7).
 *
 * - `incorporateAt` (since 2026-10-11): the person's own "I'd incorporate at $___".
 * - `decided` (since 2026-10-12): the forks the person picked a side at, the map's default side
 *   included. Until then the map kept its clicks for the session only, so a pick of the default side
 *   said "Saved" and read as the map's default after a reload.
 * - `equipmentNo` (since 2026-10-12): `true` when the person answered No to buying equipment, a vehicle
 *   or tools. A Yes stays in `Venture.capitalPurchasePlanned`; that column's `false` is also what the
 *   intake writes for a chip nobody touched, so on its own it can't mean "the person said no".
 *
 * Every reader goes through `readMapAnswers`, so none of these leaks into the branch picks, and a row
 * written before a key existed reads as "not given".
 */
const OWN_NUMBER_KEY = "incorporateAt";
const DECIDED_KEY = "decided";
const EQUIPMENT_NO_KEY = "equipmentNo";

/** The most a person's number may be: the same cap the save route puts on revenue estimates. */
export const INCORPORATE_AT_MAX = 1e9;

/** A whole-dollar amount the person could have typed, or null for anything else. */
export function cleanIncorporateAt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > INCORPORATE_AT_MAX) return null;
  return Math.round(value);
}

/**
 * The forks the person decided, kept only when each names a pick in `picks` (so nothing but a fork id
 * the map holds is ever stored or read), each once, in the order given.
 */
export function cleanDecided(value: unknown, picks: Record<string, unknown>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && typeof picks[id] === "string"))];
}

/** What is written to the column: the picks, plus each of the person's own answers they gave. */
export function writeMapAnswers(
  state: Pick<ScenarioState, "activeBranches" | "incorporateAt" | "decidedBranchIds">,
  equipment?: boolean,
): Record<string, string | number | boolean | string[]> {
  const out: Record<string, string | number | boolean | string[]> = { ...state.activeBranches };
  const own = cleanIncorporateAt(state.incorporateAt);
  if (own !== null) out[OWN_NUMBER_KEY] = own;
  const decided = cleanDecided(state.decidedBranchIds, state.activeBranches);
  if (decided.length > 0) out[DECIDED_KEY] = decided;
  if (equipment === false) out[EQUIPMENT_NO_KEY] = true;
  return out;
}

/** The column read back: the picks alone, and the person's own answers (or their "not given"). */
export function readMapAnswers(json: Record<string, unknown>): {
  activeBranches: ScenarioState["activeBranches"];
  incorporateAt: number | null;
  decidedBranchIds: string[];
  equipmentNo: boolean;
} {
  const { [OWN_NUMBER_KEY]: own, [DECIDED_KEY]: decided, [EQUIPMENT_NO_KEY]: equipmentNo, ...picks } = json;
  return {
    activeBranches: picks as ScenarioState["activeBranches"],
    incorporateAt: cleanIncorporateAt(own),
    decidedBranchIds: cleanDecided(decided, picks),
    equipmentNo: equipmentNo === true,
  };
}
