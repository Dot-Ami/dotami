/**
 * The economic-region key (docs/architecture/research-kit.md § 5.3; task 25e): the regions Job Bank's wage file
 * is keyed by, as Statistics Canada publishes them, for the region question on Pick a future
 * (docs/ui-spec/futures/02-where-you-are.md, part 2b) and for About this job's choice of wage row.
 *
 * Only Alberta's eight are here. Statistics Canada publishes no file that maps a city or a census metropolitan
 * area to its economic region (research note 25s), and the Edmonton area reaches into two regions, so DotAmi asks
 * the person which region they are in. Nothing here takes an area: the region is only ever the person's own pick,
 * never worked out from where they said they are (`regionThePersonPicked` below).
 *
 * Plain data from the registry's `sgc-2021-economic-regions` card (./registry.ts), which carries its source,
 * licence and credit line. tests/economic-regions.spec.ts holds the list to research 25s's table.
 */
import { SOURCES } from "./registry";

/** The registry card these regions come from. */
export const ECONOMIC_REGIONS_SOURCE_ID = "sgc-2021-economic-regions";

/** The classification's reference year, which fills the `{period}` in the card's credit line. */
export const ECONOMIC_REGIONS_REFERENCE = "2021";

export interface EconomicRegion {
  /**
   * Four digits: the province's two and the region's two ("4830"). The wage file's region code without its "ER"
   * prefix (`ER4830`), and what is kept as the person's answer.
   */
  code: string;
  /**
   * The name as Statistics Canada publishes it, double hyphens and all ("Lethbridge--Medicine Hat"). A screen
   * draws it with `regionNameOnScreen`, so a screen reader doesn't say "dash dash".
   */
  name: string;
  /** The province it is in, in today's place values. */
  province: "AB";
}

/**
 * Alberta's eight economic regions, in Statistics Canada's code order (the order the question lists them in).
 * Read from the variant's page for Alberta on 2026-10-20 (research 25s, checked region by region by its
 * verifier) and again on 2026-10-21; the wage file holds the same eight pairs.
 */
export const ALBERTA_ECONOMIC_REGIONS: readonly EconomicRegion[] = [
  { code: "4810", name: "Lethbridge--Medicine Hat", province: "AB" },
  { code: "4820", name: "Camrose--Drumheller", province: "AB" },
  { code: "4830", name: "Calgary", province: "AB" },
  { code: "4840", name: "Banff--Jasper--Rocky Mountain House", province: "AB" },
  { code: "4850", name: "Red Deer", province: "AB" },
  { code: "4860", name: "Edmonton", province: "AB" },
  { code: "4870", name: "Athabasca--Grande Prairie--Peace River", province: "AB" },
  { code: "4880", name: "Wood Buffalo--Cold Lake", province: "AB" },
];

/**
 * The provinces whose region list has been checked against Statistics Canada's own pages, so the question is
 * asked there. Alberta only for now: elsewhere no region is asked, and About this job shows the wage row for the
 * province or territory as a whole (the maintainer's call 2 of 2026-10-21). A province joins only with its own
 * check, never from the wage file's list alone.
 */
export const REGION_QUESTION_PROVINCES: readonly string[] = ["AB"];

/** The answer kept when the person picks "I don't know" (02-where-you-are.md, What is kept). */
export const DONT_KNOW_REGION = "dont-know";

/**
 * Statistics Canada's page listing the towns in each of Alberta's regions, a fixed link the person opens in
 * their own browser (the question shows it once they pick "I don't know"). It carries nothing about them.
 */
export const ALBERTA_REGIONS_PAGE =
  "https://www23.statcan.gc.ca/imdb/p3VD.pl?Function=getVD&TVD=1368923&CVD=1368932&CPV=48&CST=01012021&CLV=2&MLV=5";

/** The regions the question lists for a province, in code order; none where the question isn't asked. */
export function economicRegionsIn(province: string | null): readonly EconomicRegion[] {
  return province === "AB" ? ALBERTA_ECONOMIC_REGIONS : [];
}

/** A published name as a screen draws it: each double hyphen as an en dash ("Lethbridge–Medicine Hat"). */
export function regionNameOnScreen(name: string): string {
  return name.replace(/--/g, "–");
}

/**
 * The credit line owed wherever the regions are shown: the card's own line with its reference year filled in.
 * Read from the registry, so the card stays the one place it is written.
 */
export function economicRegionsCreditLine(): string {
  const card = SOURCES.find((c) => c.id === ECONOMIC_REGIONS_SOURCE_ID);
  if (!card?.creditLine) throw new Error(`The registry has no credit line for ${ECONOMIC_REGIONS_SOURCE_ID}.`);
  return card.creditLine.replace("{period}", ECONOMIC_REGIONS_REFERENCE);
}

/** What the person said about their region, as About this job and Your plan read it. */
export type RegionPicked =
  /** They picked one of their province's regions. */
  | { kind: "region"; region: EconomicRegion }
  /** They picked "I don't know": About this job then shows the province's own row, and says it's because they said so. */
  | { kind: "dont-know" }
  /** Nothing kept: never asked (outside Alberta, or no job picked), or left on "Choose one". */
  | { kind: "not-picked" }
  /** Something is kept that isn't one of the province's regions (another province's code, a hand-edited file). */
  | { kind: "not-on-the-list"; kept: string };

/**
 * The region the person picked: their own answer as kept on the idea (`Venture.economicRegion`), read against
 * the regions listed for the idea's province. It takes no area on purpose: a region is never filled in,
 * guessed or narrowed from the area they picked, even where an area sits wholly inside one region (Calgary,
 * Lethbridge, Red Deer). With nothing kept the answer is "not picked", never a region.
 */
export function regionThePersonPicked(kept: string | null, province: string | null): RegionPicked {
  if (kept === null || kept === "") return { kind: "not-picked" };
  if (kept === DONT_KNOW_REGION) return { kind: "dont-know" };
  const region = economicRegionsIn(province).find((r) => r.code === kept);
  return region ? { kind: "region", region } : { kind: "not-on-the-list", kept };
}
