import type { EngineCitation } from "../../shared/types";

/**
 * A place as an international code (the maintainer's decision of 2026-10-11): `CA` for Canada, `CA-AB`
 * for Alberta. Spelled here rather than imported from lib/places/codes.ts so the catalog imports nothing
 * from the app; tests/official-fees.spec.ts checks every fee's place is one of that file's codes.
 */
export type FeePlace = "CA" | `CA-${string}`;

/**
 * One official fee, written once (docs/engines/fees.md; docs/architecture/future-cockpit.md § 6, "The
 * official fees catalog and start-up cost lines as built"). Roads and the ways to incorporate name it by
 * `id` and copy its amount, so the amount lives in one place.
 */
export interface OfficialFee {
  /** Permanent: `fee-` and its place (`fee-ca-…`, `fee-ab-…`), then what it is for. */
  id: string;
  /** What the fee is for, in plain words. A road line shows its own words for it. */
  label: string;
  /** Where it applies, as an international code; the same place as its source. */
  place: FeePlace;
  /** One amount in whole cents: never a range, an average or a minimum. */
  amountCents: number;
  /** How often it is paid, only when the page says. */
  per?: "once" | "year";
  /**
   * Only on a fee that applies only sometimes: the condition in plain words. A total leaves it out unless
   * the person says the condition holds.
   */
  onlyIf?: string;
  /**
   * The page that states the amount. Checked only by a tool, its quotes must hold the amount as the page
   * writes it; those quotes are the words a card shows for the fee.
   */
  citation: EngineCitation;
}
