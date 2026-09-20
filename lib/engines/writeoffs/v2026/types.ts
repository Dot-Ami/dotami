import type { EngineCitation, LensAnnotations, Province } from "@/lib/engines/shared/types";
import type { StructureEntityType } from "@/lib/engines/structure/v2026/types";

/** Time-boxed enhanced first-year CCA treatment. Rules engine surfaces these yellow with the deadline. */
export interface FirstYearIncentive {
  /** First-year deduction rate as a fraction (1 = 100%). */
  rate: number;
  /** Property must be acquired after this ISO date, when the incentive specifies one. */
  acquiredAfter?: string;
  /** Property must be available for use before this ISO date — the expiry the rules engine watches. */
  availableForUseBefore: string;
  /** Compass-voiced caveat; must direct the user to professional confirmation. */
  note: string;
}

export interface WriteOffCategory {
  id: string;
  label: string;
  description: string;
  eligibility: string;
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  structures: StructureEntityType[];
  activityTags: string[];
  ccaClass?: string;
  /** Normal declining-balance CCA rate as a fraction (e.g. 0.55 for Class 50). */
  decliningBalanceRate?: number;
  firstYearIncentive?: FirstYearIncentive;
  provinces: Province[];
}
