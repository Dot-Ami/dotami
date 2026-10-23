import { nocGroup } from "@/lib/engines/noc/v2021";
import type { Road } from "@/lib/engines/roads/v2026";

import { roadJobGroups } from "./road-match";

/**
 * The job groups each road is written for, with their titles from the NOC 2021 file (*Written for Cabinetmakers
 * (72311).* on Pick a future's step 3). Server only: the classification's file is about 2 MB, so the pages that
 * show the steps read this on the server and hand the titles down. A group the file doesn't hold keeps its code as
 * its name, never a guessed one.
 */
export function roadJobNames(roads: readonly Road[]): Record<string, { code: string; title: string }[]> {
  return Object.fromEntries(roads.map((road) => [road.id, roadJobGroups(road).map((code) => ({ code, title: nocGroup(code)?.title ?? code }))]));
}
