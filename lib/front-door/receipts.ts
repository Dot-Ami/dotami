import type { Road } from "@/lib/engines/roads/v2026";
import type { PlaceCode } from "@/lib/places/codes";
import { FULL_COVERAGE_PROVINCES, PROVINCE_LABELS, type Province } from "@/lib/scenarios/types";

import type { LookingFor } from "./questions";
import { destinationWords } from "./words";

/**
 * The one-line receipt under each answer on *Your destination* (docs/architecture/future-cockpit.md § 1,
 * "The way in as built"). Pure functions of the answer and the catalogs: a count of roads, which places'
 * rules are written, the day a number was agreed. Never written by a model, and never a verdict.
 */

const words = destinationWords.receipts;

/** What became of the answer to question 1. */
export type DestinationAnswer =
  | { kept: "saved"; text: string; saidAt: string }
  /** The words, with no database to keep them in: only the page's memory holds them (the id is the old name). */
  | { kept: "tab-only"; text: string; saidAt: string }
  /**
   * "I don't know yet". It deletes nothing, so `stillKept` is the person's newest destination already in
   * the data file when they said it: those words still show on top of their futures, and the receipt says so.
   */
  | { kept: "dont-know"; stillKept?: { text: string; saidAt: string } };

/** An income the person agreed to before, still current when they turned a new one down or skipped. */
export interface StillAgreed {
  amountCents: number;
  agreedOn: string;
}

/** What became of question 4. */
export type IncomeAnswer =
  | { kind: "agreed"; amountCents: number; agreedOn: string }
  | { kind: "turned-down"; stillAgreed?: StillAgreed }
  | { kind: "skipped"; stillAgreed?: StillAgreed };

export function destinationReceipt(answer: DestinationAnswer): string {
  if (answer.kept === "saved") return words.destinationKept(answer.saidAt);
  if (answer.kept === "tab-only") return words.destinationTabOnly;
  return answer.stillKept ? words.destinationStillKept(answer.stillKept.saidAt) : words.destinationDontKnow;
}

/**
 * Whether a road of this kind includes what the person said they are after. A "both" road has a business
 * and a career (with a fork between them); "both, or not sure" takes every road. Only for the count:
 * nothing is hidden by it.
 */
export function roadIncludes(kind: Road["kind"], choice: LookingFor): boolean {
  if (choice === "both-or-not-sure") return true;
  return kind === choice || kind === "both";
}

export function lookingForReceipt(
  choice: LookingFor,
  roads: readonly Pick<Road, "kind">[],
): string {
  if (choice === "both-or-not-sure") return words.lookingForAll(roads.length);
  return words.lookingForSome(
    roads.filter((road) => roadIncludes(road.kind, choice)).length,
    roads.length,
    choice,
  );
}

/** "CA-AB" as today's value, "AB", which the catalogs and the app's own type still use. */
export function provinceOfPlace(place: PlaceCode): Province | null {
  const value = place.startsWith("CA-") ? place.slice(3) : "";
  return value in PROVINCE_LABELS ? (value as Province) : null;
}

export function placeName(place: PlaceCode): string {
  const province = provinceOfPlace(place);
  return province ? PROVINCE_LABELS[province] : place;
}

/**
 * Whose rules the catalogs have for the place (its own and the federal ones, or only the federal ones),
 * and how many futures listed are written for it, with the ones written for all of Canada ("CA") counted
 * apart: the federal road's card says the place's own steps aren't written, so it never counts as the place's.
 */
export function placeReceipt(place: PlaceCode, roads: readonly Pick<Road, "provinces">[]): string {
  const province = provinceOfPlace(place);
  const name = placeName(place);
  const rules =
    province && FULL_COVERAGE_PROVINCES.includes(province)
      ? words.placeWritten(name)
      : words.placeFederalOnly(name);
  // A road's places are read as plain strings: it names only the places it is written for.
  const placesOf = (road: Pick<Road, "provinces">): readonly string[] => road.provinces;
  const forPlace = (road: Pick<Road, "provinces">) => province !== null && placesOf(road).includes(province);
  const own = roads.filter(forPlace).length;
  const canada = roads.filter((road) => !forPlace(road) && placesOf(road).includes("CA")).length;
  const futures =
    canada === 0
      ? words.futuresFor(own, name)
      : own === 0
        ? words.futuresForCanadaOnly(canada, name)
        : words.futuresForPlaceAndCanada(own, canada, name);
  return `${rules} ${futures}`;
}

export function incomeReceipt(answer: IncomeAnswer): string {
  if (answer.kind === "agreed") return words.incomeAgreed(answer.amountCents, answer.agreedOn);
  const said = answer.kind === "turned-down" ? words.incomeTurnedDown : words.incomeSkipped;
  // Neither takes back a number agreed before: say it still stands, so the receipt isn't read as "none".
  return answer.stillAgreed
    ? `${said} ${words.incomeStillStands(answer.stillAgreed.amountCents, answer.stillAgreed.agreedOn)}`
    : said;
}
