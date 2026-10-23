import type { CFENode, CFENodeId, CFEStage } from "@/lib/engines/cfe/v2026";
import { citationsForPlace, type Road } from "@/lib/engines/roads/v2026";
import { checkFields } from "@/lib/engines/shared/citation-check";
import type { EngineCitation } from "@/lib/engines/shared/types";
import { branchDecisions } from "@/lib/scenarios/branches";
import { isBranchDecided } from "@/lib/scenarios/graph";
import type { Scenario } from "@/lib/scenarios/types";

import type {
  PlaybookCitationRef,
  PlaybookDecisionSummary,
  PlaybookNodeSlice,
  PlaybookSection,
  PlaybookSkeleton,
} from "./types";

const STAGE_ORDER: CFEStage[] = [
  "stage-0",
  "stage-1",
  "stage-2a",
  "stage-2b",
  "stage-3a",
  "stage-3b",
  "branch",
];

const MAX_PROJECTION_NOTES_PER_NODE = 12;

const PLAYBOOK_DISCLAIMER =
  "DotAmi maps conditional unlock surfaces from catalog data — a compass, not GPS. " +
  "Binding filings, elections, and legal outcomes depend on facts, statutes, and qualified professionals.";

function stageHeading(stage: CFEStage): string {
  switch (stage) {
    case "stage-0":
      return "Stage 0 — Baseline";
    case "stage-1":
      return "Stage 1 — Sole prop activation";
    case "stage-2a":
      return "Stage 2a — Voluntary GST path";
    case "stage-2b":
      return "Stage 2b — Mandatory GST path";
    case "stage-3a":
      return "Stage 3a — Incorporating";
    case "stage-3b":
      return "Stage 3b — Incorporation (liability / SR&ED)";
    case "branch":
      return "Branch points";
    default:
      return stage;
  }
}

function stageRank(stage: CFEStage): number {
  const index = STAGE_ORDER.indexOf(stage);

  return index === -1 ? 99 : index;
}

function collectVisibleNodeIds(scenario: Scenario): CFENodeId[] {
  const ghostSet = new Set(scenario.state.ghostedNodeIds);
  const merged = [
    ...scenario.state.activeNodeIds,
    ...scenario.state.decisionNodeIds,
    ...scenario.state.completedNodeIds,
  ];

  const out: CFENodeId[] = [];

  for (const id of merged) {
    if (ghostSet.has(id)) {
      continue;
    }

    if (!out.includes(id)) {
      out.push(id);
    }
  }

  return out;
}

/** The nodes' sources, each page once, in the order the nodes cite them. */
function mergeCitations(nodes: readonly CFENode[]): EngineCitation[] {
  const byUrl = new Map<string, EngineCitation>();

  for (const node of nodes) {
    for (const c of node.citations) {
      if (!byUrl.has(c.url)) byUrl.set(c.url, c);
    }
  }

  return [...byUrl.values()];
}

function citationRef(c: EngineCitation): PlaybookCitationRef {
  return {
    title: c.title,
    authority: c.authority,
    jurisdiction: c.jurisdiction,
    url: c.url,
    // How it was checked travels with it: a read (and who did it, when recorded), a tool check, or both.
    ...checkFields(c),
    note: c.note,
  };
}

function nodeToSlice(node: CFENode): PlaybookNodeSlice {
  return {
    nodeId: node.id,
    label: node.label,
    trigger: node.trigger,
    description: node.description,
    taxImpact: node.taxImpact,
    lensTax: node.lensAnnotations.tax,
    lensLegal: node.lensAnnotations.legal,
    financialSummary: node.financialImpact.summary,
    projectionNotes: node.financialImpact.projectionNotes.slice(0, MAX_PROJECTION_NOTES_PER_NODE),
  };
}

function buildSectionForStage(stage: CFEStage, nodes: CFENode[], road: Pick<Road, "provinces"> | null, place: string): PlaybookSection {
  nodes.sort((a, b) => a.label.localeCompare(b.label));

  // On a road written for all of Canada, the federal pages and the idea's own province's, as the step panel
  // and the plan draw them (`citationsForPlace`, task 28d), with a count of the rest; otherwise every source.
  const merged = mergeCitations(nodes);
  const { shown, leftOut } = road ? citationsForPlace(road, merged, place) : { shown: merged, leftOut: 0 };

  return {
    stageKey: stage,
    heading: stageHeading(stage),
    nodes: nodes.map(nodeToSlice),
    citations: shown.map(citationRef),
    ...(leftOut > 0 ? { sourcesLeftOut: leftOut } : {}),
  };
}

/**
 * The export's skeleton for a scenario. `road` is the road the cockpit draws: on one written for all of Canada
 * the sources are drawn for the idea's own province, as everywhere else on screen; left out (or on any other
 * road), every source the map's stages cite.
 */
export function buildPlaybookSkeleton(cfeNodes: CFENode[], scenario: Scenario, road?: Pick<Road, "provinces">): PlaybookSkeleton {
  const nodeById = new Map(cfeNodes.map((n) => [n.id, n]));
  const visibleIds = collectVisibleNodeIds(scenario);

  const decisions: PlaybookDecisionSummary[] = branchDecisions.map((decision) => {
    const selectedNodeId = scenario.state.activeBranches[decision.id];
    const option = decision.options.find((o) => o.id === selectedNodeId);

    return {
      decisionId: decision.id,
      label: decision.label,
      selectedNodeId,
      selectedLabel: option?.label ?? selectedNodeId,
      // The same test the map's chips use, so the export never calls an untouched default a pick.
      decided: isBranchDecided(decision.id, scenario.state),
    };
  });

  const byStage = new Map<CFEStage, CFENode[]>();

  for (const id of visibleIds) {
    const node = nodeById.get(id);

    if (!node) {
      continue;
    }

    const stage = node.stage as CFEStage;
    const bucket = byStage.get(stage) ?? [];

    bucket.push(node);
    byStage.set(stage, bucket);
  }

  const sections: PlaybookSection[] = [...byStage.entries()]
    .sort(([a], [b]) => stageRank(a) - stageRank(b))
    .map(([stage, nodes]) => buildSectionForStage(stage, nodes, road ?? null, scenario.profile.province));

  return {
    scenarioId: scenario.id,
    profile: scenario.profile,
    decisions,
    sections,
    disclaimer: PLAYBOOK_DISCLAIMER,
  };
}
