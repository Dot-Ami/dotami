import type { EvaluationProfile } from "@/lib/brain/types";
import type { Scenario } from "./types";

/**
 * S2.5.4e — the cockpit runs the SAME evaluator the intake preview runs, on the scenario.
 *
 * Tags: what the person confirmed on intake Screen A (`profile.activityTags`); a pre-2026-09-13
 * saved row has none and evaluates federal/structure-only. Structure: the UI's two-value
 * structure maps onto the engine's ladder — "corporation" is a CCPC for evaluation purposes (the
 * only corporate form the catalogs reason about today). Goals are not on the profile, so
 * goal-effect items do not appear on the cockpit; that is a known gap, not a filter.
 * S2.5.4h: the archetype/path branch is gone with the archetypes.
 */
export function buildEvaluationProfileFromScenario(scenario: Scenario): EvaluationProfile {
  const { profile } = scenario;

  return {
    goals: [],
    ventureType: profile.type,
    activityTags: profile.activityTags ?? [],
    province: profile.province,
    employmentStatus: profile.employmentStatus,
    structure: profile.structure === "corporation" ? "ccpc" : "sole-prop",
    targetRevenueY1: profile.targetRevenueY1,
    targetRevenueY3: profile.targetRevenueY3,
    hireFirst: profile.hireFirst,
    capitalPurchasePlanned: profile.capitalPurchasePlanned ?? false,
  };
}
