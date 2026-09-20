import type { EngineCitation, LensAnnotations, Province } from "@/lib/engines/shared/types";

export type StructureEntityType =
  | "sole-prop"
  | "sole-prop-gst"
  | "ccpc"
  | "holdco"
  | "family-trust";

export interface StructureStep {
  id: string;
  label: string;
  entityType: StructureEntityType;
  trigger: string;
  description: string;
  taxImpact: string;
  lensAnnotations: LensAnnotations;
  citations: EngineCitation[];
  transitionTrigger: string;
  nextSteps: string[];
  provinces: Province[];
}
