import { roadsV2026, type Road } from "@/lib/engines/roads/v2026";
import { PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

import { cockpitWords as words } from "./words";

/**
 * The goal bar's line naming the road drawn, and the plan's (one function, so the two can't say different
 * things). `place` is the idea's province code; it can be one no road names yet (MB, QC…), so road places are
 * read as plain strings.
 *
 * - A road written for the idea's place: *Future: <road>*.
 * - A road written for all of Canada, on an idea whose province has no road of its own in the catalog (task
 *   28d, 2026-10-21): *Future: <road> · <province>'s own steps aren't written yet*. Of steps only: the rules
 *   and tax cards still pick the province's own entries where the catalogs carry them.
 * - A road written for other places: *Map drawn: <road> · written for AB; this idea is in ON*.
 */
export function goalRoadLine(road: Pick<Road, "label" | "provinces">, place: string, roads: readonly Pick<Road, "provinces">[] = roadsV2026): string {
  const places: readonly string[] = road.provinces;
  if (places.includes(place)) return words.goal.future(road.label);
  if (!places.includes("CA")) return words.goal.drawnOnly(road.label, road.provinces, place);
  const provinceHasARoad = roads.some((r) => (r.provinces as readonly string[]).includes(place));
  if (provinceHasARoad) return words.goal.future(road.label);
  return words.goal.federal(road.label, PROVINCE_LABELS[place as Province] ?? place);
}
