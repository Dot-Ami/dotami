import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import type { Scenario, ScenarioState } from "./types";

export type BranchDecisionId = "gstTiming" | "incorporationTiming";

export interface BranchOption {
  id: CFENodeId;
  label: string;
}

export interface BranchDecision {
  id: BranchDecisionId;
  label: string;
  options: [BranchOption, BranchOption];
}

export const branchDecisions = [
  {
    id: "gstTiming",
    label: "GST timing",
    options: [
      {
        id: "stage-2a-voluntary-gst-registration",
        label: "Voluntary now",
      },
      {
        id: "stage-2b-mandatory-gst-registration",
        label: "Wait for $30K",
      },
    ],
  },
  {
    id: "incorporationTiming",
    label: "Incorporation timing",
    options: [
      {
        id: "stage-3a-incorporation-80k-net",
        label: "$80K net",
      },
      {
        id: "stage-3b-incorporation-liability-sred",
        label: "Liability / SR&ED",
      },
    ],
  },
] satisfies BranchDecision[];

/**
 * S2.5.4h: the one default branch bundle, now that archetypes are gone. Both picks are the
 * "nothing decided yet" reading — wait for the $30K line, incorporate on the $80K-net trigger —
 * and mirror the evaluator's own defaults (`evaluateProfile`). The rail labels them "default,
 * not your pick yet" until the person clicks.
 */
export const defaultActiveBranches: ScenarioState["activeBranches"] = {
  gstTiming: "stage-2b-mandatory-gst-registration",
  incorporationTiming: "stage-3a-incorporation-80k-net",
};

const alwaysCompletedNodeIds = ["stage-0-employee-apprentice-baseline"] satisfies CFENodeId[];
const alwaysActiveNodeIds = ["stage-1-sole-prop-activation"] satisfies CFENodeId[];
const hireFirstBranchId = "branch-hire-first-employee" satisfies CFENodeId;

export function recomputeScenarioState(
  activeBranches: ScenarioState["activeBranches"],
  hireFirst = false,
): ScenarioState {
  const decisionForkIds = hireFirst
    ? (["branch-service-vs-productize", hireFirstBranchId] as const)
    : (["branch-service-vs-productize"] as const);
  const hireBranchGhosted = hireFirst ? [] : [hireFirstBranchId];

  const selectedBranchIds = branchDecisions.map((decision) => activeBranches[decision.id]);
  const inactiveBranchIds = branchDecisions.flatMap((decision) =>
    decision.options
      .map((option) => option.id)
      .filter((optionId) => optionId !== activeBranches[decision.id]),
  );

  return {
    completedNodeIds: [...alwaysCompletedNodeIds],
    activeNodeIds: [
      ...alwaysActiveNodeIds,
      ...selectedBranchIds,
      ...decisionForkIds,
    ],
    decisionNodeIds: [...selectedBranchIds, ...decisionForkIds],
    ghostedNodeIds: [...inactiveBranchIds, ...hireBranchGhosted],
    activeBranches,
  };
}

export function updateScenarioBranch(
  scenario: Scenario,
  decisionId: BranchDecisionId,
  optionId: CFENodeId,
): Scenario {
  const decided = new Set(scenario.state.decidedBranchIds ?? []);
  decided.add(decisionId);
  return {
    ...scenario,
    state: {
      ...recomputeScenarioState(
        {
          ...scenario.state.activeBranches,
          [decisionId]: optionId,
        },
        scenario.profile.hireFirst,
      ),
      decidedBranchIds: [...decided],
    },
  };
}
