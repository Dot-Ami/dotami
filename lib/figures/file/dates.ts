/**
 * [8c] Reading a date out of one spreadsheet cell.
 *
 * The rule throughout: return a calendar day only when it is certain. "03/04/2026" could be March
 * 4th or April 3rd; unless the person has said which (or another date in the column proves it),
 * we return null and the caller asks — a month filed under the wrong name is a wrong figure
 * about someone's income. The day is always the one WRITTEN in the cell; a time zone never
 * moves it ("2026-03-31T23:30:00-07:00" is March 31st).
 *
 * A two-digit year ("12-03-05") is read only once the person has said which century it is in
 * (the screen asks "Is 05 the year 2005?"). Without that answer it is not a date. The year is
 * always taken to be the LAST number of a numeric date, as in Sage 50's and FreshBooks' short
 * dates; a file written yy-mm-dd would be misread, which is why the screen shows the earliest and
 * latest date it read, in words, for the person to check.
 */
import { isRealCalendarDay } from "../validate";
import type { Cell, Century, DateOrder } from "./types";

/** Excel's 1900 date system: serial 25569 is 1970-01-01 and 73050 is 2099-12-31. */
const SERIAL_MIN = 25569;
const SERIAL_MAX = 73050;
/** Serial 0 of the 1900 system, as it behaves for every date after Feb 1900 (Excel's leap-year bug included). */
const SERIAL_ZERO_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

/**
 * An Excel date number ("45658") as a calendar day, or null if it falls outside 1970–2099 (a
 * plain number like 2026 or 12.5 is far more likely to be an amount or a count than a date).
 * The fraction is the time of day and is ignored.
 */
export function excelSerialToDay(serial: number): string | null {
  if (typeof serial !== "number" || !Number.isFinite(serial)) return null;
  const whole = Math.floor(serial);
  if (whole < SERIAL_MIN || whole > SERIAL_MAX) return null;
  const day = new Date(SERIAL_ZERO_MS + whole * MS_PER_DAY).toISOString().slice(0, 10);
  return isRealCalendarDay(day) ? day : null;
}

/** Month names in English and French, accents removed (the text is normalised the same way before lookup). */
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  janv: 1,
  janvier: 1,
  feb: 2,
  february: 2,
  fevr: 2,
  fevrier: 2,
  mar: 3,
  march: 3,
  mars: 3,
  apr: 4,
  april: 4,
  avr: 4,
  avril: 4,
  may: 5,
  mai: 5,
  jun: 6,
  june: 6,
  juin: 6,
  jul: 7,
  july: 7,
  juil: 7,
  juillet: 7,
  aug: 8,
  august: 8,
  aout: 8,
  sep: 9,
  sept: 9,
  september: 9,
  septembre: 9,
  oct: 10,
  october: 10,
  octobre: 10,
  nov: 11,
  november: 11,
  novembre: 11,
  dec: 12,
  december: 12,
  decembre: 12,
};

/**
 * A month name or abbreviation (already lower-cased and without accents: "aout", "janv") as its
 * number, 1 to 12; null for any other word. The same English and French list the dates use.
 */
export function monthNumber(word: string): number | null {
  return Object.prototype.hasOwnProperty.call(MONTHS, word) ? MONTHS[word] : null;
}

/** A time written after the date (and an optional zone / AM-PM): dropped, never applied. */
const TRAILING_TIME =
  /^(.*?\d)[ T]+\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:\s?(?:Z|[+-]\d{2}:?\d{2}|[AP]M))?$/i;

/** 2026-03-31, 2026/3/31, 2026.03.31 — the same separator twice. */
const YEAR_FIRST = /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})$/;
/**
 * 03/04/2026, 3-4-2026, 03.04.2026 — which number is the month is the open question. The year has
 * four digits or two (12-03-05, 06.07.26); two need the person's answer about the century.
 */
