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

export interface CFECitation {
  title: string;
  authority: CFECitationAuthority;
  jurisdiction: CFEProvince;
  url: string;
  lastVerified: string;
  note: string;
}

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
}
