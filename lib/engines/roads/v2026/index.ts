import { jobGroupOf } from "../../oasis/v2026";
import type { EngineCitation } from "../../shared/types";
import type { Road, SkillItem } from "./types";
import { roadApprenticeToOwnShopAB, skillItemsApprenticeToOwnShopAB } from "./apprentice-to-own-shop-ab";
import { roadFederalStepsCA } from "./federal-steps-ca";
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
export { FEDERAL_ROAD_ID, roadFederalStepsCA } from "./federal-steps-ca";

/**
 * Every road, in the order added (never ranked: docs/architecture/future-cockpit.md, decision 3).
 * *Pick a future* (components/front-door/pick-future-page.tsx, 2026-10-12) lists them in this order, the ones
 * written for all of Canada first for a person outside Alberta (lib/front-door/futures.ts).
 */
export const roadsV2026: readonly Road[] = [roadStartingAnyBusinessAB, roadApprenticeToOwnShopAB, roadFederalStepsCA];

/** The road a saved future is drawn on when it names none: today's map. */
export const generalRoadV2026: Road = roadStartingAnyBusinessAB;

/**
 * True on a road whose forks are the map's own two toggles (GST timing, Incorporation timing), kept with the
 * map's answers (`ScenarioState.activeBranches`) rather than on the future: road 0, and the federal road built
 * from the same map (2026-10-21). On every other road a fork's pick is the person's and kept on the future.
 */
export function forksAreTheMapToggles(road: Pick<Road, "id">): boolean {
  return road.id === roadStartingAnyBusinessAB.id || road.id === roadFederalStepsCA.id;
}

/**
 * True on the tax and structure roads, built from the tax map (road 0 and the federal steps), where the cockpit's
 * left rail draws the ways a business can be set up (components/cockpit/structure-ladder-rail.tsx). On a road
 * about something else (the apprentice road) the ladder isn't drawn: the screen review of 2026-10-23 found "Holding
 * company (Holdco) … Family trust" there.
 */
export function drawsTheStructureLadder(road: Pick<Road, "id">): boolean {
  return road.id === roadStartingAnyBusinessAB.id || road.id === roadFederalStepsCA.id;
}

/**
 * A step's sources as a road written for all of Canada draws them for one idea (task 28d, 2026-10-21): the
 * federal pages and the idea's own province's, in the road's order, and how many it left out (other
 * provinces' pages), so the screen can say so and nothing is hidden without a word. On a road written for
 * particular provinces every source is shown: the road is that place's, whoever opens it.
 */
export function citationsForPlace(
  road: Pick<Road, "provinces">,
  citations: readonly EngineCitation[],
  place: string,
): { shown: EngineCitation[]; leftOut: number } {
  const places: readonly string[] = road.provinces;
  if (!places.includes("CA")) return { shown: [...citations], leftOut: 0 };
  const shown = citations.filter((citation) => citation.jurisdiction === "CA" || citation.jurisdiction === place);
  return { shown, leftOut: citations.length - shown.length };
}

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
