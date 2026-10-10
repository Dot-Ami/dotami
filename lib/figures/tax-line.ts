/**
 * [8f] A tax-form figure and the CRA line it goes on, in words for the screens.
 *
 * The line comes from the cited catalog (lib/engines/taxlines/) for the figure's own tax year, and
 * only for a year a person has read. For any other year the words say "not read yet" rather than
 * borrow the nearest year's number, since the CRA can renumber a line. When the figure was read
 * from a return, the form and line printed on that return (`formLine`) are shown as they were read.
 */

import { newestYearRead, taxLineEntryForKind, taxLineForYear } from "@/lib/engines/taxlines/v2026";
import type { TaxLineEntry } from "@/lib/engines/taxlines/v2026";

import type { FigureKind } from "./types";

export type TaxLineStatus =
  | { status: "read"; form: string; line: string; printedLabel: string; taxYear: number; lastVerified: string }
  | { status: "not-read-yet"; form: string; taxYear: number; yearsRead: number[] };

/** True for the kinds that are a line on a tax form (the four T2125 totals). */
export function isTaxLineKind(kind: string): boolean {
  return taxLineEntryForKind(kind) !== undefined;
}

/** "2025", "2024 and 2025", "2023, 2024 and 2025". */
function yearList(years: number[]): string {
  const sorted = [...years].sort((a, b) => a - b).map(String);
  return sorted.length <= 1 ? sorted.join("") : `${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`;
}

/** What the catalog knows of this kind's line in this tax year; undefined for a kind that isn't a form line. */
export function taxLineStatus(kind: string, taxYear: number): TaxLineStatus | undefined {
  const entry = taxLineEntryForKind(kind);
  if (!entry) return undefined;
  const year = taxLineForYear(entry, taxYear);
  if (!year) {
    return { status: "not-read-yet", form: entry.form, taxYear, yearsRead: entry.yearsRead.map((y) => y.taxYear) };
  }
  return {
    status: "read",
    form: entry.form,
    line: year.line,
    printedLabel: year.printedLabel,
    taxYear,
    // The first citation is always the form itself (tests/engine-integrity.spec.ts checks).
    lastVerified: year.citations[0].lastVerified,
  };
}

/** "Business gross income (T2125), line 8299": the kind's name with its newest line, for the "What" list. */
export function kindWithNewestLine(kind: FigureKind, label: string): string {
  const entry: TaxLineEntry | undefined = taxLineEntryForKind(kind);
  if (!entry) return label;
  return `${label}, line ${newestYearRead(entry).line}`;
}

/**
 * The sentence under "Tax year" in Add a figure, for a four-digit year: which line it goes on, or
 * that the year's form hasn't been read yet and what happens to the figure then.
 */
export function taxYearHint(kind: string, taxYear: number): string | undefined {
  const s = taxLineStatus(kind, taxYear);
  if (!s) return undefined;
  if (s.status === "read") {
    return `Line ${s.line} on the CRA's ${s.taxYear} ${s.form} ("${s.printedLabel}"), read ${s.lastVerified}.`;
  }
  return `${s.taxYear}: not read yet. DotAmi has read the CRA's ${s.form} for ${yearList(s.yearsRead)} only, so this figure is kept with its tax year and no line number until that year's form is read.`;
}

/** "T2125 8299" as stored, shown as "T2125 line 8299". */
function formLineWords(formLine: string): string {
  const [form, line] = formLine.split(" ");
  return line ? `${form} line ${line}` : formLine;
}

/**
 * The short line beside a figure in the lists and the agree prompt:
 *   "tax year 2025 · T2125 line 8299"
 *   "tax year 2025 · T2125 line 8299 as printed on your return" (read from a return)
 *   "tax year 2023 · T2125 line not read yet"
 * Undefined for a kind that isn't a form line, or one without a tax year.
 */
export function taxLineWords(figure: { kind: string; taxYear: number | null; formLine: string | null }): string | undefined {
  if (figure.taxYear === null || !isTaxLineKind(figure.kind)) return undefined;
  if (figure.formLine) return `tax year ${figure.taxYear} · ${formLineWords(figure.formLine)} as printed on your return`;
  const s = taxLineStatus(figure.kind, figure.taxYear)!;
  return s.status === "read"
    ? `tax year ${s.taxYear} · ${s.form} line ${s.line}`
    : `tax year ${s.taxYear} · ${s.form} line not read yet`;
}
