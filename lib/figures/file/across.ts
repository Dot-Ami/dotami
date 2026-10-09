/**
 * [8c-3] Reports with the months across the top: one column per month, one row per client or
 * line, as in FreshBooks' Revenue by Client. Everything else in lib/figures/file reads "one row per
 * sale, with a date"; here the date is in the column's NAME ("Jul 2026"), and each month's total is
 * the cells under that name added up (or one row of them, such as the report's own Total row).
 *
 * The rule is the same as for dates: a column counts as a month only when its name says which
 * month and which year with certainty. A name that looks like a month but doesn't say the year
 * ("Jul", "Jul 26") or names a day ("2026-07-15") is never guessed: the preview refuses the table
 * and says which column, so a month can't quietly land in the wrong year.
 *
 * Pure and in memory, like the rest: nothing here logs, keeps or sends a cell, and no message
 * built from it carries a cell's text or an amount.
 */
import { cellToCents } from "./amounts";
import { cellToDay, firstTwoDigitYear, monthNumber, plainText } from "./dates";
import { isBlankRow } from "./table";
import { lastDayOfMonth, TOTAL_ROW_LABEL, unsavedFormulaLookup } from "./totals";
import type {
  AcrossResult,
  Cell,
  CellPlace,
  DecimalStyle,
  MonthColumn,
  MonthTotal,
} from "./types";

/** How far down a sheet the month names are looked for; the same window as the column names. */
const MONTHS_ROW_SEARCH = 30;
/** How far below the month names a readable amount must appear for the row to be guessed. */
const AMOUNT_LOOKAHEAD_ROWS = 50;
/** Widest row read for month names; the same cap as the column pickers. */
const MAX_COLUMNS = 200;
/** Years a month name may carry. A four-digit number outside these is more likely an id than a year. */
const FIRST_YEAR = 1900;
const LAST_YEAR = 2099;

/**
 * What a column's name says, read as a month:
 *   month        — a month and a year DotAmi is sure of ("Jul 2026", "juillet 2026", "2026-07")
 *   unclear      — it looks like a month or a date but doesn't say exactly one month: no year, a
 *                  two-digit year, or a whole day. Refused, never guessed.
 *   not-a-month  — anything else ("Client", "Total", a blank)
 */
export type MonthHeader = { kind: "month"; month: string } | { kind: "unclear" } | { kind: "not-a-month" };

const NOT_A_MONTH: MonthHeader = { kind: "not-a-month" };
const UNCLEAR: MonthHeader = { kind: "unclear" };

/** "Jul 2026", "July 2026", "janv. 2026", "Jul-2026", "Sept/2026" */
const NAME_THEN_YEAR = /^([a-z]+)\.?[\s,/-]*(\d{4})$/;
/** "2026 Jul", "2026-July" */
const YEAR_THEN_NAME = /^(\d{4})[\s,/-]+([a-z]+)\.?$/;
/** "2026-07", "2026/7", "2026.07" */
const YEAR_THEN_NUMBER = /^(\d{4})[-/.](\d{1,2})$/;
/** "07/2026", "7-2026", "07.2026" */
const NUMBER_THEN_YEAR = /^(\d{1,2})[-/.](\d{4})$/;
/** "07/26", "7-26": a month and a two-digit year, or a day and a month. Either way, not sure. */
const SHORT_NUMBERS = /^\d{1,2}[-/.]\d{2}$/;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYY-MM for a month number and a year, or null when either is out of range. */
function makeMonth(year: number, month: number | null): string | null {
  if (month === null || month < 1 || month > 12) return null;
  if (year < FIRST_YEAR || year > LAST_YEAR) return null;
  return `${year}-${pad(month)}`;
}

/** True when some whole word in plain text is a month name ("jul", "aout", "sept"). */
function mentionsMonthName(plain: string): boolean {
  return (plain.match(/[a-z]+/g) ?? []).some((word) => word.length >= 3 && monthNumber(word) !== null);
}

