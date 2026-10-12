import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { generalRoadV2026, type RoadStep } from "@/lib/engines/roads/v2026";
import type { UnlockItem } from "./types";

/**
 * S2.5.4e — which engine entries belong on which lifecycle node.
 *
 * Two independent questions, answered by two different things:
 *   1. "Is this entry RELEVANT to this stage?"  → the step's own `engineHints` in its road's catalog
 *      file (2026-10-12: moved there from this file, so any road names its own cards; road 0's are the
 *      list this file used to hold, unchanged).
 *   2. "Does this entry APPLY to this person?"  → the evaluator (`evaluateProfile`), which
 *      already filters by province, structure, tags and date.
 * The node detail shows the intersection under "For you", and everything else the evaluator
 * returned under a collapsed "Elsewhere on your map". Nothing comes from an archetype any more:
 * the old path merged `archetype.grantIds` into every node, which is how an Alberta venture
 * was shown BC Innovate and BC PST.
 */
/**
 * Road 0's cards by step id, read from the road (its steps' `engineHints`). Kept under its old name for
 * the readout API and the catalog checks, which list today's map step by step.
 */
export const NODE_ENGINE_HINTS: Partial<Record<CFENodeId, string[]>> = Object.fromEntries(
  generalRoadV2026.steps.flatMap((step) => (step.engineHints && step.engineHints.length > 0 ? [[step.id, [...step.engineHints]]] : [])),
);

export interface NodeItems {
  /** Applies to this person AND is relevant to this stage. */
  forThisStage: UnlockItem[];
  /** Applies to this person, surfaced on another stage (or on none). */
  elsewhere: UnlockItem[];
}

/**
 * Pure: splits the evaluator's non-gray output by relevance to one road step, from the cards the step
 * names. A step that names none has nothing "for this stage" and everything "elsewhere".
 */
export function itemsForStep(unlocks: UnlockItem[], step: Pick<RoadStep, "engineHints">): NodeItems {
  const relevant = new Set(step.engineHints ?? []);
  const applicable = unlocks.filter((u) => u.state !== "gray" && u.engine !== "goal");
  return {
    forThisStage: applicable.filter((u) => relevant.has(u.id)),
    elsewhere: applicable.filter((u) => !relevant.has(u.id)),
  };
}

/** The same, by a road 0 step's id (today's map, its tests and the readout). An id road 0 doesn't have names no cards. */
export function itemsForNode(unlocks: UnlockItem[], nodeId: string): NodeItems {
  return itemsForStep(unlocks, generalRoadV2026.steps.find((step) => step.id === nodeId) ?? {});
}
