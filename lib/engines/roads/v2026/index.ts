import { jobGroupOf } from "../../oasis/v2026";
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
  RoadCodes,
  RoadColumn,
  RoadJoin,
  RoadKind,
  RoadStep,
  SkillItem,
} from "./types";
export { costLineAsShown, newestReadDate, roadCodeProblems, roadJoinProblems, roadProblems, skillItemProblems } from "./validate";
export { roadFromCfe } from "./from-cfe";
export { roadApprenticeToOwnShopAB } from "./apprentice-to-own-shop-ab";
export { roadStartingAnyBusinessAB } from "./starting-any-business-ab";

/**
 * Every road, in the order added (never ranked: docs/architecture/future-cockpit.md, decision 3).
 * *Pick a future* (components/front-door/pick-future-page.tsx, 2026-10-12) lists them in this order.
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

/**
 * The roads written for the job the person picked, in the order they were written (never ranked), for the road
 * match on Pick a future (docs/ui-spec/futures/03-road-match.md, task 28c). `pickedJob` is the person's own
 * pick as kept on the idea ("72311.00") or its 5-digit group ("72311"); a road matches when its
 * `codes.occupations` holds that group.
 *
 * An empty list is an answer, not a gap to fill: no road is written for that job, and the screen says so.
 * Nothing here falls back to road 0 or to any other road, and a road written for no particular job never
 * matches a job. Where a road is written for (its `provinces`) is the caller's to show, as Pick a future does
 * today; this reads the job only. Anything that isn't a job code matches nothing.
 */
export function roadsWrittenForJob(pickedJob: string, roads: readonly Road[] = roadsV2026): readonly Road[] {
  if (!/^\d{5}(?:\.\d{2})?$/.test(pickedJob)) return [];
  const group = jobGroupOf(pickedJob);
  return roads.filter((road) => road.codes.occupations !== "no-particular-job" && road.codes.occupations.includes(group));
}
