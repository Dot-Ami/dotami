import { jobGroupOf } from "../../oasis/v2026";
import type { EngineCitation } from "../../shared/types";
import type { CatalogCostLine, Road, RoadStep, SkillItem } from "./types";
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
 * A step's sources as any road draws them for one idea: the federal pages and the idea's own province's, in the
 * road's order, and how many it left out (other provinces' pages), so the screen can say so and nothing is hidden
 * without a word. First on the road written for all of Canada (task 28d, 2026-10-21); on every road since the
 * maintainer's call a-call-12 (2026-10-23), so a person in Alberta on road 0 no longer sees Ontario's and British
 * Columbia's employment-standards pages under Hire first employee. `road` is kept so every screen keeps asking
 * through this one function (the step panel, the plan, the export and Pick a future's source counts); where a road
 * is written for no longer changes what is shown.
 */
export function citationsForPlace(
  road: Pick<Road, "provinces">,
  citations: readonly EngineCitation[],
  place: string,
): { shown: EngineCitation[]; leftOut: number } {
  void road;
  const shown = citations.filter((citation) => citation.jurisdiction === "CA" || citation.jurisdiction === place);
  return { shown, leftOut: citations.length - shown.length };
}

/**
 * Skill items, shared by every road so a person's mark carries across them: the first written future's
 * legal requirements and road 0's (2026-10-12), each cited. The government's lists for a job are their own
 * catalog (lib/engines/oasis/v2026/), shown only for the job the person picks, never tied to a step.
 */
export const skillItemsV2026: readonly SkillItem[] = [...skillItemsApprenticeToOwnShopAB, ...skillItemsStartingAnyBusinessAB];

/**
 * A step's own sources for the idea's place (`citationsForPlace`), with the count line's number grown by the
 * pages `roadForPlace` left out of its *done when* lines, cost lines, official links and listed skill items. The
 * step panel and the plan ask this, so one line says everything a step left out for another province.
 */
export function stepSourcesForPlace(
  road: Pick<Road, "provinces">,
  step: Pick<RoadStep, "citations" | "pagesLeftOutForPlace">,
  place: string,
): { shown: EngineCitation[]; leftOut: number } {
  const { shown, leftOut } = citationsForPlace(road, step.citations, place);
  return { shown, leftOut: leftOut + (step.pagesLeftOutForPlace ?? 0) };
}

/**
 * A road as one idea's screens draw it (a-call-12, 2026-10-23; review of #207): every step keeps only the *done
 * when* lines, cost lines and official links resting on a federal page or one for the idea's own province. A road
 * written for Alberta, opened from Ontario (call 35), would otherwise list Alberta's name registry, its WCB line and
 * its name fee. The same rule as the federal road's (./federal-steps-ca.ts), for any place, and counted: each step
 * says how many pages it left out, in the line its sources already have (`stepSourcesForPlace`). Nothing is
 * removed from the road itself: the steps, their order and their sources stay, the storage checks a person's
 * ticks and quotes against the whole road (`roadForFuture`), and a tick on a line left out here is kept whatever
 * list a save sends (lib/futures/types.ts `ticksToSave`), so moving back shows them again. In a road's own
 * province, or on a road citing no other province, it changes nothing.
 *
 * Since the second review of #207 (2026-10-24) the same rule holds for the skill items a step lists: an item none
 * of whose sources is federal or the place's own leaves the step's `needs` (road 1's *Alberta Student Number*, seen
 * from Ontario), its pages counted in the same line; a mark on it stays the person's. What a step left out is kept
 * on it (`leftOutForPlace`). `skillItems` are the items as written, never `skillItemsForPlace`'s.
 */
export function roadForPlace(road: Road, place: string, skillItems: readonly SkillItem[] = skillItemsV2026): Road {
  const here = (citation: EngineCitation) => citation.jurisdiction === "CA" || citation.jurisdiction === place;
  const other = (citation: EngineCitation | undefined) => citation !== undefined && !here(citation);
  const costSource = (cost: CatalogCostLine) => (cost.kind === "official-fee" ? cost.citation : cost.nameSource);
  const itemById = new Map(skillItems.map((item) => [item.id, item]));
  // An item's pages: its own sources and the page of its way to get it.
  const itemPages = (id: string): EngineCitation[] => {
    const item = itemById.get(id);
    return item ? [...item.citations, ...(item.howToGetIt ? [item.howToGetIt.citation] : [])] : [];
  };
  // An item with no federal or own-province source (the checks refuse an item with no source at all). An id the
  // list doesn't hold stays listed: nothing here says where it rests.
  const itemElsewhere = (id: string) => {
    const item = itemById.get(id);
    return item !== undefined && !item.citations.some(here);
  };
  // Every page the road cites for another province, by address, so a link to one goes with its citations.
  const otherPages = new Set(
    road.steps
      .flatMap((step) => [
        ...step.citations,
        ...step.doneWhen.map((line) => line.citation),
        ...step.costs.map(costSource),
        ...step.needs.flatMap(itemPages),
      ])
      .filter(other)
      .map((citation) => citation!.url),
  );
  if (otherPages.size === 0) return road;
  return {
    ...road,
    steps: road.steps.map((step) => {
      const left = {
        doneWhenIds: step.doneWhen.filter((line) => other(line.citation)).map((line) => line.id),
        costs: step.costs.filter((cost) => other(costSource(cost))),
        needs: step.needs.filter(itemElsewhere),
      };
      const doneWhen = step.doneWhen.filter((line) => !other(line.citation));
      const costs = step.costs.filter((cost) => !other(costSource(cost)));
      const officialLinks = step.officialLinks.filter((link) => !otherPages.has(link.url));
      const needs = step.needs.filter((id) => !itemElsewhere(id));
      // The pages behind what was left out, once each, less those the step's own sources count already.
      const counted = new Set(step.citations.filter(other).map((citation) => citation.url));
      const leftOut = new Set([
        ...step.doneWhen.filter((line) => other(line.citation)).map((line) => line.citation.url),
        ...left.costs.map((cost) => costSource(cost)!.url),
        ...step.officialLinks.filter((link) => otherPages.has(link.url)).map((link) => link.url),
        ...left.needs.flatMap((id) => itemPages(id).filter(other).map((citation) => citation.url)),
      ]);
      const pages = [...leftOut].filter((url) => !counted.has(url)).length;
      const anyLeft = left.doneWhenIds.length + left.costs.length + left.needs.length > 0;
      return {
        ...step,
        doneWhen,
        costs,
        officialLinks,
        needs,
        ...(pages > 0 ? { pagesLeftOutForPlace: pages } : {}),
        ...(anyLeft ? { leftOutForPlace: left } : {}),
      };
    }),
  };
}

/**
 * The skill items as a screen draws them for one idea (second review of #207, 2026-10-24): each item's own sources
 * through `citationsForPlace`, its way to get it only when that page is federal or the place's own, and how many
 * pages it left out, which its row says in the step's own words. An item resting only on another province's pages
 * isn't listed for that place at all (`roadForPlace`), so a legal requirement is never drawn without its law.
 */
export function skillItemsForPlace(items: readonly SkillItem[], place: string): SkillItem[] {
  const here = (citation: EngineCitation) => citation.jurisdiction === "CA" || citation.jurisdiction === place;
  return items.map((item) => {
    const { howToGetIt, ...rest } = item;
    const { shown, leftOut } = citationsForPlace({ provinces: [] }, item.citations, place);
    const how = howToGetIt && here(howToGetIt.citation) ? howToGetIt : undefined;
    // The way to get it, left out, is one more page, unless it is one of the item's own sources (counted there).
    const howLeft = howToGetIt && !how && !item.citations.some((citation) => citation.url === howToGetIt.citation.url) ? 1 : 0;
    const n = leftOut + howLeft;
    return { ...rest, citations: shown, ...(how ? { howToGetIt: how } : {}), ...(n > 0 ? { sourcesLeftOutForPlace: n } : {}) };
  });
}

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
