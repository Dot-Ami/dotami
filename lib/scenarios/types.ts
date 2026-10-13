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
  | "other"
  // Not asked: a future picked on Pick a future is saved before anyone asks (2026-10-12). Never offered
  // on the intake, which still asks; the rules read it as unanswered (evaluation-profile.ts).
  | "not-said";
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
  /**
   * S2.5.4e: buying equipment, a vehicle or tools. True: the person said yes (the intake's chip switched
   * on, or Yes in the cockpit's one-question box). False: the person said No in the box. Undefined: not
   * answered, which the rules read as no and say so; the intake's chip left off is not answered
   * (2026-10-12). Kept in `Venture.capitalPurchasePlanned` (yes) and the map's answers (no,
   * lib/db/scenario-state-json.ts).
   */
  capitalPurchasePlanned?: boolean;
  /** S2.5.4i: idea -> prototype -> first customers -> established. Undefined on pre-09-16 rows = idea. */
  stage?: VentureStage;
  /**
   * The idea's answers it was saved without, because nobody was asked (2026-10-12): a future picked on
   * Pick a future. Their fields still hold the intake's starting values, which the rules read as they read
   * an untouched intake; this list is what stops anything saying the person told DotAmi them (road
   * evaluation, the cockpit's rail, the export). Undefined (or empty) = every answer was the person's.
   */
  notSaid?: NotSaidField[];
}

/** The answers a future can be saved without (`VentureProfile.notSaid`). Ids are permanent: the data file keeps them. */
export const NOT_SAID_FIELDS = ["venture-type", "equipment", "sales-targets"] as const;
export type NotSaidField = (typeof NOT_SAID_FIELDS)[number];

export interface ScenarioState {
  activeNodeIds: CFENodeId[];
  completedNodeIds: CFENodeId[];
  decisionNodeIds: CFENodeId[];
  ghostedNodeIds: CFENodeId[];
  activeBranches: Record<string, CFENodeId>;
  /**
   * S2.5.4d: decisions the person has actually clicked. Everything else in `activeBranches`
   * is a template default and is labelled as one. Since 2026-10-12 it is saved with the map's answers
   * (key `decided`, lib/db/scenario-state-json.ts), so a pick of the default side is still the person's
   * after a reload; until then it lived for the session only. A saved pick off the default reads "your
   * pick" either way (`isBranchDecided`, 2026-10-11), which covers rows saved before the key existed.
   */
  decidedBranchIds?: string[];
  /**
   * The person's own "I'd incorporate at $___": yearly sales in whole dollars, or null/undefined when
   * they haven't given one (2026-10-11). Theirs, never DotAmi's: no law sets such a number, so the
   * map has no default. Saved in the same database column as `activeBranches` (the idea's map
   * answers), under its own key, so no migration was needed; lib/db/scenario-state-json.ts.
   */
  incorporateAt?: number | null;
}

export interface Scenario {
  id: string;
  profile: VentureProfile;
  state: ScenarioState;
}
