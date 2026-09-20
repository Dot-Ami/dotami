import type { Province, VentureStage, VentureType } from "@/lib/scenarios/types";
import { recomputeScenarioState } from "@/lib/scenarios/branches";
import { PROVINCES as ALL_PROVINCES, VENTURE_STAGES } from "@/lib/scenarios/types";
import type { Scenario, VentureProfile } from "@/lib/scenarios/types";

const PROVINCES = new Set<Province>(ALL_PROVINCES);
const TYPES = new Set<VentureType>(["service", "product", "side-gig"]);
const EMPLOYMENT = new Set<VentureProfile["employmentStatus"]>([
  "employee",
  "apprentice",
  "self-employed",
  "business-owner",
  "retired",
  "unemployed",
  "other",
]);
function parseProfile(raw: unknown): VentureProfile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const p = raw as Record<string, unknown>;
  if (typeof p.name !== "string" || p.name.trim().length < 1 || p.name.length > 200) {
    return null;
  }
  if (typeof p.type !== "string" || !TYPES.has(p.type as VentureType)) {
    return null;
  }
  if (typeof p.province !== "string" || !PROVINCES.has(p.province as Province)) {
    return null;
  }
  if (typeof p.targetRevenueY1 !== "number" || typeof p.targetRevenueY3 !== "number") {
    return null;
  }
  if (!Number.isFinite(p.targetRevenueY1) || !Number.isFinite(p.targetRevenueY3)) {
    return null;
  }
  if (p.targetRevenueY1 < 0 || p.targetRevenueY3 < 0 || p.targetRevenueY1 > 1e9 || p.targetRevenueY3 > 1e9) {
    return null;
  }
  let structure: VentureProfile["structure"] = "sole-prop";
  if (p.structure === "corporation") {
    structure = "corporation";
  } else if (p.structure !== undefined && p.structure !== "sole-prop") {
    return null;
  }
  if (typeof p.hireFirst !== "boolean") {
    return null;
  }
  if (typeof p.employmentStatus !== "string" || !EMPLOYMENT.has(p.employmentStatus as VentureProfile["employmentStatus"])) {
    return null;
  }
  // S2.5.4h: these three were dropped here, so every Save wrote structureSource "user", no tags
  // and no capital flag — a reloaded venture lost what the person set (found 2026-09-14).
  const structureSource: VentureProfile["structureSource"] =
    p.structureSource === "assumed" ? "assumed" : "user";
  const activityTags = Array.isArray(p.activityTags)
    ? p.activityTags.filter((t): t is string => typeof t === "string" && t.length > 0 && t.length <= 80).slice(0, 40)
    : [];
  const capitalPurchasePlanned = p.capitalPurchasePlanned === true;
  const stage: VentureStage = (VENTURE_STAGES as readonly string[]).includes(p.stage as string)
    ? (p.stage as VentureStage)
    : "idea";

  return {
    name: p.name.trim(),
    type: p.type as VentureType,
    province: p.province as Province,
    targetRevenueY1: Math.round(p.targetRevenueY1),
    targetRevenueY3: Math.round(p.targetRevenueY3),
    structure,
    structureSource,
    hireFirst: p.hireFirst,
    employmentStatus: p.employmentStatus as VentureProfile["employmentStatus"],
    activityTags,
    capitalPurchasePlanned,
    stage,
  };
}

function parseActiveBranches(raw: unknown): Scenario["state"]["activeBranches"] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const b = raw as Record<string, unknown>;
  if (typeof b.gstTiming !== "string" || typeof b.incorporationTiming !== "string") {
    return null;
  }
  if (b.gstTiming.length < 1 || b.gstTiming.length > 120 || b.incorporationTiming.length < 1 || b.incorporationTiming.length > 120) {
    return null;
  }
  return {
    gstTiming: b.gstTiming as Scenario["state"]["activeBranches"]["gstTiming"],
    incorporationTiming: b.incorporationTiming as Scenario["state"]["activeBranches"]["incorporationTiming"],
  };
}

/** Validates JSON body and returns a scenario with state recomputed from branch picks. */
export function parseScenarioInput(data: unknown): Scenario | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const root = data as Record<string, unknown>;
  const nested = root.scenario !== undefined ? root.scenario : root;
  if (!nested || typeof nested !== "object") {
    return null;
  }
  const s = nested as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id.length < 1 || s.id.length > 200) {
    return null;
  }
  const profile = parseProfile(s.profile);
  if (!profile) {
    return null;
  }
  const activeBranches = parseActiveBranches((s.state as Record<string, unknown> | undefined)?.activeBranches);
  if (!activeBranches) {
    return null;
  }

  return {
    id: s.id,
    profile,
    state: recomputeScenarioState(activeBranches, profile.hireFirst),
  };
}
