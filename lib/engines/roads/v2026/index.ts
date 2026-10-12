import type { Road, SkillItem } from "./types";
import { roadApprenticeToOwnShopAB, skillItemsApprenticeToOwnShopAB } from "./apprentice-to-own-shop-ab";
import { roadStartingAnyBusinessAB, skillItemsStartingAnyBusinessAB } from "./starting-any-business-ab";

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
  RoadJoin,
  RoadKind,
  RoadStep,
  SkillItem,
} from "./types";
export { costLineAsShown, newestReadDate, roadJoinProblems, roadProblems, skillItemProblems } from "./validate";
export { roadFromCfe } from "./from-cfe";
export { roadApprenticeToOwnShopAB } from "./apprentice-to-own-shop-ab";
export { roadStartingAnyBusinessAB } from "./starting-any-business-ab";

/**
 * Every road, in the order added (never ranked: docs/architecture/future-cockpit.md, decision 3).
 * No screen lists them yet: the map draws road 0, and *Pick a future* comes later in phase 1.
 */
export const roadsV2026: readonly Road[] = [roadStartingAnyBusinessAB, roadApprenticeToOwnShopAB];

/** The road a saved future is drawn on when it names none: today's map. */
export const generalRoadV2026: Road = roadStartingAnyBusinessAB;

/**
 * Skill items, shared by every road so a person's mark carries across them: the first written future's
 * legal requirements and road 0's (2026-10-12), each cited. The government's lists for a job are their own
 * catalog (lib/engines/oasis/v2026/), shown only for the job the person picks, never tied to a step.
 */
export const skillItemsV2026: readonly SkillItem[] = [...skillItemsApprenticeToOwnShopAB, ...skillItemsStartingAnyBusinessAB];

export const roadsCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: roadsV2026.map((road) => road.lastVerified).sort().at(-1) ?? "",
  entries: roadsV2026,
} as const;

export function roadById(id: string): Road | undefined {
  return roadsV2026.find((road) => road.id === id);
}
