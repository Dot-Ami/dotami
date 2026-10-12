import type { EngineCitation, LensAnnotations, OfficialWords, Province } from "@/lib/engines/shared/types";

export type ComplianceRuleType =
  | "gst-threshold"
  | "pst-hst"
  | "licensing"
  | "hobby-vs-business";

export interface ComplianceRule {
  id: string;
  label: string;
  ruleType: ComplianceRuleType;
  description: string;
  /** Display string, in the official page's own terms (no shorthand like "$30K"). */
  threshold?: string;
  /** Typed threshold amount in CAD, the one the cited page sets. Nothing lights before it is passed. */
  thresholdAmount?: number;
  /**
   * [8a] How confirmed revenue figures are tested against `thresholdAmount`: totals per calendar
   * quarter — over it in a single quarter, or over it across `consecutiveQuarters` quarters.
   * Typed here so the rules engine never hard-codes a tax rule (lib/brain/records.ts).
   */
  thresholdTest?: { singleQuarter: boolean; consecutiveQuarters: number };
  /** The official test in its own words, quoted on the card (2026-10-11). */
  officialWords?: OfficialWords;
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  provinces: Province[];
  industryTags?: string[];
}
