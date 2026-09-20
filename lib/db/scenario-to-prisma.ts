import type { EmploymentStatus, Province, VentureStage as DbVentureStage, VentureType } from "@prisma/client";

import type { VentureProfile, VentureStage } from "@/lib/scenarios/types";

export function mapVentureProfileToEnums(profile: VentureProfile): {
  type: VentureType;
  province: Province;
  employmentStatus: EmploymentStatus;
  stage: DbVentureStage;
} {
  return {
    type: mapVentureType(profile.type),
    province: profile.province as Province,
    employmentStatus: mapEmployment(profile.employmentStatus),
    stage: mapStage(profile.stage ?? "idea"),
  };
}

const STAGE_TO_DB: Record<VentureStage, DbVentureStage> = {
  idea: "IDEA",
  prototype: "PROTOTYPE",
  "first-customers": "FIRST_CUSTOMERS",
  established: "ESTABLISHED",
};
const STAGE_FROM_DB: Record<DbVentureStage, VentureStage> = {
  IDEA: "idea",
  PROTOTYPE: "prototype",
  FIRST_CUSTOMERS: "first-customers",
  ESTABLISHED: "established",
};

export function mapStage(stage: VentureStage): DbVentureStage {
  return STAGE_TO_DB[stage];
}

export function reverseStage(stage: DbVentureStage): VentureStage {
  return STAGE_FROM_DB[stage] ?? "idea";
}

function mapVentureType(type: VentureProfile["type"]): VentureType {
  switch (type) {
    case "service":
      return "SERVICE";
    case "product":
      return "PRODUCT";
    case "side-gig":
      return "SIDE_GIG";
    default:
      return "SERVICE";
  }
}

function mapEmployment(status: VentureProfile["employmentStatus"]): EmploymentStatus {
  switch (status) {
    case "employee":
      return "EMPLOYEE";
    case "apprentice":
      return "APPRENTICE";
    case "self-employed":
      return "SELF_EMPLOYED";
    case "business-owner":
      return "BUSINESS_OWNER";
    case "retired":
      return "RETIRED";
    case "unemployed":
      return "UNEMPLOYED";
    case "other":
      return "OTHER";
    default:
      return "OTHER";
  }
}
