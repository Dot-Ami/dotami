import { branchDecisions, defaultActiveBranches, type BranchDecisionId } from "./branches";
import type { Scenario, ScenarioNodeStatus, ScenarioState } from "./types";

/**
 * Where a step sits on THIS venture's path, from its branch picks. The React Flow graph builder
 * that lived here went with the graph on 2026-09-16; the map is columns of a road
 * (`components/cockpit/strategy-map.tsx`, `lib/engines/roads/v2026/`).
 *
 * Takes any road's step id (2026-10-11). The picks only name today's tax-map steps, so a step from
 * another road reads "upcoming" here until road evaluation gives it its own state.
 */
export function getScenarioNodeStatus(nodeId: string, scenario: Scenario): ScenarioNodeStatus {
  // The same lists, read as plain strings so any road's step id can be looked up in them.
  const state: {
    ghostedNodeIds: readonly string[];
    decisionNodeIds: readonly string[];
    activeNodeIds: readonly string[];
    completedNodeIds: readonly string[];
  } = scenario.state;

  if (state.ghostedNodeIds.includes(nodeId)) {
    return "ghost";
  }

  if (state.decisionNodeIds.includes(nodeId)) {
    return "decision";
  }

  if (state.activeNodeIds.includes(nodeId)) {
    return "active";
  }

  if (state.completedNodeIds.includes(nodeId)) {
    return "complete";
  }

  return "upcoming";
}

/**
 * Whether the person made this branch decision. True once they clicked it this session, or when its
 * saved pick isn't the default: the database keeps the picks but not the clicks, so a saved pick off
 * the default counts as decided and a reloaded idea keeps "your pick" on it. A saved pick comes from
 * the person's click, or from a program that saved the idea through DotAmi's own save route.
 */
export function isBranchDecided(decisionId: BranchDecisionId, state: ScenarioState): boolean {
  if (state.decidedBranchIds?.includes(decisionId)) return true;
  return state.activeBranches[decisionId] !== defaultActiveBranches[decisionId];
}

/** What a stage card's chip says. Words for each are in the map component. */
export type StageChipKind =
  | "first-stage"
  | "your-pick"
  | "default"
  | "open-choice"
  | "starting-point"
  | "ahead"
  | "not-on-your-path";

/**
 * The chip on a stage card (issue #5, 2026-10-11): "your pick" only for something the person picked.
 * Takes any road's step id; a step from another road is "ahead" here, like `getScenarioNodeStatus`.
 * Until then every "decision" stage said "your pick", including a toggle's untouched default (its own
 * toggle said "default, not your pick yet") and the fork drawn on every map.
 *
 * Every chip here is where the stage sits on the map, never the person's status (2026-10-23, the
 * pre-release review): the map's lists put the employee baseline first and sole-prop activation next for
 * every idea, worked out from nothing the person said, so they read "starting point" and "first stage",
 * not "done" and "now". Only the person's own mark (the cockpit's Doing, Done, Not for me) says where
 * they are, and the map draws that chip itself (components/cockpit/strategy-map.tsx `STATUS_CHIP`).
 */
export function stageChipFor(nodeId: string, scenario: Scenario): StageChipKind {
  const status = getScenarioNodeStatus(nodeId, scenario);
  if (status === "active") return "first-stage";
  if (status === "complete") return "starting-point";
  if (status === "upcoming") return "ahead";
  if (status === "ghost") return "not-on-your-path";
  // A decision stage: one side of a toggle, the hire-first branch, or the fork on every map.
  const toggle = branchDecisions.find((d) => d.options.some((o) => o.id === nodeId));
  if (toggle) return isBranchDecided(toggle.id, scenario.state) ? "your-pick" : "default";
  // Hire-first is on the map only when the person turned on "Show a hire-first path".
  if (nodeId === "branch-hire-first-employee") return "your-pick";
  return "open-choice";
}