const NUMERIC_SHAPE = /^(\d{1,2})([-/.])(\d{1,2})\2(\d{4}|\d{2})$/;
/** 5 March 2026, 5-Mar-2026, 1er mars 2026, and Excel's 5-Mar-05 */
const DAY_MONTH_NAME = /^(\d{1,2}|1er)[\s-]+([a-z]+)\.?[\s-]+(\d{4}|\d{2})$/;
/** March 5, 2026 / Mar 5 2026, and Sage 50's long date, Nov 12, 05 */
const MONTH_NAME_DAY = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4}|\d{2})$/;

/** Month names as the preview writes them back to the person ("3 December 2005"). */
const MONTH_WORDS = [
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

function stripTime(text: string): string {
  const match = text.trim().match(TRAILING_TIME);
  return match ? match[1] : text.trim();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * The year as a number: four digits as written, two digits in the century the person chose. Null
 * for two digits with no answer — DotAmi never picks the century itself.
 */
function yearOf(written: string, century: Century | null): number | null {
  if (written.length === 4) return Number(written);
  return century === null ? null : century + Number(written);
}

/**
 * Lower-cases text and drops accents, so "Août" and "AOUT" look the same. Exported for the
 * months-across reader (across.ts), which reads month names the same way.
 */
export function plainText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Builds YYYY-MM-DD and rejects days that don't exist ("2026-02-30"). */
function makeDay(year: number, month: number, day: number): string | null {
  const text = `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
  return isRealCalendarDay(text) ? text : null;
}

/** The two numbers of an A/B/YYYY (or A/B/YY) date, or null when the text isn't that shape. */
function numericParts(text: string): { a: number; b: number } | null {
  const match = stripTime(text).match(NUMERIC_SHAPE);
  if (!match) return null;
  return { a: Number(match[1]), b: Number(match[3]) };
}

/**
 * The year exactly as a date cell writes it ("2026", or "05" in 12-03-05), or null when the text
 * isn't one of the shapes that put the year last. Says nothing about whether the day is real.
 */
function writtenYear(raw: string): string | null {
  const text = stripTime(raw);
  const numeric = text.match(NUMERIC_SHAPE);
  if (numeric) return numeric[4];
  const plain = plainText(text);
  const dayFirst = plain.match(DAY_MONTH_NAME);
  if (dayFirst && MONTHS[dayFirst[2]] !== undefined) return dayFirst[3];
  const monthFirst = plain.match(MONTH_NAME_DAY);
  if (monthFirst && MONTHS[monthFirst[1]] !== undefined) return monthFirst[3];
  return null;
}

function stringToDay(raw: string, order: DateOrder | null, century: Century | null): string | null {
  const text = stripTime(raw);
  if (text.length === 0) return null;

  const iso = text.match(YEAR_FIRST);
  if (iso) return makeDay(Number(iso[1]), Number(iso[3]), Number(iso[4]));

  const numeric = text.match(NUMERIC_SHAPE);
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[3]);
    const year = yearOf(numeric[4], century);
    if (year === null) return null;
    if (order === "mdy") return makeDay(year, a, b);
    if (order === "dmy") return makeDay(year, b, a);
    // No order given: only a number above 12 (or two equal numbers) settles it.
    if (a === b) return makeDay(year, a, b);
    if (a > 12) return makeDay(year, b, a);
    if (b > 12) return makeDay(year, a, b);
    return null;
  }

  // Month names: lower-case and drop accents so "Août" and "AOUT" look the same.
  const plain = plainText(text);

  const dayFirst = plain.match(DAY_MONTH_NAME);
  if (dayFirst) {
    const month = MONTHS[dayFirst[2]];
    const year = yearOf(dayFirst[3], century);
    if (month === undefined || year === null) return null;
    return makeDay(year, month, parseInt(dayFirst[1], 10));
  }

  const monthFirst = plain.match(MONTH_NAME_DAY);
  if (monthFirst) {
    const month = MONTHS[monthFirst[1]];
    const year = yearOf(monthFirst[3], century);
    if (month === undefined || year === null) return null;
    return makeDay(year, month, Number(monthFirst[2]));
  }

  // Bare numbers, a two-digit year with no answer, anything else: not a date we can be sure of.
  return null;
}

/**
 * One cell as a calendar day (YYYY-MM-DD), or null if it isn't a date we can read with
 * certainty. `order` says how 03/04/2026 is written; null means "unknown", in which case only
 * unambiguous dates come back. `century` is the person's answer for a two-digit year; null (the
 * default) leaves every two-digit year unread.
 */
export function cellToDay(
  cell: Cell,
  order: DateOrder | null,
  century: Century | null = null,
): string | null {
  if (cell instanceof Date) {
    // The readers hand over UTC midnight of the day Excel shows, so the UTC day is the day.
    if (Number.isNaN(cell.getTime())) return null;
    const day = cell.toISOString().slice(0, 10);
    return isRealCalendarDay(day) ? day : null;
  }
  if (typeof cell === "number") return excelSerialToDay(cell);
  if (typeof cell === "string") return stringToDay(cell, order, century);
  return null; // boolean, null
}

/**
 * The first two-digit year in a date column, exactly as written ("05" for 12-03-05), or null when
 * every date there has a four-digit year (or is an Excel date). The screen asks about this one
 * year — "Is 05 the year 2005?" — and the answer is used for every two-digit year in the column.
 * A cell counts only if it would be a real day in some order once the century is known, so
 * "99-99-26" or a reference number never triggers the question.
 */
export function firstTwoDigitYear(cells: Cell[]): string | null {
  for (const cell of cells) {
    if (typeof cell !== "string") continue;
    const year = writtenYear(cell);
    if (year === null || year.length !== 2) continue;
    const readable = ([null, "mdy", "dmy"] as const).some((order) =>
      ([2000, 1900] as const).some((century) => stringToDay(cell, order, century) !== null),
    );
    if (readable) return year;
  }
  return null;
}

/**
 * A day written the way a person says it: "2005-12-03" is "3 December 2005". Anything that isn't a
 * real YYYY-MM-DD day comes back unchanged, so a bad value is shown as it is, never hidden.
 */
export function dayInWords(day: string): string {
  if (!isRealCalendarDay(day)) return day;
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTH_WORDS[month - 1]} ${year}`;
}

/**
 * A month written the way a person says it: "2026-07" is "July 2026". Anything that isn't a real
 * YYYY-MM month comes back unchanged, so a bad value is shown as it is, never hidden.
 */
export function monthInWords(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month) || !isRealCalendarDay(`${month}-01`)) return month;
  return `${MONTH_WORDS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
}

/**
 * Works out whether a column's A/B/YYYY dates are month-first or day-first from the dates
 * themselves: a first number above 12 can only be a day, a second number above 12 can only be a
 * day too. A/B/YY dates (12-03-05) give the same proof, whatever century they turn out to be in,
 * so the order is settled before the century is asked. Never guesses — with no proof either way
 * it says `ambiguous` so the caller asks the person once, and with proof both ways it says
 * `conflicting`.
 */
export function detectDateOrder(cells: Cell[]): {
  order: DateOrder | null;
  ambiguous: boolean;
  conflicting: boolean;
} {
  let sawShape = false;
  let dayFirstProof = false;
  let monthFirstProof = false;
  let sawDifferent = false;

  for (const cell of cells) {
    if (typeof cell !== "string") continue;
    const parts = numericParts(cell);
    if (!parts) continue;
    sawShape = true;
    if (parts.a > 12) dayFirstProof = true;
    if (parts.b > 12) monthFirstProof = true;
    if (parts.a !== parts.b) sawDifferent = true;
  }

  if (dayFirstProof && monthFirstProof) return { order: null, ambiguous: false, conflicting: true };
  if (dayFirstProof) return { order: "dmy", ambiguous: false, conflicting: false };
  if (monthFirstProof) return { order: "mdy", ambiguous: false, conflicting: false };
  // Nothing of that shape, or only dates like 05/05/2026 that read the same either way: nothing to ask.
  if (!sawShape || !sawDifferent) return { order: null, ambiguous: false, conflicting: false };
  return { order: null, ambiguous: true, conflicting: false };
}
