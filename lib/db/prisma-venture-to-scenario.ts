import type { EmploymentStatus, ScenarioState as DbScenarioState, Venture, VentureType } from "@prisma/client";

import { reverseStage } from "@/lib/db/scenario-to-prisma";
import { recomputeScenarioState } from "@/lib/scenarios/branches";
import type { Scenario, ScenarioState, VentureProfile } from "@/lib/scenarios/types";

type VentureWithState = Venture & { scenarioState: DbScenarioState | null };

function isActiveBranchesJson(value: unknown): value is ScenarioState["activeBranches"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.gstTiming === "string" &&
    typeof record.incorporationTiming === "string" &&
    (record.gstTiming as string).length > 0 &&
    (record.incorporationTiming as string).length > 0
  );
}

function reverseVentureType(type: VentureType): VentureProfile["type"] {
  switch (type) {
    case "SERVICE":
      return "service";
    case "PRODUCT":
      return "product";
    case "SIDE_GIG":
      return "side-gig";
    default:
      return "service";
  }
}

function reverseEmployment(status: EmploymentStatus): VentureProfile["employmentStatus"] {
  switch (status) {
    case "EMPLOYEE":
      return "employee";
    case "APPRENTICE":
      return "apprentice";
    case "SELF_EMPLOYED":
      return "self-employed";
    case "BUSINESS_OWNER":
      return "business-owner";
    case "RETIRED":
      return "retired";
    case "UNEMPLOYED":
      return "unemployed";
    case "OTHER":
      return "other";
    default:
      return "other";
  }
}

/**
 * Hydrates a `Scenario` from persisted Venture + ScenarioState rows.
 * Branch visibility is recomputed from `activeBranches` + `hireFirst` so it stays aligned with `recomputeScenarioState`.
 */
export function mapVentureRowToScenario(row: VentureWithState): Scenario | null {
  if (!row.scenarioSeedKey || !row.scenarioState) {
    return null;
  }
  const branches = row.scenarioState.activeBranches;
  if (!isActiveBranchesJson(branches)) {
    return null;
  }

  const profile: VentureProfile = {
    name: row.name,
    type: reverseVentureType(row.type),
    province: row.province as VentureProfile["province"],
    targetRevenueY1: row.targetRevenueY1,
    targetRevenueY3: row.targetRevenueY3,
    structure: row.structure === "corporation" ? "corporation" : "sole-prop",
    structureSource: row.structureSource === "assumed" ? "assumed" : "user",
    hireFirst: row.hireFirst,
    activityTags: row.activityTags,
    capitalPurchasePlanned: row.capitalPurchasePlanned,
    employmentStatus: reverseEmployment(row.employmentStatus),
    stage: reverseStage(row.stage),
  };

  return {
    id: row.scenarioSeedKey,
    profile,
    state: recomputeScenarioState(branches, profile.hireFirst),
  };
}
