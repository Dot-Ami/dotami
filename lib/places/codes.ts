/**
 * Places as international codes (the maintainer's decision of 2026-10-11): `CA` for Canada, and
 * `CA-` plus the province or territory's two letters for each one, as ISO 3166-2:CA writes them. A code
 * names its country, so Canada can never be mistaken for another country's region once places outside
 * Canada are added (that work stays parked; only the shape of the code was decided).
 *
 * The data file stores each idea's place as its code since 2026-10-12: the Prisma enum `Province` maps
 * its names to codes (`AB` is written `CA-AB`), so the app, the catalogs (`AB`, and `CA` for a federal
 * entry) and every reply still use today's values. New storage code goes through here to turn one of
 * today's values into a code (docs/architecture/future-cockpit.md § 7, Storage as built). Moving the
 * catalogs' keys and the app's own type to codes is a later pull request.
 */

/** Canada and its provinces and territories: the places DotAmi's data can name today. */
export const PLACE_CODES = [
  "CA",
  "CA-AB",
  "CA-BC",
  "CA-MB",
  "CA-NB",
  "CA-NL",
  "CA-NS",
  "CA-NT",
  "CA-NU",
  "CA-ON",
  "CA-PE",
  "CA-QC",
  "CA-SK",
  "CA-YT",
] as const;
export type PlaceCode = (typeof PLACE_CODES)[number];

const isPlaceCode = (value: string): value is PlaceCode => (PLACE_CODES as readonly string[]).includes(value);

/**
 * The code for one of today's values ("AB" becomes "CA-AB", "CA" stays "CA"); a code passes through
 * unchanged. Anything else is null: a value this doesn't know is never guessed into a place.
 */
export function placeCodeFor(value: string): PlaceCode | null {
  if (isPlaceCode(value)) return value;
  const asProvince = `CA-${value}`;
  // Only two capital letters can be a province's value; "CA-" on its own, or "CA-CA", is not a place.
  return /^[A-Z]{2}$/.test(value) && isPlaceCode(asProvince) ? asProvince : null;
}
