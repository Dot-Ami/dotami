/**
 * [8e] How old a figure is, and what "today" is for the person.
 *
 * Two rules keep this file honest:
 *
 * 1. A calendar day is text, "2026-03-31", and stays text. Nothing here builds a Date from a day
 *    string: `new Date("2026-03-31")` is midnight UTC, which formats as March 30 for anyone west
 *    of Greenwich. Day arithmetic uses plain numbers; the only Date helpers are `localDay` and
 *    `msUntilLocalMidnight`, which start from a real moment in time on purpose.
 * 2. No number is invented. "Old" is never a cut-off chosen here — an age is just the distance
 *    from the figure's own last day to the person's own today.
 *
 * Pure and free of imports, so the rules engine (lib/brain) and the screens can both use it.
 */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface Day {
  y: number;
  m: number; // 1–12
  d: number;
}

/** Last day of a month (m is 1–12) — calendar arithmetic, no time zones involved. */
export function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Reads "2026-03-31"; null for anything else, including a day that isn't on the calendar. */
export function parseDay(day: string): Day | null {
  const parts = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const parsed = { y: Number(parts[1]), m: Number(parts[2]), d: Number(parts[3]) };
  if (parsed.m < 1 || parsed.m > 12 || parsed.d < 1 || parsed.d > lastDayOfMonth(parsed.y, parsed.m)) return null;
  return parsed;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The person's own calendar day for a moment in time: "2026-04-01T06:30:00Z" is 2026-03-31 in
 * Vancouver, where it is 11:30 p.m. Pass a `timeZone` to ask about another zone (tests do);
 * left out, it is the computer's own, which in the desktop app is the person's.
 *
 * Returns null when the moment or the zone can't be read, so a bad timestamp leaves a blank
 * where a date would go instead of breaking the screen.
 */
export function localDay(instant: string | number | Date, timeZone?: string): string | null {
  const when = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(when.getTime())) return null;
  try {
    // en-CA with the Gregorian calendar and Latin digits, so the parts below are always
    // plain numbers whatever language the computer is set to.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(when);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const [y, m, d] = [get("year"), get("month"), get("day")];
    return y && m && d ? `${y}-${m}-${d}` : null;
  } catch {
    // An unknown time zone name.
    return null;
  }
}

/** The person's day right now. */
export function localToday(now: Date = new Date(), timeZone?: string): string {
  // `now` is a real Date, so this is null only if the zone name is bad; fall back to UTC's day.
  return localDay(now, timeZone) ?? now.toISOString().slice(0, 10);
}

/** True when a period's last day is after today. A period that ends today is not in the future. */
export function isFuture(periodEnd: string, today: string): boolean {
  // Zero-padded ISO days compare correctly as text.
  return periodEnd > today;
}

/** Days since a fixed origin, by calendar rules only (UTC has no clock changes). */
function dayNumber(day: Day): number {
  return Date.UTC(day.y, day.m - 1, day.d) / 86_400_000;
}

/** Whole calendar days from `fromDay` to `toDay`; negative when `toDay` is earlier. */
export function daysBetween(fromDay: string, toDay: string): number {
  const from = parseDay(fromDay);
  const to = parseDay(toDay);
  if (!from || !to) return Number.NaN;
  return dayNumber(to) - dayNumber(from);
}

/**
 * Whole calendar months from `fromDay` to `toDay` (negative when `toDay` is earlier): how many
 * times the same day-of-month has come round. A 31st lands on the last day of a shorter month,
 * so March 31 to April 30 is 1 and January 31 to February 28 is 1 — a period's last day always
 * counts as the month's end. Dividing a day count by 30 would get both wrong.
 */
export function monthsBetween(fromDay: string, toDay: string): number {
  if (fromDay > toDay) return -monthsBetween(toDay, fromDay);
  const from = parseDay(fromDay);
  const to = parseDay(toDay);
  if (!from || !to) return Number.NaN;
  const months = (to.y - from.y) * 12 + (to.m - from.m);
  // Has this month's "same day" come yet? A 31st is due on a short month's last day.
  const dueDay = Math.min(from.d, lastDayOfMonth(to.y, to.m));
  return to.d < dueDay ? months - 1 : months;
}

