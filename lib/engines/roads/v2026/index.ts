import type { Road, SkillItem } from "./types";
import { roadStartingAnyBusinessAB } from "./starting-any-business-ab";

export type {
  CatalogCostLine,
  CostLineAsShown,
  DoneWhenLine,
  Fork,
  NamedCostLine,
  OfficialFeeLine,
  OfficialLink,
  Road,
  RoadColumn,
  RoadKind,
  RoadStep,
  SkillItem,
} from "./types";
export { costLineAsShown, newestReadDate, roadProblems, skillItemProblems } from "./validate";
export { roadFromCfe } from "./from-cfe";
export { roadStartingAnyBusinessAB } from "./starting-any-business-ab";

/**
 * Every road, in the order added (never ranked: docs/architecture/future-cockpit.md, decision 3).
 * The first written future, "From apprentice to your own shop (Alberta)", joins this list later in
 * phase 1.
 */
export const roadsV2026: readonly Road[] = [roadStartingAnyBusinessAB];

/** The road a saved future is drawn on when it names none: today's map. */
export const generalRoadV2026: Road = roadStartingAnyBusinessAB;

/**
 * Skill items, shared by every road so a person's mark carries across them. Empty until the first
 * written future lists its legal requirements and skills, each cited.
 */
export const skillItemsV2026: readonly SkillItem[] = [];

export const roadsCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: roadsV2026.map((road) => road.lastVerified).sort().at(-1) ?? "",
  entries: roadsV2026,
} as const;

export function roadById(id: string): Road | undefined {
  return roadsV2026.find((road) => road.id === id);
}
