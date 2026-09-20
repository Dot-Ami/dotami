import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import type { UnlockItem } from "./types";

/**
 * S2.5.4e — which engine entries belong on which lifecycle node.
 *
 * Two independent questions, answered by two different things:
 *   1. "Is this entry RELEVANT to this stage?"  → the hint map below (catalog-adjacent config,
 *      moved here from lib/archetypes/annotations.ts).
 *   2. "Does this entry APPLY to this person?"  → the evaluator (`evaluateProfile`), which
 *      already filters by province, structure, tags and date.
 * The node detail shows the intersection under "For you", and everything else the evaluator
 * returned under a collapsed "Elsewhere on your map". Nothing comes from an archetype any more:
 * the old path merged `archetype.grantIds` into every node, which is how an Alberta venture
 * was shown BC Innovate and BC PST.
 */
export const NODE_ENGINE_HINTS: Partial<Record<CFENodeId, string[]>> = {
  "stage-1-sole-prop-activation": [
    "writeoff-home-office",
    "writeoff-saas-tools",
    "compliance-hobby-vs-business",
  ],
  "stage-2a-voluntary-gst-registration": [
    "grant-sred",
    "writeoff-cca-class-50",
    "compliance-gst-small-supplier",
  ],
  "stage-2b-mandatory-gst-registration": ["grant-cajg", "compliance-gst-small-supplier"],
  "stage-3a-incorporation-80k-net": ["grant-on-innovation"],
  "stage-3b-incorporation-liability-sred": ["grant-sred", "grant-irap", "writeoff-rd", "writeoff-cca-class-50"],
  "stage-4-sred-deepening": ["grant-sred", "grant-irap"],
  "stage-4-retained-earnings-planning": ["grant-on-innovation"],
  "branch-hire-first-employee": ["writeoff-vehicle"],
};

export interface NodeItems {
  /** Applies to this person AND is relevant to this stage. */
  forThisStage: UnlockItem[];
  /** Applies to this person, surfaced on another stage (or on none). */
  elsewhere: UnlockItem[];
}

/** Pure: splits the evaluator's non-gray output by relevance to one node. */
export function itemsForNode(unlocks: UnlockItem[], nodeId: CFENodeId): NodeItems {
  const relevant = new Set(NODE_ENGINE_HINTS[nodeId] ?? []);
  const applicable = unlocks.filter((u) => u.state !== "gray" && u.engine !== "goal");
  return {
    forThisStage: applicable.filter((u) => relevant.has(u.id)),
    elsewhere: applicable.filter((u) => !relevant.has(u.id)),
  };
}
