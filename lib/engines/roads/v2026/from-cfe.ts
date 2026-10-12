import type { CFENode } from "../../cfe/v2026/types";
import type { CFETier } from "../../cfe/v2026/tiers";
import type { Province } from "../../shared/types";
import type { DoneWhenLine, Fork, Road, RoadKind, RoadStep } from "./types";
import { newestReadDate } from "./validate";

/**
 * Wraps today's ten-step tax map (the CFE catalog's nodes and tiers) as a road, changing nothing in
 * it: each tier becomes a column (same id, name and line under the name; its branch toggle becomes
 * the column's fork), and each node becomes a step (same id, name, citations; its trigger line is the
 * step's one line, as the card already showed it; its `branches` are where the step leads). A node
 * lands in the column whose tier lists its stage, in catalog order, exactly as the old map placed it.
 *
 * The rules and tax cards each step names come in as `engineHints`, by step id.
 *
 * Two optional inputs carry the road's own content, written from the official pages in the road's
 * file rather than in the tax map's catalog: `doneWhen`, the done-when lines for a step by its id, and
 * `addedSteps`, steps that aren't map stages (road 0's "before you open" steps), each placed in a
 * column after that column's stages. Cost lines, skill items and official links on the map stages
 * start empty; nothing is filled in here that a page didn't say.
 */
export function roadFromCfe(input: {
  id: string;
  label: string;
  kind: RoadKind;
  provinces: Province[];
  nodes: readonly CFENode[];
  tiers: readonly CFETier[];
  forks: Fork[];
  /** The rules and tax cards each step names, by step id (a step left out names none). */
  engineHints?: Readonly<Record<string, readonly string[]>>;
  doneWhen?: Readonly<Record<string, readonly DoneWhenLine[]>>;
  addedSteps?: readonly { columnId: string; step: RoadStep }[];
}): Road {
  const added = input.addedSteps ?? [];
  const road: Road = {
    id: input.id,
    label: input.label,
    kind: input.kind,
    provinces: input.provinces,
    columns: input.tiers.map((tier) => ({
      id: tier.id,
      label: tier.label,
      summary: tier.subtitle,
      steps: [
        ...input.nodes.filter((node) => tier.stages.includes(node.stage)).map((node) => node.id),
        // After the map's own stages, so every card the old map drew keeps its place.
        ...added.filter((a) => a.columnId === tier.id).map((a) => a.step.id),
      ],
      ...(tier.branchDecisionId ? { forkId: tier.branchDecisionId } : {}),
    })),
    steps: [
      ...input.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        summary: node.trigger,
        next: [...node.branches],
        doneWhen: [...(input.doneWhen?.[node.id] ?? [])],
        needs: [],
        costs: [],
        officialLinks: [],
        citations: [...node.citations],
        ...(input.engineHints?.[node.id] ? { engineHints: [...input.engineHints[node.id]!] } : {}),
      })),
      ...added.map((a) => a.step),
    ],
    forks: input.forks,
    lastVerified: "",
  };
  // Worked out, not typed by hand, so it can't fall behind a newer read.
  road.lastVerified = newestReadDate(road) ?? "";
  return road;
}
