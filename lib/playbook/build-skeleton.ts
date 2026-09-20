import type { CFENode, CFENodeId, CFEStage } from "@/lib/engines/cfe/v2026";
import { branchDecisions } from "@/lib/scenarios/branches";
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
      return "Stage 3a — Incorporation at net threshold";
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

function mergeCitations(existing: PlaybookCitationRef[], node: CFENode): PlaybookCitationRef[] {
  const byUrl = new Map(existing.map((c) => [c.url, c]));

  for (const c of node.citations) {
    if (!byUrl.has(c.url)) {
      byUrl.set(c.url, {
        title: c.title,
        authority: c.authority,
        jurisdiction: c.jurisdiction,
        url: c.url,
        lastVerified: c.lastVerified,
        note: c.note,
      });
    }
  }

  return [...byUrl.values()];
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

function buildSectionForStage(stage: CFEStage, nodes: CFENode[]): PlaybookSection {
  let citations: PlaybookCitationRef[] = [];

  nodes.sort((a, b) => a.label.localeCompare(b.label));

  for (const node of nodes) {
    citations = mergeCitations(citations, node);
  }

  return {
    stageKey: stage,
    heading: stageHeading(stage),
    nodes: nodes.map(nodeToSlice),
    citations,
  };
}

export function buildPlaybookSkeleton(cfeNodes: CFENode[], scenario: Scenario): PlaybookSkeleton {
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
    .map(([stage, nodes]) => buildSectionForStage(stage, nodes));

  return {
    scenarioId: scenario.id,
    profile: scenario.profile,
    decisions,
    sections,
    disclaimer: PLAYBOOK_DISCLAIMER,
  };
}