// "Last month", "yesterday", "in 3 months" come from the browser's own Intl data. The words
// around them ("ended", "ends") are English only for now: a second language needs whole
// sentence templates per language, not a word glued to Intl's output ([11j]).
const RELATIVE = new Intl.RelativeTimeFormat("en-CA", { numeric: "auto" });

/**
 * How long ago a period's last day was, as a whole sentence: "ended 6 months ago", "ended last
 * month", "ended 12 days ago", "ends today", "ends in 25 days". Months are whole calendar
 * months; under a month it counts days. Empty when either day can't be read.
 */
export function describeAge(periodEnd: string, today: string): string {
  if (!parseDay(periodEnd) || !parseDay(today)) return "";
  if (periodEnd === today) return "ends today";
  if (isFuture(periodEnd, today)) {
    const months = monthsBetween(today, periodEnd);
    return months >= 1
      ? `ends ${RELATIVE.format(months, "month")}`
      : `ends ${RELATIVE.format(daysBetween(today, periodEnd), "day")}`;
  }
  const months = monthsBetween(periodEnd, today);
  return months >= 1
    ? `ended ${RELATIVE.format(-months, "month")}`
    : `ended ${RELATIVE.format(-daysBetween(periodEnd, today), "day")}`;
}

/**
 * The line under a figure: "ended 6 months ago · agreed 2026-10-06". The agreed day is the
 * person's own (see `localDay`), and is left out for a figure that hasn't been agreed to yet.
 */
export function describeFigureDates(periodEnd: string, today: string, confirmedAt: string | null, timeZone?: string): string {
  const agreed = confirmedAt ? localDay(confirmedAt, timeZone) : null;
  return [describeAge(periodEnd, today), agreed ? `agreed ${agreed}` : ""].filter(Boolean).join(" · ");
}

/** The flag on a period that ends after today — the figure stays listed, no card counts it. */
export function describeFuture(periodEnd: string, today: string): string {
  return `Check this date. This period ends after today (${periodEnd} is later than ${today}), so no card counts it until it has ended.`;
}

export type Cadence = "monthly" | "quarterly" | "yearly";

export interface DayPeriod {
  start: string;
  end: string;
  /** "September 2026", "July to September 2026" or "2025". */
  label: string;
}

/**
 * The month, calendar quarter or year that most recently ended. A period has ended once today is
 * past its last day, so on the last day of September it is still August that is the latest
 * finished month, and on October 1 it is September.
 */
export function lastEndedPeriod(today: string, cadence: Cadence): DayPeriod {
  const t = parseDay(today);
  if (!t) throw new Error("lastEndedPeriod needs a day written YYYY-MM-DD.");

  if (cadence === "yearly") {
    const y = t.y - 1;
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: String(y) };
  }

  // Months counted from year 0, so stepping back across a year end is plain subtraction.
  const span = cadence === "monthly" ? 1 : 3;
  const index = t.y * 12 + (t.m - 1);
  const firstIndex = index - (index % span) - span;
  const lastIndex = firstIndex + span - 1;
  const [y1, m1] = [Math.floor(firstIndex / 12), (firstIndex % 12) + 1];
  const [y2, m2] = [Math.floor(lastIndex / 12), (lastIndex % 12) + 1];
  return {
    start: `${y1}-${pad(m1)}-01`,
    end: `${y2}-${pad(m2)}-${pad(lastDayOfMonth(y2, m2))}`,
    label: span === 1 ? `${MONTH_NAMES[m1 - 1]} ${y1}` : `${MONTH_NAMES[m1 - 1]} to ${MONTH_NAMES[m2 - 1]} ${y2}`,
  };
}

/**
 * Milliseconds from `now` until the wall clock next reads 00:00. Worked out from the clock (a
 * local midnight can be 23 or 25 hours away on a clock-change day), so a window left open can
 * wake up exactly when the person's day turns over instead of polling.
 */
export function msUntilLocalMidnight(now: Date): number {
  // The Date constructor with parts reads them as the computer's own wall-clock time.
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return nextMidnight.getTime() - now.getTime();
}