/** One header cell read as a month (see MonthHeader). */
export function readMonthHeader(cell: Cell | undefined): MonthHeader {
  if (cell instanceof Date) {
    if (Number.isNaN(cell.getTime())) return NOT_A_MONTH;
    // A month column saved as a real Excel date is the 1st of the month. Any other day is a day,
    // not a month, and a daily or weekly report is not something to add up by month here.
    const day = cell.toISOString().slice(0, 10);
    if (cell.getUTCDate() !== 1) return UNCLEAR;
    const month = makeMonth(Number(day.slice(0, 4)), Number(day.slice(5, 7)));
    return month ? { kind: "month", month } : UNCLEAR;
  }
  // A number in the month names row is a year, a count or an id; booleans and blanks are nothing.
  if (typeof cell !== "string") return NOT_A_MONTH;

  const plain = plainText(cell).replace(/\s+/g, " ").trim();
  if (plain === "") return NOT_A_MONTH;

  const nameFirst = plain.match(NAME_THEN_YEAR);
  if (nameFirst && monthNumber(nameFirst[1]) !== null) {
    const month = makeMonth(Number(nameFirst[2]), monthNumber(nameFirst[1]));
    return month ? { kind: "month", month } : UNCLEAR;
  }
  const yearFirst = plain.match(YEAR_THEN_NAME);
  if (yearFirst && monthNumber(yearFirst[2]) !== null) {
    const month = makeMonth(Number(yearFirst[1]), monthNumber(yearFirst[2]));
    return month ? { kind: "month", month } : UNCLEAR;
  }
  const yearNumber = plain.match(YEAR_THEN_NUMBER);
  if (yearNumber) {
    const month = makeMonth(Number(yearNumber[1]), Number(yearNumber[2]));
    return month ? { kind: "month", month } : UNCLEAR;
  }
  const numberYear = plain.match(NUMBER_THEN_YEAR);
  if (numberYear) {
    const month = makeMonth(Number(numberYear[2]), Number(numberYear[1]));
    return month ? { kind: "month", month } : UNCLEAR;
  }

  // Not a month DotAmi can be sure of. If it still looks like one (a month's name, a date, 07/26),
  // say so, so the preview can refuse the table instead of quietly leaving that column out.
  const looksLikeADate =
    cellToDay(cell, null) !== null ||
    cellToDay(cell, "mdy") !== null ||
    cellToDay(cell, "dmy") !== null ||
    firstTwoDigitYear([cell]) !== null;
  if (looksLikeADate || mentionsMonthName(plain) || SHORT_NUMBERS.test(plain)) return UNCLEAR;
  return NOT_A_MONTH;
}

/** What one row says when it is taken as the month names. */
export interface MonthsRowReading {
  /** Every column named as a month, left to right. */
  months: MonthColumn[];
  /** Columns whose names look like months or dates but don't name exactly one month. */
  unclear: number[];
  /** The first month named by more than one column, with those columns; null when none is. */
  repeated: { month: string; columns: number[] } | null;
}

/** Reads one row (0-based `monthsRow`) as the row of month names. */
export function readMonthsRow(rows: Cell[][], monthsRow: number): MonthsRowReading {
  const header = rows[monthsRow] ?? [];
  const months: MonthColumn[] = [];
  const unclear: number[] = [];
  for (let column = 0; column < Math.min(header.length, MAX_COLUMNS); column += 1) {
    const read = readMonthHeader(header[column]);
    if (read.kind === "month") months.push({ column, month: read.month });
    else if (read.kind === "unclear") unclear.push(column);
  }
  let repeated: MonthsRowReading["repeated"] = null;
  for (const { month } of months) {
    const columns = months.filter((m) => m.month === month).map((m) => m.column);
    if (columns.length > 1) {
      repeated = { month, columns };
      break;
    }
  }
  return { months, unclear, repeated };
}

function isEmptyCell(cell: Cell | undefined): boolean {
  return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
}

function readsAsAmount(cell: Cell | undefined): boolean {
  const value = cell ?? null;
  return cellToCents(value, "point") !== null || cellToCents(value, "comma") !== null;
}

/**
 * A label that is a total word and nothing else ("Total", "TOTAL:", "Grand total", "Sous-total",
 * "Total général"). TOTAL_ROW_LABEL also matches longer labels that start with one, which in a
 * months-across report can be a client's name ("Total Wine & More").
 */
