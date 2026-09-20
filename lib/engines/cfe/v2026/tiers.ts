import type { CFEStage } from "./types";

/**
 * S2.5.4j — the map's columns, as data (decided 2026-09-16: tier columns of cards; and
 * 2026-09-14: the map holds as many nodes as it needs — the count is not fixed).
 * A tier is a named column that holds lifecycle stages; a node lands in the tier that lists
 * its `stage`. Reordering the map = editing this list. Design record: docs/ui-spec/cockpit/03-canvas.md.
 */
export interface CFETier {
  id: string;
  /** "TIER 2" */
  ordinal: number;
  label: string;
  /** One line under the label — what this column is about, in plain words. */
  subtitle: string;
  stages: readonly CFEStage[];
  /** The branch decision whose toggle lives in this tier's header, if any. Mirrors
   * `BranchDecisionId` in lib/scenarios/branches.ts — spelled out here so the engine keeps
   * zero imports from the app layer. */
  branchDecisionId?: "gstTiming" | "incorporationTiming";
}

export const cfeTiersV2026: readonly CFETier[] = [
  {
    id: "tier-1-before",
    ordinal: 1,
    label: "Before the venture",
    subtitle: "Employment or apprenticeship income; nothing commercial yet.",
    stages: ["stage-0"],
  },
  {
    id: "tier-2-sole-prop",
    ordinal: 2,
    label: "Sole proprietor",
    subtitle: "First revenue, the GST/HST line, the first write-offs.",
    stages: ["stage-1", "stage-2a", "stage-2b"],
    branchDecisionId: "gstTiming",
  },
  {
    id: "tier-3-incorporating",
    ordinal: 3,
    label: "Incorporating",
    subtitle: "When and why to become a corporation; hiring; product vs. service.",
    stages: ["stage-3a", "stage-3b", "branch"],
    branchDecisionId: "incorporationTiming",
  },
  {
    id: "tier-4-corporation",
    ordinal: 4,
    label: "Corporation running",
    subtitle: "Retained earnings, SR&ED deepening, the next rungs on the ladder.",
    stages: ["stage-4"],
  },
];

/** The tier a stage belongs to, or undefined when no tier lists it (the integrity test forbids that). */
export function tierForStage(stage: CFEStage): CFETier | undefined {
  return cfeTiersV2026.find((tier) => tier.stages.includes(stage));
}
