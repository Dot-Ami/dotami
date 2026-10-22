import type { EngineCitation } from "../../shared/types";
import { roadFromCfe } from "./from-cfe";
import { roadZeroParts } from "./starting-any-business-ab";
import type { CatalogCostLine, DoneWhenLine, RoadStep } from "./types";

/**
 * The federal steps for any business in Canada (task 28d, 2026-10-21; docs/ui-spec/futures/04-outside-alberta.md).
 * Road 0 without Alberta: the same ten map stages and the same federal "before you open" steps, built by
 * `roadFromCfe` from road 0's own parts (`roadZeroParts`), so the two can't drift apart. Listed on *Pick a
 * future* only for a person whose place is in Canada but outside Alberta (lib/front-door/futures.ts), where it
 * comes first, under "Written for all of Canada".
 *
 * What is left out, by one rule each, never by hand:
 *
 * - **An Alberta-only page**: a citation whose jurisdiction is Alberta. Every *done when* line resting on one
 *   (the WCB-Alberta line on *Hire first employee*, the register-a-name line on *Service vs. productize*), every
 *   cost line whose amount or name it is the source of, and every official link to it (alberta.ca's own pages).
 * - **An Alberta-only step**: a "before you open" step left with no federal (`CA`) source behind what it asks,
 *   in its own sources or its *done when* lines. Today that is *Register your business name, if you use one*
 *   (`step-start-register-name`), which is all alberta.ca. The other three stay: the CRA's bank account and
 *   records pages, and BizPaL, the permit finder the federal, provincial and municipal governments run.
 *
 * Every id is road 0's, kept: ids are unique within a road (docs/engines/roads.md, rule 3), and a person's
 * ticks and picks are kept per idea, which is on one road at a time. The forks are road 0's two, the map's own
 * toggles (`forksAreTheMapToggles` in ./index.ts), so the map reads its picks the same way on both.
 *
 * Each step's own sources are kept as road 0 has them, other provinces' pages included (*Hire first employee*
 * cites British Columbia's and Ontario's employment-standards pages): the screen draws a step's sources for
 * the idea's own place only, the federal ones and its own province's, and says how many it left out
 * (`citationsForPlace` in ./index.ts), so nothing is hidden without a word.
 */

/** A page written for Alberta only. */
const albertaOnly = (citation: EngineCitation) => citation.jurisdiction === "AB";

/** Every page road 0 cites for Alberta only, by address, so a link to one goes with its citations. */
const albertaPages = new Set(
  [
    ...Object.values(roadZeroParts.doneWhen ?? {}).flatMap((lines) => lines.map((line) => line.citation)),
    ...(roadZeroParts.addedSteps ?? []).flatMap(({ step }) => [...step.citations, ...step.doneWhen.map((line) => line.citation)]),
  ]
    .filter(albertaOnly)
    .map((citation) => citation.url),
);

const federalLines = (lines: readonly DoneWhenLine[]) => lines.filter((line) => !albertaOnly(line.citation));

const federalCosts = (costs: readonly CatalogCostLine[]) =>
  costs.filter((cost) => {
    const source = cost.kind === "official-fee" ? cost.citation : cost.nameSource;
    return !source || !albertaOnly(source);
  });

/** True when something the step asks rests on a federal page: its own sources or a *done when* line. */
const restsOnAFederalPage = (step: RoadStep) =>
  [...step.citations, ...step.doneWhen.map((line) => line.citation)].some((citation) => citation.jurisdiction === "CA");

/** A "before you open" step without its Alberta-only lines, costs and links (its sources are kept, see above). */
function withoutAlberta(step: RoadStep): RoadStep {
  return {
    ...step,
    doneWhen: federalLines(step.doneWhen),
    costs: federalCosts(step.costs),
    officialLinks: step.officialLinks.filter((link) => !albertaPages.has(link.url)),
  };
}

export const FEDERAL_ROAD_ID = "road-federal-steps-ca";

export const roadFederalStepsCA = roadFromCfe({
  ...roadZeroParts,
  id: FEDERAL_ROAD_ID,
  label: "The federal steps for any business in Canada",
  kind: "business",
  // Written for all of Canada: every place's federal steps, and no province's own.
  provinces: ["CA"],
  codes: { occupations: "no-particular-job" },
  doneWhen: Object.fromEntries(Object.entries(roadZeroParts.doneWhen ?? {}).map(([stepId, lines]) => [stepId, federalLines(lines)])),
  costs: Object.fromEntries(Object.entries(roadZeroParts.costs ?? {}).map(([stepId, costs]) => [stepId, federalCosts(costs)])),
  addedSteps: (roadZeroParts.addedSteps ?? []).filter(({ step }) => restsOnAFederalPage(withoutAlberta(step))).map(({ columnId, step }) => ({
    columnId,
    step: withoutAlberta(step),
  })),
});
