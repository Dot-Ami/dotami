import { roadsV2026, roadsWrittenForJob, type Road } from "@/lib/engines/roads/v2026";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

import { cockpitWords as words } from "./words";

/** What the idea keeps about why this road: whether the person picked it, and the job they picked, if any. */
export interface RoadWhy {
  /** True when the idea keeps a road the person opened (`Venture.roadId`); false for an idea kept with none. */
  roadChosen: boolean;
  /** The person's pick of job (`Venture.occupationCode`), or null. */
  job: { code: string; label: string } | null;
}

/**
 * The goal bar's line naming the road drawn, and the plan's (one function, so the two can't say different
 * things). `place` is the idea's province code; it can be one no road names yet (MB, QC…), so road places are
 * read as plain strings.
 *
 * - A road written for the idea's place: *Future: <road>*, and, when `why` names a picked job (task 28c,
 *   docs/ui-spec/futures/03-road-match.md, "After Look inside"), whether the road is written for it: *· written
 *   for your pick of job*, or *· not written for your pick of job, <job>*.
 * - An idea kept with no road (`why.roadChosen` false: typed before the three steps, and every idea from before
 *   roads), on a road written for its place: *Map drawn: <road> · the general road, because this idea was saved
 *   before a road was picked for it*.
 * - A road written for all of Canada, on an idea whose province has no road of its own in the catalog (task
 *   28d, 2026-10-21): *Future: <road> · <province>'s own steps aren't written yet*. Of steps only: the rules
 *   and tax cards still pick the province's own entries where the catalogs carry them.
 * - A road written for other places: *Map drawn: <road> · written for AB; this idea is in ON*.
 *
 * `why` left out (Mara's example, which isn't anyone's pick) reads as the road's name alone.
 */
export function goalRoadLine(
  road: Pick<Road, "id" | "label" | "provinces">,
  place: string,
  why?: RoadWhy,
  roads: readonly Pick<Road, "provinces">[] = roadsV2026,
): string {
  const places: readonly string[] = road.provinces;
  if (places.includes(place)) {
    if (why && !why.roadChosen) return words.goal.savedBeforeRoads(road.label);
    const future = words.goal.future(road.label);
    if (!why?.job) return future;
    const written = roadsWrittenForJob(why.job.code).some((r) => r.id === road.id);
    return `${future} · ${written ? words.goal.forJob : words.goal.notForJob(why.job.label)}`;
  }
  if (!places.includes("CA")) return words.goal.drawnOnly(road.label, road.provinces, place);
  const provinceHasARoad = roads.some((r) => (r.provinces as readonly string[]).includes(place));
  if (provinceHasARoad) return words.goal.future(road.label);
  return words.goal.federal(road.label, PROVINCE_LABELS[place as Province] ?? place);
}
