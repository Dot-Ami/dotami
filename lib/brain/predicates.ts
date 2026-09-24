import type { StructureEntityType } from "@/lib/engines/structure/v2026/types";
import type { EmploymentStatus, Province, VentureType } from "@/lib/scenarios/types";
import type { EvaluationProfile } from "./types";

/**
 * Typed predicate DSL over the evaluation profile. Rules are DATA: reviewable,
 * serializable into golden fixtures, and safely authorable without hiding logic.
 * See docs/brain/strategy-rules-engine.md — do not replace with free-form functions.
 */
export type Predicate =
  | { field: "province"; op: "in"; value: Province[] }
  | { field: "structure"; op: "in"; value: StructureEntityType[] }
  | { field: "ventureType"; op: "in"; value: VentureType[] }
  | { field: "employmentStatus"; op: "in"; value: EmploymentStatus[] }
  | { field: "activityTags"; op: "intersects"; value: string[] }
  | { field: "targetRevenueY1" | "targetRevenueY3"; op: "gte" | "lt"; value: number }
  | { field: "hireFirst" | "capitalPurchasePlanned"; op: "eq"; value: boolean }
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate };

/** Case-insensitive keyword overlap, matching how the UI's loose tag labels behave. */
export function tagsIntersect(profileTags: string[], entryTags: string[]): boolean {
  const haystack = profileTags.map((t) => t.toLowerCase());
  return entryTags.some((entryTag) => {
    const needle = entryTag.toLowerCase();
    return haystack.some((tag) => tag.includes(needle) || needle.includes(tag));
  });
}

export function matchPredicate(profile: EvaluationProfile, predicate: Predicate): boolean {
  if ("all" in predicate) return predicate.all.every((p) => matchPredicate(profile, p));
  if ("any" in predicate) return predicate.any.some((p) => matchPredicate(profile, p));
  if ("not" in predicate) return !matchPredicate(profile, predicate.not);

  switch (predicate.field) {
    case "province":
      // Unknown province never satisfies a province condition — no guessing.
      return profile.province !== null && predicate.value.includes(profile.province);
    case "structure":
      return predicate.value.includes(profile.structure);
    case "ventureType":
      return predicate.value.includes(profile.ventureType);
    case "employmentStatus":
      return profile.employmentStatus !== null && predicate.value.includes(profile.employmentStatus);
    case "activityTags":
      return tagsIntersect(profile.activityTags, predicate.value);
    case "targetRevenueY1":
    case "targetRevenueY3": {
      const actual = profile[predicate.field];
      return predicate.op === "gte" ? actual >= predicate.value : actual < predicate.value;
    }
    case "hireFirst":
    case "capitalPurchasePlanned":
      return profile[predicate.field] === predicate.value;
    default: {
      const exhaustive: never = predicate;
      throw new Error(`Unhandled predicate field: ${JSON.stringify(exhaustive)}`);
    }
  }
}
