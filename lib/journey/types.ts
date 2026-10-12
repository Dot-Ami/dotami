import type { DestinationDraft } from "@/lib/front-door/draft";
import type { IntentParseResult } from "@/lib/journey/intent";
import type { Scenario } from "@/lib/scenarios/types";
import type { EmploymentStatus, Province, VentureStage, VentureType } from "@/lib/scenarios/types";

export type IntakeGoalId =
  | "replace-income"
  | "write-offs"
  | "scale-ccpc"
  | "discover-now";

/** Every goal chip, in the order the intake shows them. The save route keeps only these. */
export const INTAKE_GOAL_IDS: readonly IntakeGoalId[] = ["write-offs", "replace-income", "scale-ccpc", "discover-now"];

/** The chips' own names, on the intake and wherever the picks are shown back (the idea's card). */
export const INTAKE_GOAL_LABELS: Record<IntakeGoalId, string> = {
  "write-offs": "Write things off",
  "replace-income": "Replace income",
  "scale-ccpc": "Scale to a corporation",
  "discover-now": "Show me what's available",
};

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
  /** null until the person chooses an employment context on the Ground-it screen. */
  employmentStatus: EmploymentStatus | null;
  /** Free-text when employmentStatus is "other" (W6). */
  employmentOther: string;
  customerGeography: string[];
  targetRevenueY1: number;
  targetRevenueY3: number;
  hireFirst: boolean;
  /** Equipment/tools/vehicle purchase on the path — feeds Class 50 / CSBFP logic. */
  capitalPurchasePlanned: boolean;
  /** The sentence the person typed on the front door (or in the intake's own box), word for word. */
  manualEntry?: string;
  /** The person's own calendar day (YYYY-MM-DD) they typed it; saved with it when the idea is first saved. */
  manualEntrySaidAt?: string;
  /**
   * True once this sentence is done with: a save kept it with an idea, or the person deleted their
   * statements since. A done sentence is never sent again, so a second "Open my map" from the same tab
   * (a new idea each time) neither copies it nor brings back one the person deleted. A new sentence
   * typed on the front door or in the intake's box clears it.
   */
  manualEntryDone?: boolean;
  /** Latest intent-parse result — Screen A renders/edits it; null once confirmed. */
  intentParse?: IntentParseResult | null;
  /**
   * *Your destination*'s answers in this tab (2026-10-12; lib/front-door/draft.ts). Optional, so a draft
   * saved before it reads the same; reset with the rest of the journey by the front door's Map it.
   */
  destination?: DestinationDraft;
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
  employmentStatus: null,
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
