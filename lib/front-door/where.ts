import { economicRegionsIn, regionNameOnScreen, DONT_KNOW_REGION } from "@/lib/engines/research-kit/v2026/economic-regions";
import { ALBERTA_AREAS } from "@/lib/places/alberta-areas";

import { whereStepWords } from "./words";

/**
 * The words for the person's answers to step 2, Where you are (docs/ui-spec/futures/02-where-you-are.md), as the
 * steps show them back and as Your plan lists them. Read straight from what they picked: nothing is filled in,
 * and the region is never worked out from the area.
 */

/** The area as its drop-down names it ("Calgary", "Somewhere else in Alberta", "I don't know"); null for anything else. */
export function areaLabel(value: string | null): string | null {
  const area = ALBERTA_AREAS.find((a) => a.value === value);
  return area ? whereStepWords.area[area.key] : null;
}

/**
 * The region as its drop-down names it, with an en dash for the published double hyphen
 * ("Lethbridge–Medicine Hat"), or "I don't know"; null for anything the province's list doesn't hold.
 */
export function regionLabel(value: string | null, province: string | null): string | null {
  if (value === DONT_KNOW_REGION) return whereStepWords.region.dontKnow;
  const region = economicRegionsIn(province).find((r) => r.code === value);
  return region ? regionNameOnScreen(region.name) : null;
}
