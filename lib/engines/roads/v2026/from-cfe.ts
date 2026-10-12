import type { CFENode } from "../../cfe/v2026/types";
import type { CFETier } from "../../cfe/v2026/tiers";
import type { Province } from "../../shared/types";
import type { Fork, Road, RoadKind } from "./types";
import { newestReadDate } from "./validate";

/**
 * Wraps today's ten-step tax map (the CFE catalog's nodes and tiers) as a road, changing nothing in
 * it: each tier becomes a column (same id, name and line under the name; its branch toggle becomes
 * the column's fork), and each node becomes a step (same id, name, citations; its trigger line is the
 * step's one line, as the card already showed it; its `branches` are where the step leads). A node
 * lands in the column whose tier lists its stage, in catalog order, exactly as the old map placed it.
 *
 * Done-when lines, cost lines, skill items and official links start empty: they are written from the
 * official pages in their own pull request, never filled in here.
 */
export function roadFromCfe(input: {
  id: string;
  label: string;
  kind: RoadKind;
  provinces: Province[];
  nodes: readonly CFENode[];
  tiers: readonly CFETier[];
  forks: Fork[];
}): Road {
  const road: Road = {
    id: input.id,
    label: input.label,
    kind: input.kind,
    provinces: input.provinces,
    columns: input.tiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      summary: tier.subtitle,
      steps: input.nodes.filter((node) => tier.stages.includes(node.stage)).map((node) => node.id),
      ...(tier.branchDecisionId ? { forkId: tier.branchDecisionId } : {}),
    })),
    steps: input.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      summary: node.trigger,
      next: [...node.branches],
      doneWhen: [],
      needs: [],
      costs: [],
      officialLinks: [],
      citations: [...node.citations],
    })),
    forks: input.forks,
    lastVerified: "",
  };
  // Worked out, not typed by hand, so it can't fall behind a newer read.
  road.lastVerified = newestReadDate(road) ?? "";
  return road;
}
