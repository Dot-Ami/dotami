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
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  provinces: Province[];
  industryTags?: string[];
}
