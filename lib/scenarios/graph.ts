import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { branchDecisions, defaultActiveBranches, type BranchDecisionId } from "./branches";
import type { Scenario, ScenarioNodeStatus, ScenarioState } from "./types";

/**
 * Where a lifecycle node sits on THIS venture's path, from its branch picks. S2.5.4j: the
 * React Flow graph builder that lived here is gone with the graph — the map is tier columns
 * (`components/cockpit/strategy-map.tsx`, `lib/engines/cfe/v2026/tiers.ts`).
 */
export function getScenarioNodeStatus(nodeId: CFENodeId, scenario: Scenario): ScenarioNodeStatus {
  if (scenario.state.ghostedNodeIds.includes(nodeId)) {
    return "ghost";
  }

  if (scenario.state.decisionNodeIds.includes(nodeId)) {
    return "decision";
  }

  if (scenario.state.activeNodeIds.includes(nodeId)) {
    return "active";
  }

  if (scenario.state.completedNodeIds.includes(nodeId)) {
    return "complete";
  }

  return "upcoming";
}

/**
 * Whether the person made this branch decision. True once they clicked it this session, or when its
 * pick isn't the default: the database keeps the picks but not the clicks, and only a click can move
 * a pick off the default, so a reloaded idea keeps "your pick" on what the person chose.
 */
export function isBranchDecided(decisionId: BranchDecisionId, state: ScenarioState): boolean {
  if (state.decidedBranchIds?.includes(decisionId)) return true;
  return state.activeBranches[decisionId] !== defaultActiveBranches[decisionId];
}

/** What a stage card's chip says. Words for each are in the map component. */
export type StageChipKind = "now" | "your-pick" | "default" | "open-choice" | "done" | "ahead" | "not-on-your-path";

/**
 * The chip on a stage card (issue #5, 2026-10-11): "your pick" only for something the person picked.
 * Until then every "decision" stage said "your pick", including a toggle's untouched default (its own
 * toggle said "default, not your pick yet") and the fork drawn on every map.
 */
export function stageChipFor(nodeId: CFENodeId, scenario: Scenario): StageChipKind {
  const status = getScenarioNodeStatus(nodeId, scenario);
  if (status === "active") return "now";
  if (status === "complete") return "done";
  if (status === "upcoming") return "ahead";
  if (status === "ghost") return "not-on-your-path";
  // A decision stage: one side of a toggle, the hire-first branch, or the fork on every map.
  const toggle = branchDecisions.find((d) => d.options.some((o) => o.id === nodeId));
  if (toggle) return isBranchDecided(toggle.id, scenario.state) ? "your-pick" : "default";
  // Hire-first is on the map only when the person turned on "Show a hire-first path".
  if (nodeId === "branch-hire-first-employee") return "your-pick";
  return "open-choice";
}
