import type { IntakeDraft, IntakeGoalId } from "@/lib/journey/types";
import type { Province, VentureType } from "@/lib/scenarios/types";

/**
 * The activity taxonomy the engines understand. Single source of truth — the intake UI,
 * the intent parser, and the fallback matcher all import from here. Adding a tag here is
 * only useful when engine catalog entries reference it.
 */
export const ACTIVITY_TAXONOMY = [
  "Software / SaaS",
  "AI / ML / R&D",
  "Consulting",
  "Trades",
  "Content / streaming",
  "E-commerce / retail",
  "Manufacturing",
  "Real estate",
  "Creator / influencer",
  "Healthcare / wellness",
] as const;

export type ActivityTag = (typeof ACTIVITY_TAXONOMY)[number];

/**
 * Result of translating the user's own words into the structured profile.
 * ALWAYS suggestions — the confirm screen (intake Screen A) is where the user decides.
 */
export interface IntentParseResult {
  ventureType: VentureType;
  /** Taxonomy tags the text mapped to. */
  activityTags: string[];
  /** Short human label of what they said they're building (their words, cleaned). */
  rawLabel: string;
  goals: IntakeGoalId[];
  /** Detected only when the text names a place — never guessed. */
  province: Province | null;
  capitalPurchasePlanned: boolean;
  /** Fragments we could not map — surfaced honestly on the confirm screen. */
  unmapped: string[];
  source: "llm" | "fallback";
}

/** Applies a parse result onto the journey draft. Additive/mergey — user edits survive. */
export function applyIntentToDraft(
  draft: IntakeDraft,
  result: IntentParseResult,
  originalText: string,
): IntakeDraft {
  return {
    ...draft,
    ventureType: result.ventureType,
    activityTags: [...new Set([...draft.activityTags, ...result.activityTags])],
    goals: [...new Set([...draft.goals, ...result.goals])],
    province: result.province ?? draft.province,
    capitalPurchasePlanned: draft.capitalPurchasePlanned || result.capitalPurchasePlanned,
    manualEntry: originalText,
    description: originalText,
    intentParse: result,
  };
}
