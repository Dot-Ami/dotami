import type { EmploymentStatus, ScenarioState as DbScenarioState, Venture, VentureType } from "@prisma/client";

import { toStringList } from "@/lib/db/json-list";
import { reverseStage } from "@/lib/db/scenario-to-prisma";
import { readMapAnswers } from "@/lib/db/scenario-state-json";
import { recomputeScenarioState } from "@/lib/scenarios/branches";
import { cleanNotSaid } from "@/lib/scenarios/not-said";
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
    case "NOT_SAID":
      return "not-said";
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
  if (!isActiveBranchesJson(row.scenarioState.activeBranches)) {
    return null;
  }
  // The column also holds the person's own answers kept with the map; split them off the picks.
  const { activeBranches: branches, incorporateAt, decidedBranchIds, equipmentNo } = readMapAnswers(
    row.scenarioState.activeBranches as unknown as Record<string, unknown>,
  );

  // The answers a picked future was saved without (2026-10-12); an older row has [] and reads as none. A row
  // still holding the old "sales-targets" with a first-year number kept by Keep reads that year as said
  // (lib/scenarios/not-said.ts cleanNotSaid). No data update: the idea's next save writes the split ids.
  const notSaid = cleanNotSaid(row.notSaid, row.targetRevenueY1);
  const profile: VentureProfile = {
    name: row.name,
    type: reverseVentureType(row.type),
    province: row.province as VentureProfile["province"],
    targetRevenueY1: row.targetRevenueY1,
    targetRevenueY3: row.targetRevenueY3,
    structure: row.structure === "corporation" ? "corporation" : "sole-prop",
    structureSource: row.structureSource === "assumed" ? "assumed" : "user",
    hireFirst: row.hireFirst,
    activityTags: toStringList(row.activityTags),
    // A yes is the column; a No is only one the person gave (scenario-state-json.ts). The column's false
    // alone is also the intake's untouched chip, which is no answer. The column can't be empty, so
    // equipment not said on a picked future (2026-10-12) is stored as "no"; read back, it has no answer.
    ...(notSaid.includes("equipment")
      ? {}
      : { capitalPurchasePlanned: row.capitalPurchasePlanned ? true : equipmentNo ? false : undefined }),
    employmentStatus: reverseEmployment(row.employmentStatus),
    stage: reverseStage(row.stage),
    ...(notSaid.length > 0 ? { notSaid } : {}),
  };

  return {
    id: row.scenarioSeedKey,
    profile,
    state: { ...recomputeScenarioState(branches, profile.hireFirst), decidedBranchIds, incorporateAt },
  };
}
