import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import type { Scenario, ScenarioNodeStatus } from "./types";

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
