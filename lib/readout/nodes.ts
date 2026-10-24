import type { EvaluationResult } from "@/lib/brain/types";
import { NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import type { StepProgressView } from "@/lib/futures/step-progress";
import type { StepStatus } from "@/lib/futures/types";
import { stageChipFor } from "@/lib/scenarios/graph";
import type { Scenario, ScenarioState } from "@/lib/scenarios/types";

/**
 * The stages and the idea as the readout API gives them (app/api/readout/route.ts), kept apart from the
 * route so a test can read the shape without a database.
 *
 * Since 2026-10-24 (the PR #210 review, the maintainer's decision 3) the readout states no status the person
 * didn't give. Until then each stage carried the map's list name as `status`, which said `complete` of the
 * employee baseline and `active` of Sole Prop activation on every idea, worked out from the branch picks alone,
 * and `scenario.state` held the same two lists; an agent read them as what the person had done.
 */

/** The person's own marks (doing, done, not for me) by step id. A step whose status was taken back has none. */
export function stepMarks(progress: readonly StepProgressView[]): Map<string, StepStatus> {
  return new Map(progress.flatMap((p) => (p.status ? [[p.stepId, p.status] as const] : [])));
}

/**
 * Each of today's map stages for the readout. `chip` is where the stage sits on the map, from the branch
 * picks ("starting-point", "first-stage", "your-pick", "default", "open-choice", "ahead", "not-on-your-path";
 * "done" and "now" until 2026-10-23), never the person's status. `yourStatus` is the person's own mark, the
 * one the map draws in place of the chip, or null where they gave none.
 *
 * The marks come from the idea's own road, and road 0's step ids are these stages' ids. An idea on another
 * road has marks on that road's steps only, so every stage here reads null: the readout draws today's tax map
 * for every idea until it reads road evaluation (docs/task-list.md, under #41).
 */
export function readoutNodes(scenario: Scenario, evaluation: EvaluationResult, marks: ReadonlyMap<string, StepStatus>) {
  return cfeCatalogV2026.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    stage: node.stage,
    chip: stageChipFor(node.id, scenario),
    yourStatus: marks.get(node.id) ?? null,
    evaluatorColour: evaluation.nodeStates[node.id],
    // Which of the person's answers set that colour, in the rules' own sentence (2026-10-11).
    evaluatorReason: evaluation.nodeReasons[node.id] ?? null,
    trigger: node.trigger,
    relevantEntryIds: NODE_ENGINE_HINTS[node.id] ?? [],
  }));
}

/**
 * The idea for the readout, without the map's two worked-out lists, `completedNodeIds` (the employee
 * baseline, on every idea) and `activeNodeIds` (Sole Prop activation and the picks): they name no status of
 * the person's. The picks themselves stay, in `activeBranches`, `decidedBranchIds` and `decisionNodeIds`.
 * The idea passed in is left as it is.
 */
export function readoutScenario(scenario: Scenario): Omit<Scenario, "state"> & {
  state: Omit<ScenarioState, "completedNodeIds" | "activeNodeIds">;
} {
  const { completedNodeIds: _startingPoint, activeNodeIds: _firstStage, ...state } = scenario.state;
  return { ...scenario, state };
}
