import type { EngineCitation, LensAnnotations, Province } from "@/lib/engines/shared/types";
import type { StructureEntityType } from "@/lib/engines/structure/v2026/types";

/** Program kind — not everything users call a "grant" is one. Financing entries are loans/guarantees, never free money. */
export type GrantProgramKind = "grant" | "tax-credit" | "financing";

/** Structure-gated rate split (e.g. SR&ED sole-prop vs CCPC). Rules engine surfaces the delta as a fork. */
export interface StructureRate {
  structure: StructureEntityType;
  /** Rate as a fraction (0.35 = 35%). */
  rate: number;
  /**
   * Whether the credit at this rate is refunded, set only where a quote the program's citations hold (or a recorded
   * read of the page) says so for this structure. Left out, the card says neither (2026-10-24: a sole proprietor's
   * SR&ED credit was called "non-refundable", which the maintainer's reading list of 2026-10-23 notes isn't so, and
   * the CCPC's "refundable" rested on his read alone; no held quote said either then, and since 2026-10-29 and
   * 2026-10-30 only the CRA's quoted lines say it). No rate sets it today.
   */
  refundable?: boolean;
  /** Shown after the rate on the card: the page's own words, quoted, with who said them. */
  note?: string;
}

export interface GrantProgram {
  id: string;
  label: string;
  kind: GrantProgramKind;
  authority: string;
  description: string;
  eligibility: string;
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  provinces: Province[];
  structures: StructureEntityType[];
  activityTags: string[];
  estimatedValue?: string;
  ratesByStructure?: StructureRate[];
}
