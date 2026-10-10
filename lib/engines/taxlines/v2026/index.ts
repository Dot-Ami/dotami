export type { TaxFormCode, TaxLineEntry, TaxLineYearRead } from "./types";
export { t2125LinesV2026 } from "./t2125";

import { t2125LinesV2026 } from "./t2125";
import type { TaxLineEntry, TaxLineYearRead } from "./types";

export const taxLinesCatalogV2026 = {
  version: "v2026",
  jurisdiction: "Canada",
  lastVerified: "2026-10-10",
  entries: t2125LinesV2026,
} as const;

/** The catalog entry a figure kind is kept under, or undefined for a kind that isn't a form line. */
export function taxLineEntryForKind(kind: string): TaxLineEntry | undefined {
  return taxLinesCatalogV2026.entries.find((e) => e.figureKind === kind);
}

/**
 * The line for one tax year, only if a person has read that year's form. Never falls back to
 * another year's number: a form can renumber a line, so an unread year is "not read yet".
 */
export function taxLineForYear(entry: TaxLineEntry, taxYear: number): TaxLineYearRead | undefined {
  return entry.yearsRead.find((y) => y.taxYear === taxYear);
}

/** The newest year read for this line (every entry has at least one; the integrity test checks). */
export function newestYearRead(entry: TaxLineEntry): TaxLineYearRead {
  return entry.yearsRead.reduce((a, b) => (b.taxYear > a.taxYear ? b : a));
}
