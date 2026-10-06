import type { EngineCitation, LensAnnotations, Province } from "@/lib/engines/shared/types";

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
  /** Display string (e.g. "$30,000 rolling four-quarter"). */
  threshold?: string;
  /** Typed threshold amount in CAD for the rules engine's watch logic. */
  thresholdAmount?: number;
  /**
   * [8a] How confirmed revenue figures are tested against `thresholdAmount`: totals per calendar
   * quarter — over it in a single quarter, or over it across `consecutiveQuarters` quarters.
   * Typed here so the rules engine never hard-codes a tax rule (lib/brain/records.ts).
   */
  thresholdTest?: { singleQuarter: boolean; consecutiveQuarters: number };
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  provinces: Province[];
  industryTags?: string[];
}
