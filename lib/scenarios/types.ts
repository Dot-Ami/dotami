import type { CFENodeId } from "@/lib/engines/cfe/v2026";

export type VentureStructure = "sole-prop" | "corporation";
export type VentureType = "service" | "product" | "side-gig";
/** S2.5.4i: how real the idea is. Mirrors Prisma `VentureStage`; the intake asks it on Screen A. */
export type VentureStage = "idea" | "prototype" | "first-customers" | "established";
export const VENTURE_STAGES: readonly VentureStage[] = ["idea", "prototype", "first-customers", "established"];
export const VENTURE_STAGE_LABELS: Record<VentureStage, string> = {
  idea: "Idea",
  prototype: "Prototype",
  "first-customers": "First customers",
  established: "Established",
};

/** All provinces/territories are selectable (W3, 2026-07-02). Engine catalogs only carry
 * provincial entries for FULL_COVERAGE_PROVINCES — everywhere else gets federal (CA)
 * entries plus an honest "provincial coverage coming" badge. Never fake coverage. */
export const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
] as const;
export type Province = (typeof PROVINCES)[number];

export const FULL_COVERAGE_PROVINCES: readonly Province[] = ["AB", "BC", "ON"];

export const PROVINCE_LABELS: Record<Province, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export type EmploymentStatus =
  | "employee"
  | "apprentice"
  | "self-employed"
  | "business-owner"
  | "retired"
  | "unemployed"
  | "other";
export type ScenarioNodeStatus = "active" | "complete" | "decision" | "ghost" | "upcoming";

export interface VentureProfile {
  name: string;
  type: VentureType;
  province: Province;
  targetRevenueY1: number;
  targetRevenueY3: number;
  structure: VentureStructure;
  /**
   * S2.5.4d: "assumed" = nobody set it (intake has no structure control; the map assumes the
   * first rung, sole-prop). "user" = the person set it. Undefined on labeled examples, which
   * are complete by construction. The rail says "not set" while this is "assumed".
   */
  structureSource?: "user" | "assumed";
  employmentStatus: EmploymentStatus;
  hireFirst: boolean;
  /**
   * S2.5.4e: what the person confirmed on intake Screen A — kept on the profile so the
   * cockpit can run the same evaluator the intake preview runs. Undefined on labeled examples
   * (their tags derive from the paths they are bound to) and on pre-2026-09-13 saved rows.
   */
  activityTags?: string[];
  /** S2.5.4e: the intake capital-purchase toggle, persisted for the same reason. */
  capitalPurchasePlanned?: boolean;
  /** S2.5.4i: idea -> prototype -> first customers -> established. Undefined on pre-09-16 rows = idea. */
  stage?: VentureStage;
}

export interface ScenarioState {
  activeNodeIds: CFENodeId[];
  completedNodeIds: CFENodeId[];
  decisionNodeIds: CFENodeId[];
  ghostedNodeIds: CFENodeId[];
  activeBranches: Record<string, CFENodeId>;
  /**
   * S2.5.4d: decisions the person has actually clicked. Everything else in `activeBranches`
   * is a template default and is labelled as one. Session-persisted only — Postgres does not
   * store it, so a reloaded venture shows its picks as defaults again (honest: we don't know).
   */
  decidedBranchIds?: string[];
}

export interface Scenario {
  id: string;
  profile: VentureProfile;
  state: ScenarioState;
}
