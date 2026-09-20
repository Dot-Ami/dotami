import type { IntentParseResult } from "@/lib/journey/intent";
import type { Scenario } from "@/lib/scenarios/types";
import type { EmploymentStatus, Province, VentureStage, VentureType } from "@/lib/scenarios/types";

export type IntakeGoalId =
  | "replace-income"
  | "write-offs"
  | "scale-ccpc"
  | "discover-now";

export interface IntakeDraft {
  goals: IntakeGoalId[];
  ventureType: VentureType;
  /** Taxonomy tags (see intake ACTIVITY_TAGS / intent parse mapping). */
  activityTags: string[];
  /** User-typed labels the taxonomy doesn't cover — kept for display + keyword matching. */
  customTags: string[];
  description: string;
  ventureStage: VentureStage;
  name: string;
  /** null until the user picks — nothing may pretend to know provincial rules before then. */
  province: Province | null;
  employmentStatus: EmploymentStatus;
  /** Free-text when employmentStatus is "other" (W6). */
  employmentOther: string;
  customerGeography: string[];
  targetRevenueY1: number;
  targetRevenueY3: number;
  hireFirst: boolean;
  /** Equipment/tools/vehicle purchase on the path — feeds Class 50 / CSBFP logic. */
  capitalPurchasePlanned: boolean;
  manualEntry?: string;
  /** Latest intent-parse result — Screen A renders/edits it; null once confirmed. */
  intentParse?: IntentParseResult | null;
}

export interface JourneyState {
  intake: IntakeDraft;
  scenario: Scenario | null;
}

/**
 * Blank by design (2026-07-02 workshop): the preview and screens must render only what
 * the user actually provided — pre-filled defaults made every surface feel like
 * disconnected filler. Do not reintroduce default goals/tags/province.
 */
export const defaultIntakeDraft = (): IntakeDraft => ({
  goals: [],
  ventureType: "service",
  activityTags: [],
  customTags: [],
  description: "",
  ventureStage: "idea",
  name: "",
  province: null,
  employmentStatus: "employee",
  employmentOther: "",
  customerGeography: [],
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  hireFirst: false,
  capitalPurchasePlanned: false,
});

// v2: 2026-07-02 draft reshape (blank defaults, nullable province, custom tags).
// v3: 2026-09-14 (S2.5.4h) — Explore's goal weights / motivators / path pins removed from the
// draft; bumping the key orphans stale drafts that still carry them.
export const JOURNEY_STORAGE_KEY = "dotami-journey-v3";
