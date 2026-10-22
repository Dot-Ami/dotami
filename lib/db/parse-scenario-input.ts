import { roadsV2026 } from "@/lib/engines/roads/v2026";
import { LOOKING_FOR, type LookingFor } from "@/lib/front-door/questions";
import type { FirstSave } from "@/lib/journey/first-save";
import { INTAKE_GOAL_IDS, type IntakeGoalId } from "@/lib/journey/types";
import { isValidSaidAt, STATEMENT_MAX_CHARS } from "@/lib/person/types";
import type { Province, VentureStage, VentureType } from "@/lib/scenarios/types";
import { cleanDecided, cleanIncorporateAt, SALES_DOLLARS_MAX } from "@/lib/db/scenario-state-json";
import { recomputeScenarioState } from "@/lib/scenarios/branches";
import { cleanNotSaid } from "@/lib/scenarios/not-said";
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
  "not-said",
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
  if (p.targetRevenueY1 < 0 || p.targetRevenueY3 < 0 || p.targetRevenueY1 > SALES_DOLLARS_MAX || p.targetRevenueY3 > SALES_DOLLARS_MAX) {
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
  // Buying equipment: true or false is the person's answer; anything else is not answered (left out),
  // which the rules read as no and say so. Until 2026-10-12 anything but true was kept as false, so a save
  // turned "not answered" into "you told us you're not buying".
  const capitalPurchasePlanned = typeof p.capitalPurchasePlanned === "boolean" ? p.capitalPurchasePlanned : undefined;
  const stage: VentureStage = (VENTURE_STAGES as readonly string[]).includes(p.stage as string)
    ? (p.stage as VentureStage)
    : "idea";
  // The answers a picked future was saved without (2026-10-12). No list is none: the intake asks them all.
  // Read with the first-year sales kept below, so an old "sales-targets" reads as Keep left it (not-said.ts).
  const notSaid = cleanNotSaid(p.notSaid, Math.round(p.targetRevenueY1));

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
    // Equipment not said has no answer: the column still stores "no", the rules' reading of none.
    ...(notSaid.includes("equipment") ? {} : { capitalPurchasePlanned }),
    stage,
    ...(notSaid.length > 0 ? { notSaid } : {}),
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
  const state = s.state as Record<string, unknown> | undefined;
  const activeBranches = parseActiveBranches(state?.activeBranches);
  if (!activeBranches) {
    return null;
  }

  return {
    id: s.id,
    profile,
    // The person's own "I'd incorporate at $___": a whole-dollar amount, or nothing. Anything else is
    // dropped rather than refusing the whole save.
    state: {
      ...recomputeScenarioState(activeBranches, profile.hireFirst),
      // The forks the person picked a side at, the default side included: only the map's own forks.
      decidedBranchIds: cleanDecided(state?.decidedBranchIds, activeBranches),
      incorporateAt: cleanIncorporateAt(state?.incorporateAt),
    },
  };
}

/**
 * The extras the intake's first save of an idea carries (lib/journey/first-save.ts): the sentence typed
 * on the front door and the goal picks. Whatever can't be kept honestly is left out, never cut or
 * changed: a sentence that is empty, longer than a statement holds, or dated in the future (one day of
 * slack, as the statements route allows, because the person's own day can be ahead of UTC); goals
 * other than the intake's own chips. The cockpit's autosaves send neither, which reads as `{}`.
 */
export function parseFirstSave(data: unknown, now: Date): FirstSave {
  if (!data || typeof data !== "object") return {};
  const root = data as Record<string, unknown>;
  const out: FirstSave = {};

  const words = root.firstWords as Record<string, unknown> | undefined;
  if (words && typeof words === "object" && typeof words.text === "string") {
    const latestAllowed = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { text, saidAt } = words;
    if (text.trim().length > 0 && text.length <= STATEMENT_MAX_CHARS && isValidSaidAt(saidAt, latestAllowed)) {
      // Word for word: the text is kept exactly as sent.
      out.firstWords = { text, saidAt };
    }
  }

  // Pick a future's two extras: only a road the catalog has, and only an answer the question offers.
  // Anything else is dropped, never guessed into one.
  if (typeof root.roadId === "string" && roadsV2026.some((road) => road.id === root.roadId)) out.roadId = root.roadId;
  if (typeof root.lookingFor === "string" && (LOOKING_FOR as readonly string[]).includes(root.lookingFor)) {
    out.lookingFor = root.lookingFor as LookingFor;
  }

  if (Array.isArray(root.goals)) {
    const known = new Set<string>(INTAKE_GOAL_IDS);
    out.goals = [...new Set(root.goals.filter((g): g is IntakeGoalId => typeof g === "string" && known.has(g)))];
  }
  return out;
}
