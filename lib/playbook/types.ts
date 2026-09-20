import type { VentureProfile } from "@/lib/scenarios/types";

export interface PlaybookCitationRef {
  title: string;
  authority: string;
  jurisdiction: string;
  url: string;
  lastVerified: string;
  note: string;
}

export interface PlaybookNodeSlice {
  nodeId: string;
  label: string;
  trigger: string;
  description: string;
  taxImpact: string;
  lensTax: string;
  lensLegal: string;
  financialSummary: string;
  projectionNotes: string[];
}

export interface PlaybookSection {
  /** Matches `CFENode.stage`. */
  stageKey: string;
  heading: string;
  nodes: PlaybookNodeSlice[];
  citations: PlaybookCitationRef[];
}

export interface PlaybookDecisionSummary {
  decisionId: string;
  label: string;
  selectedNodeId: string;
  selectedLabel: string;
}

export interface PlaybookSkeleton {
  scenarioId: string;
  profile: VentureProfile;
  decisions: PlaybookDecisionSummary[];
  sections: PlaybookSection[];
  disclaimer: string;
}