const TOTAL_WORD_ALONE =
  /^\s*(?:grand[\s-]+total|sub[\s-]?total|sous[\s-]?total|total[\s-]+g[ée]n[ée]ral|totals|totaux|total)\s*[:.]?\s*$/iu;

/**
 * Running sums, per month column, of the rows counted since the report's last sum row. Used to tell
 * a sum row with a longer label ("Total for group A") from a client whose name starts with Total.
 */
class SinceLastSum {
  private sums = new Map<number, bigint>();
  /** Columns with a cell that couldn't be read since the last sum row: no sum is sure there. */
  private unsure = new Set<number>();
  private rows = 0;

  constructor(
    private readonly monthColumns: MonthColumn[],
    private readonly decimalStyle: DecimalStyle,
  ) {}

  add(row: Cell[]): void {
    for (const { column } of this.monthColumns) {
      const cell = row[column];
      if (isEmptyCell(cell)) continue;
      const cents = cellToCents(cell ?? null, this.decimalStyle);
      if (cents === null) this.unsure.add(column);
      else this.sums.set(column, (this.sums.get(column) ?? 0n) + BigInt(cents));
    }
    this.rows += 1;
  }

  /** True when every month cell of `row` is exactly what the rows since the last sum add up to. */
  matches(row: Cell[]): boolean {
    if (this.rows === 0) return false;
    return this.monthColumns.every(({ column }) => {
      if (this.unsure.has(column)) return false;
      const cell = row[column];
      const cents = isEmptyCell(cell) ? 0 : cellToCents(cell ?? null, this.decimalStyle);
      return cents !== null && BigInt(cents) === (this.sums.get(column) ?? 0n);
    });
  }

  reset(): void {
    this.sums.clear();
    this.unsure.clear();
    this.rows = 0;
  }
}

/**
 * The row holding the month names, as a first guess for the person to check: the first of the
 * first 30 rows with at least one column named as a month (and nothing that only looks like one),
 * with a readable amount under one of those months in the 50 rows below. Null when there is none.
 * The screen only offers this when no row of column names sits above a date (guessColumns), so a
 * file with a date on every row keeps its usual reading.
 */
export function guessMonthsRow(rows: Cell[][]): number | null {
  for (let r = 0; r < Math.min(MONTHS_ROW_SEARCH, rows.length); r += 1) {
    const reading = readMonthsRow(rows, r);
    if (reading.months.length === 0 || reading.unclear.length > 0) continue;
    const below = rows.slice(r + 1, r + 1 + AMOUNT_LOOKAHEAD_ROWS);
    if (below.some((row) => reading.months.some((m) => readsAsAmount(row[m.column])))) return r;
  }
  return null;
}

/** What the person told DotAmi about a months-across table (guessed first, always shown to check). */
export interface AcrossChoice {
  /** Index into `rows` of the row holding the month names. */
  monthsRow: number;
  /** The columns read as months from that row (readMonthsRow), with no unclear or repeated name. */
  monthColumns: MonthColumn[];
  /**
   * Null: every row under the month names is added up, down each month's column, leaving out the
   * report's own totals rows. A row index: only that row is taken, such as the report's Total row.
   */
  totalRow: number | null;
  decimalStyle: DecimalStyle;
}

/**
 * Adds up a months-across table into one total per month. Only months that have ended by `today`
 * (YYYY-MM-DD) are totalled; a month still running is listed whole as not over. Every cell under a
 * month is accounted for: added, in a row left out with its reason, or left out on its own.
 */
