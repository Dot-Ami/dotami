import type { CitationCheck, OfficialWords } from "@/lib/engines/shared/types";

export type CFEStage =
  | "stage-0"
  | "stage-1"
  | "stage-2a"
  | "stage-2b"
  | "stage-3a"
  | "stage-3b"
  | "stage-4"
  | "branch";

export type CFECitationAuthority = "CRA" | "federal" | "provincial";

export type CFEProvince = "AB" | "BC" | "ON" | "CA";

/** A map stage's source. Read (by a person, an AI model, or a reader nobody recorded), checked by a tool, or both: docs/engines/citations.md. */
export type CFECitation = {
  title: string;
  authority: CFECitationAuthority;
  jurisdiction: CFEProvince;
  url: string;
  note: string;
} & CitationCheck;

export interface CFELensAnnotations {
  tax: string;
  legal: string;
}

export interface CFEFinancialImpact {
  summary: string;
  projectionNotes: string[];
  estimates: Array<{
    label: string;
    value: string;
    basis: string;
  }>;
}

export interface CFENode {
  id: string;
  label: string;
  stage: CFEStage;
  trigger: string;
  description: string;
  taxImpact: string;
  lensAnnotations: CFELensAnnotations;
  citations: CFECitation[];
  financialImpact: CFEFinancialImpact;
  branches: string[];
  /** An official test in its own words, shown on the stage's detail (2026-10-11). Its page is one of `citations`. */
  officialWords?: OfficialWords;
  /**
   * A number only the person can give, asked on this stage's detail and kept as theirs (2026-10-11:
   * "I'd incorporate at $___" on Incorporating). DotAmi never fills it in and has no number of its own.
   */
  asksOwnNumber?: CFEOwnNumber;
}

export interface CFEOwnNumber {
  /** Forever: the answer it is kept under (`ScenarioState.incorporateAt`). */
  id: "incorporateAt";
  /** The input's label, in the person's voice. */
  label: string;
  /** One line under it: what the number does, and that it is theirs. */
  help: string;
}

/**
 * One cost on one way of taking a step, read from that way's own official page (2026-10-11, the
 * federal and Alberta incorporation routes). Three kinds only, none of them DotAmi's estimate:
 * - "official-fee": an amount the page states, written inside `quotes`.
 * - "named-blank": the page names the cost but no amount was read; the person prices it.
 * - "not-needed": the page says this item isn't needed on this route.
 */
export interface CFERouteLine {
  /** Forever. */
  id: string;
  label: string;
  kind: "official-fee" | "named-blank" | "not-needed";
  /**
   * Only on an "official-fee" line: the fee in the official fees catalog (lib/engines/fees/v2026/, since
   * 2026-10-12). `routeFeeLine` copies its amount, how often, quotes and source from there.
   */
  feeId?: string;
  /** Whole Canadian dollars; only on an "official-fee" line, copied from its catalog fee. */
  amountCad?: number;
  /** How often it is paid, when the page says. */
  per?: "once" | "year";
  /** The page's own words this line rests on, each copied exactly. */
  quotes: string[];
  citation: CFECitation;
}

/** One way of taking a stage, shown beside the others; DotAmi never picks between them. */
export interface CFERoute {
  /** Forever. */
  id: string;
  /** The stage it is a way of taking. */
  nodeId: string;
  /** "CA" for the federal route, or the province whose law it is. */
  jurisdiction: CFEProvince;
  label: string;
  /** One line on what this route is, in plain words. */
  summary: string;
  /** Why the blanks on this route are blank, when one reason covers them all. */
  blanksNote?: string;
  lines: CFERouteLine[];
}
