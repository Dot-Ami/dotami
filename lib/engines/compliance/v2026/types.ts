import type { EngineCitation, LensAnnotations, OfficialWords, Province } from "@/lib/engines/shared/types";

export type ComplianceRuleType =
  | "gst-threshold"
  | "pst-hst"
  | "licensing"
  | "hobby-vs-business"
  // 2026-10-11: a platform's own duty to report its sellers to the CRA. Approved by the maintainer on
  // 2026-10-12 (docs/engines/compliance.md, authoring rule 1); nothing reads rule types yet.
  | "platform-reporting";

/**
 * Work for which a threshold rule's "not yet" doesn't hold (2026-10-11: ride-share and taxi driving,
 * where the CRA says the $30,000 small-supplier line doesn't apply). Typed, so the rules engine reads
 * which rule is set aside and what to say from the catalog instead of knowing about drivers itself.
 */
export interface ThresholdSetAside {
  /** The threshold rule whose "not yet" doesn't hold for this work. */
  ruleId: string;
  /** One sentence for that rule's card and the map's mandatory GST/HST stage: why its line doesn't decide. */
  why: string;
  /** One sentence on what that rule's line still decides for this person, for its card and the voluntary stage. */
  stillDecides: string;
}

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
  /**
   * The card's reason names the activity tag that lit it ("Shown because your intake has the activity
   * tag …") instead of only the province. Set on the ride-share and taxi cards (2026-10-11), whose
   * province says nothing about why they show; the older cards for a kind of work keep naming the
   * province until the maintainer decides whether they should change too.
   */
  reasonNamesTags?: true;
  /** Present when this rule, wherever it applies, takes away another rule's threshold "not yet". */
  setsAsideThreshold?: ThresholdSetAside;
}

/**
 * A rule taken off the catalog: the page it cited, the day that page was opened, and why it came off. The same shape
 * as the grants catalog's retired programs (#207). No `readBy` here: it says nothing about who read the page, and only
 * lib/engines/shared/citation-check.ts reads a citation's record of that.
 */
export interface RetiredComplianceRule {
  id: string;
  label: string;
  /** The page the rule cited, as it cited it. */
  url: string;
  /** The day the maintainer's reading list's tool opened that page to see what it says now. */
  readOn: string;
  why: string;
}