export function acrossTotals(
  rows: Cell[][],
  choice: AcrossChoice,
  today: string,
  unsavedFormulas: readonly CellPlace[] = [],
): AcrossResult {
  // Excel only: cells holding a formula saved with no value, which read as empty (totals.ts).
  const isUnsavedFormula = unsavedFormulaLookup(unsavedFormulas);
  const monthColumnSet = new Set(choice.monthColumns.map((m) => m.column));
  // ISO months compare correctly as text: a month that ends after today isn't over.
  const notOver = choice.monthColumns.filter((m) => lastDayOfMonth(m.month) > today);
  const ended = choice.monthColumns.filter((m) => lastDayOfMonth(m.month) <= today);

  // Blank rows after the last real row are just the sheet's trailing space, not part of the table.
  let lastRow = rows.length - 1;
  while (lastRow > choice.monthsRow && isBlankRow(rows[lastRow])) lastRow -= 1;

  const rowsToRead: number[] = [];
  if (choice.totalRow !== null) rowsToRead.push(choice.totalRow);
  else for (let i = choice.monthsRow + 1; i <= lastRow; i += 1) rowsToRead.push(i);

  const sums = new Map<string, { cents: bigint; rows: number }>();
  const skippedRows: AcrossResult["skippedRows"] = [];
  const skippedCells: AcrossResult["skippedCells"] = [];
  let rowsCounted = 0;
  // What the rows counted since the last sum row add up to, per month column: a row whose label
  // only STARTS with a total word is the file's own sum only when it holds exactly this.
  const sinceSum = new SinceLastSum(choice.monthColumns, choice.decimalStyle);

  for (const i of rowsToRead) {
    const row = rows[i] ?? [];
    if (isBlankRow(row)) {
      skippedRows.push({ row: i + 1, reason: "blank" });
      continue;
    }
    // Adding every row, the report's own sum row would count everything twice. The label sits
    // outside the month columns ("Total" under Client); a chosen row is taken whatever it says.
    // The word on its own ("Total", "Grand total:") is always the sum. A longer label that starts
    // with one ("Total for group A", but also a client called "Total Wine & More") is the sum only
    // when its amounts are exactly the rows above it, so a client is never dropped for its name.
    if (choice.totalRow === null) {
      const labels = row.filter(
        (cell, c): cell is string => !monthColumnSet.has(c) && typeof cell === "string",
      );
      const isSum =
        labels.some((cell) => TOTAL_WORD_ALONE.test(cell)) ||
        (labels.some((cell) => TOTAL_ROW_LABEL.test(cell)) && sinceSum.matches(row));
      if (isSum) {
        skippedRows.push({ row: i + 1, reason: "total" });
        sinceSum.reset();
        continue;
      }
    }
    // A row of unsaved formulas (a Total row whose sums Excel never worked out) isn't "nothing
    // under any month": each such cell is listed below for what it is.
    if (
      choice.monthColumns.every(
        (m) => isEmptyCell(row[m.column]) && !isUnsavedFormula(i, m.column),
      )
    ) {
      skippedRows.push({ row: i + 1, reason: "no-amount" });
      continue;
    }

    let added = false;
    for (const m of ended) {
      const cell = row[m.column];
      if (isEmptyCell(cell)) {
        const reason = isUnsavedFormula(i, m.column) ? "unsaved-formula" : "empty";
        skippedCells.push({ row: i + 1, column: m.column, reason });
        continue;
      }
      const cents = cellToCents(cell ?? null, choice.decimalStyle);
      if (cents === null) {
        skippedCells.push({ row: i + 1, column: m.column, reason: "bad-amount" });
        continue;
      }
      // BigInt, so a very long sheet can never silently lose a cent to floating point.
      const sum = sums.get(m.month) ?? { cents: 0n, rows: 0 };
      sum.cents += BigInt(cents);
      sum.rows += 1;
      sums.set(m.month, sum);
      added = true;
    }
    if (added) rowsCounted += 1;
    sinceSum.add(row);
  }

  const months: MonthTotal[] = [];
  for (const month of [...sums.keys()].sort()) {
    const sum = sums.get(month)!;
    const amount = Number(sum.cents);
    if (!Number.isSafeInteger(amount) || BigInt(amount) !== sum.cents) {
      throw new Error("A month's total is too large to hold exactly.");
    }
    months.push({
      periodStart: `${month}-01`,
      periodEnd: lastDayOfMonth(month),
      amountCents: amount,
      rows: sum.rows,
    });
  }

  const named = choice.monthColumns.map((m) => m.month).sort();
  const monthsRead = named.length > 0 ? { first: named[0], last: named[named.length - 1] } : null;
  return { months, rowsCounted, skippedRows, skippedCells, notOver, monthsRead };
}
