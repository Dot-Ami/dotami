import type { Scenario, ScenarioNodeStatus } from "./types";

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
