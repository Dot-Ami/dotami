/**
 * [8g] Which calendar months a statement covers in full.
 *
 * A month total from a statement is only true if the statement holds EVERY transaction of that
 * month. A download that starts on January 15th has half of January in it; a total made from that
 * half would understate the person's income and nothing on screen would look wrong. So a month is
 * proposed only when its first and last day both lie inside what was downloaded — and when the
 * file can't settle the last day (an end date written without a time), the month is asked about,
 * never assumed complete.
 *
 * Pure date arithmetic on YYYY-MM-DD text; no clock, no time zones (a day is the day as written).
 */
import { isRealCalendarDay } from "../validate";
import type { CoverageRange, DaySpan } from "./types";

const MS_PER_DAY = 86_400_000;
const MONTH_SHAPE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** True for a real month written exactly YYYY-MM. */
export function isRealMonth(text: unknown): text is string {
  return typeof text === "string" && MONTH_SHAPE.test(text);
}

/** "2026-03-31" → "2026-03". */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

/** The last day of a YYYY-MM month, written YYYY-MM-DD (leap years included). */
export function lastDayOfMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** A real day moved by a whole number of days: shiftDay("2026-03-01", -1) is "2026-02-28". */
export function shiftDay(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** The months from `first`'s month to `last`'s month, both included: the list "Which months did you download in full?" offers. */
export function monthsBetween(first: string, last: string): string[] {
  if (!isRealCalendarDay(first) || !isRealCalendarDay(last) || first > last) return [];
  const months: string[] = [];
  let year = Number(first.slice(0, 4));
  let m = Number(first.slice(5, 7));
  const endYear = Number(last.slice(0, 4));
  const endMonth = Number(last.slice(5, 7));
  while (year < endYear || (year === endYear && m <= endMonth)) {
    months.push(`${year}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * The months the person says they downloaded in full, as coverage. A CSV has no start and end
 * dates of its own, so the only honest source is the person's answer. Anything that isn't a real
 * YYYY-MM is ignored (it covers nothing), and repeats collapse to one.
 */
export function coverageFromMonths(months: readonly string[]): CoverageRange[] {
  return [...new Set(months.filter(isRealMonth))]
    .sort()
    .map((month) => ({ from: firstDayOfMonth(month), to: lastDayOfMonth(month) }));
}

/** The first and last day that have a row, or null when no row has a real day. Order doesn't matter. */
export function spanOfRows(rows: readonly { day: string }[]): DaySpan | null {
  let first: string | null = null;
  let last: string | null = null;
  for (const { day } of rows) {
    if (!isRealCalendarDay(day)) continue;
    if (first === null || day < first) first = day;
    if (last === null || day > last) last = day;
  }
  return first === null || last === null ? null : { first, last };
}

/**
 * The first pair of files (by position in `spans`) that have rows on a day in common, or null.
 * A shared day counts, even a single one: two CSV rows that look the same could be the same
 * transaction downloaded twice or two real sales, and a CSV has no id to tell them apart.
 */
export function firstOverlap(spans: readonly DaySpan[]): [number, number] | null {
  const order = spans.map((_, i) => i).sort((a, b) => spans[a].first.localeCompare(spans[b].first));
  let reach: number | null = null; // the file seen so far that runs the furthest
  for (const i of order) {
    if (reach !== null && spans[i].first <= spans[reach].last) {
      return [Math.min(reach, i), Math.max(reach, i)];
    }
    if (reach === null || spans[i].last > spans[reach].last) reach = i;
  }
  return null;
}

/** Said to the person when two files overlap. Carries no date or amount. */
export const OVERLAPPING_FILES_MESSAGE =
  "These files have transactions on some of the same days. A repeated row could be the same transaction downloaded twice or two real sales, and DotAmi won't guess which. Download them again so their dates don't overlap.";

/** Whether a month is covered in full by the statement(s), and if not, why. */
export type MonthCoverage = "complete" | "end-day-unsure" | "partial";

interface Span {
  from: string;
  to: string;
}

/**
 * Turns coverage into a checker for one month at a time. The ranges are merged first, so two
 * downloads that meet (January 1–15 and January 16–31) cover January together, as do two that
 * overlap. A range with an unsure end only counts up to the day BEFORE its `to`: that last day is
 * remembered separately, and no neighbouring range can vouch for it unless it covers that day
 * itself (an OFX file that starts on the 1st says nothing about what the previous one held back).
 *
 * A range that isn't two real days in order covers nothing — the safe direction, since less
 * coverage can only mean fewer months proposed.
 */
export function coverageChecker(
  coverage: readonly CoverageRange[],
): (month: string) => MonthCoverage {
  const unsureDays = new Set<string>();
  const sure: Span[] = [];
  for (const range of coverage) {
    if (!isRealCalendarDay(range.from) || !isRealCalendarDay(range.to) || range.from > range.to)
      continue;
    if (range.toIsUnsure) {
      unsureDays.add(range.to);
      const through = shiftDay(range.to, -1);
      if (through >= range.from) sure.push({ from: range.from, to: through });
    } else {
      sure.push({ from: range.from, to: range.to });
    }
  }

  sure.sort((a, b) => a.from.localeCompare(b.from));
  const merged: Span[] = [];
  for (const span of sure) {
    const last = merged[merged.length - 1];
    // Overlapping, or starting the very next day: one stretch.
    if (last && span.from <= shiftDay(last.to, 1)) {
      if (span.to > last.to) last.to = span.to;
    } else {
      merged.push({ ...span });
    }
  }

  return (month) => {
    const first = firstDayOfMonth(month);
    const last = lastDayOfMonth(month);
    if (merged.some((s) => s.from <= first && s.to >= last)) return "complete";
    if (unsureDays.has(last) && merged.some((s) => s.from <= first && s.to >= shiftDay(last, -1))) {
      return "end-day-unsure";
    }
    return "partial";
  };
}
