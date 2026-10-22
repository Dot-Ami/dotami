import { NOT_SAID_FIELDS, type NotSaidField, type VentureProfile } from "./types";

/**
 * The one id both sales targets were listed under until 2026-10-21. Ids are forever, so a future picked
 * before the split, still holding it in the data file, reads it as both years not said, except a first year
 * the person kept with the what-if's Keep (`cleanNotSaid`).
 */
export const LEGACY_SALES_TARGETS = "sales-targets";

/**
 * Reads a not-said list (`VentureProfile.notSaid`) from anywhere it arrives, a save's body or the data
 * file's JSON column: only the known ids, each once, in the order `NOT_SAID_FIELDS` lists them. Anything
 * else is dropped, never guessed into one. An empty result means every answer was the person's.
 *
 * `firstYearSales` is the same idea's `targetRevenueY1`. It matters only for a list still holding the old
 * "sales-targets": that id stands for the third year always, and for the first year only while the first
 * year is 0. Before the split, a first-year number above 0 could reach a future still holding the old id
 * in one way only: the person pressed Keep on the what-if (the old `keepWhatIf` set `targetRevenueY1` and
 * left the list alone). Pick a future saved 0; Take back saved 0 again; the intake always makes a new idea
 * with no list. So a number there is one the person told DotAmi, and it reads exactly as Keep reads it
 * since the split: the first year said, the third still not said (the maintainer, 2026-10-22: "if there
 * are any bugs, theey need to be fixed").
 */
export function cleanNotSaid(value: unknown, firstYearSales: number): NotSaidField[] {
  if (!Array.isArray(value)) return [];
  const legacy = value.includes(LEGACY_SALES_TARGETS);
  const keptFirstYear = firstYearSales > 0;
  return NOT_SAID_FIELDS.filter(
    (field) =>
      value.includes(field) ||
      (legacy && (field === "sales-target-year-3" || (field === "sales-target-year-1" && !keptFirstYear))),
  );
}

/** The not-said id of one year's sales target (`targetRevenueY1` or `targetRevenueY3`). */
export function salesTargetField(year: 1 | 3): NotSaidField {
  return year === 1 ? "sales-target-year-1" : "sales-target-year-3";
}

/** Whether the idea was saved without this answer (a future picked on Pick a future, 2026-10-12). */
export function isNotSaid(profile: Pick<VentureProfile, "notSaid" | "targetRevenueY1">, field: NotSaidField): boolean {
  // Read through cleanNotSaid, so a list still holding the old "sales-targets" answers as Keep left it.
  return cleanNotSaid(profile.notSaid, profile.targetRevenueY1).includes(field);
}

/**
 * The profile once the person has given this answer: the field comes off the not-said list. Every
 * reader (road evaluation, the save, the read back) skips a field still on the list, so an answer that
 * left it there showed for a moment and was then lost (the equipment answer on a picked future, found by
 * the idea harness, 2026-10-17). An emptied list is left out, the way a save reads one.
 */
export function withSaid(profile: VentureProfile, field: NotSaidField): VentureProfile {
  if (!isNotSaid(profile, field)) return profile;
  const { notSaid: _list, ...rest } = profile;
  void _list;
  const left = cleanNotSaid(profile.notSaid, profile.targetRevenueY1).filter((f) => f !== field);
  return left.length > 0 ? { ...rest, notSaid: left } : rest;
}

/**
 * The profile with this answer taken back on an idea saved without some of its answers (a picked
 * future): the field goes back on the not-said list, so the idea reads as it did before the answer. An
 * idea with no list (the intake asks every question) gets none, and its answer taken back is unanswered.
 */
export function withNotSaidAgain(profile: VentureProfile, field: NotSaidField): VentureProfile {
  const list = cleanNotSaid(profile.notSaid, profile.targetRevenueY1);
  if (list.length === 0 || list.includes(field)) return profile;
  return { ...profile, notSaid: cleanNotSaid([...list, field], profile.targetRevenueY1) };
}

/**
 * One year's sales target set to the person's own whole-dollar number (the cockpit's box for the third year,
 * Keep on the what-if for the first). A number above 0 is said, so that year comes off the not-said list and
 * the rail and the plan show the number road evaluation reads. 0 is none, as the intake keeps a skipped
 * box: on a picked future the year goes back on the list, so the idea reads as it was before.
 */
export function withSalesTarget(profile: VentureProfile, year: 1 | 3, dollars: number): VentureProfile {
  const field = salesTargetField(year);
  const set = year === 1 ? { targetRevenueY1: dollars } : { targetRevenueY3: dollars };
  return dollars > 0 ? { ...withSaid(profile, field), ...set } : withNotSaidAgain({ ...profile, ...set }, field);
}
