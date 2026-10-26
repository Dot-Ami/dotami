import type { CitationCheck } from "@/lib/engines/shared/types";
import type { VentureProfile } from "@/lib/scenarios/types";

/** A source in the export, with how it was checked (docs/engines/citations.md). */
export type PlaybookCitationRef = {
  title: string;
  authority: string;
  jurisdiction: string;
  url: string;
  note: string;
} & CitationCheck;

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
  /**
   * How many of the section's sources were for other provinces and left out (as the step panel and the plan
   * leave them out: task 28d on the federal road, every road since a-call-12, 2026-10-23); absent when none was.
   */
  sourcesLeftOut?: number;
}

export interface PlaybookDecisionSummary {
  decisionId: string;
  label: string;
  selectedNodeId: string;
  selectedLabel: string;
  /** False while the selection is still the untouched default (`isBranchDecided`), so the export says so. */
  decided: boolean;
}

export interface PlaybookSkeleton {
  scenarioId: string;
  profile: VentureProfile;
  decisions: PlaybookDecisionSummary[];
  sections: PlaybookSection[];
  disclaimer: string;
}
