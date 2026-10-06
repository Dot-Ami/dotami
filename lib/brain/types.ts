import type { EngineCitation } from "@/lib/engines/shared/types";
import type { StructureEntityType } from "@/lib/engines/structure/v2026/types";
import type { IntakeGoalId } from "@/lib/journey/types";
import type { EmploymentStatus, Province, VentureType } from "@/lib/scenarios/types";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";

/**
 * The profile the brain evaluates. Built from the intake draft (live preview) or a
 * scenario profile (cockpit). Structure lives in engine space (StructureEntityType),
 * not the narrower VentureStructure UI type.
 */
export interface EvaluationProfile {
  goals: IntakeGoalId[];
  ventureType: VentureType;
  activityTags: string[];
  /** null until the user picks — the evaluator then surfaces federal (CA) entries only. */
  province: Province | null;
  /** null until intake asks; no employment-dependent rule may be inferred before then. */
  employmentStatus: EmploymentStatus | null;
  structure: StructureEntityType;
  targetRevenueY1: number;
  targetRevenueY3: number;
  hireFirst: boolean;
  /** Capital equipment purchase on the path (derived from motivators until intake grows a field). */
  capitalPurchasePlanned: boolean;
}

/** Green = conditions met; yellow = plausible but needs confirmation / near threshold / one fork away; gray = not applicable. */
export type UnlockState = "green" | "yellow" | "gray";

/** Card type chips — matches the signed-off intake preview vocabulary. */
export type UnlockTypeChip =
  | "Write-off"
  | "Grant"
  | "Tax credit"
  | "Financing"
  | "Threshold"
  | "Compliance"
  | "Structure"
  | "Next action";

/** Which intake wizard step this item is grouped under in the live preview. */
export type IntakeStep = "goals" | "venture" | "location" | "refine";

export interface UnlockSource {
  label: string;
  href: string;
}

/** A surfaced near-miss: what one profile change would unlock. This is the aggressive-picture behavior. */
export interface UnlockFork {
  /** e.g. "Incorporating (CCPC) would unlock this" */
  label: string;
  note: string;
}

export interface UnlockRisk {
  level: "info" | "caution" | "professional-required";
  gaar: boolean;
  why: string;
  mitigation: string;
}

/**
 * [8a] A figure the person confirmed in the agree prompt, as the rules engine reads it. The
 * figures store's own view (lib/figures/types.ts) carries more; this is all a rule may use.
 */
export interface ConfirmedFigure {
  id: string;
  /** e.g. "gross-revenue" */
  kind: string;
  /** First and last calendar day it covers, inclusive (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  /** Integer cents; negative for a loss. */
  amountCents: number;
  currency: string;
  /** What the person sees as its source, e.g. "typed by you", "sales-2025.xlsx". */
  sourceLabel: string;
  sourceRows: number | null;
}

/** [8a] What a card leaned on when the person's own figures decided it, instead of an estimate. */
export interface RecordsBasis {
  /** One line for the card, e.g. "From your records · 4 figures · 312 rows". */
  summary: string;
  figureIds: string[];
  sources: { label: string; rows: number | null }[];
}

export interface UnlockItem {
  /** Stable id for React keys — engine entry id, or goal id for goal effects. */
  id: string;
  engine: "writeoffs" | "grants" | "compliance" | "goal" | "structure";
  state: UnlockState;
  typeChip: UnlockTypeChip;
  title: string;
  /** One sentence tied to the answers that triggered it — templated, never free text. */
  why: string;
  /** Compass payoff: "If this applies, ..." */
  payoff: string;
  source: UnlockSource;
  citations: EngineCitation[];
  step: IntakeStep;
  /** ISO date when a time-boxed incentive lapses (surfaces the deadline). */
  expires?: string;
  fork?: UnlockFork;
  risk?: UnlockRisk;
  /** [8a] Present when confirmed figures decided this card (or were read and fell short). */
  fromRecords?: RecordsBasis;
}

export type NodeStateColor = "green" | "yellow" | "gray";

/** Honest catalog-coverage read for the selected province (W3). */
export type ProvinceCoverage = "full" | "federal-only" | "unknown";

export interface EvaluationResult {
  unlocks: UnlockItem[];
  nodeStates: Record<CFENodeId, NodeStateColor>;
  /** "full" = provincial catalog entries exist (AB/BC/ON); "federal-only" = CA-wide rules
   * only, provincial coverage pending; "unknown" = no province selected yet. */
  provinceCoverage: ProvinceCoverage;
}
