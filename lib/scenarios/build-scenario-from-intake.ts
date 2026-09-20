import { defaultActiveBranches, recomputeScenarioState } from "./branches";
import type {
  EmploymentStatus,
  Province,
  Scenario,
  VentureProfile,
  VentureStage,
  VentureType,
} from "./types";

export interface VentureIntakeInput {
  name: string;
  type: VentureType;
  targetRevenueY1: number;
  targetRevenueY3: number;
  province: Province;
  hireFirst: boolean;
  employmentStatus: EmploymentStatus;
  /** Confirmed activity tags (taxonomy + custom) from intake Screen A — what the evaluator matches on. */
  activityTags?: string[];
  /** Intake capital-purchase toggle — feeds Class 50 / CSBFP logic in the evaluator (S2.5.4e). */
  capitalPurchasePlanned?: boolean;
  /** S2.5.4i: how real the idea is; defaults to "idea". */
  stage?: VentureStage;
}

/**
 * Maps validated intake fields to a `Scenario` for the canvas pipeline.
 * S2.5.4h: no archetype any more — every venture starts from the one neutral branch bundle
 * (`defaultActiveBranches`) and the map says those picks are defaults until the person clicks.
 */
export function buildScenarioFromIntake(
  input: VentureIntakeInput,
  scenarioId: string,
): Scenario {
  const profile: VentureProfile = {
    name: input.name.trim(),
    type: input.type,
    province: input.province,
    targetRevenueY1: input.targetRevenueY1,
    targetRevenueY3: input.targetRevenueY3,
    // S2.5.4d: intake has no structure control, so the map assumes the first rung — the same
    // assumption the brain already makes (buildEvaluationProfile) — and says so on the rail.
    structure: "sole-prop",
    structureSource: "assumed",
    employmentStatus: input.employmentStatus,
    hireFirst: input.hireFirst,
    activityTags: input.activityTags ?? [],
    capitalPurchasePlanned: input.capitalPurchasePlanned ?? false,
    stage: input.stage ?? "idea",
  };

  return {
    id: scenarioId,
    profile,
    state: recomputeScenarioState({ ...defaultActiveBranches }, input.hireFirst),
  };
}
