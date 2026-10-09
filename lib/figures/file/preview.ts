/**
 * [8c] What the "Add from a file" screen works out from a sheet, as functions the screen and the
 * tests both call (components/ventures/file-drop.tsx; tests/figures-file-packages.spec.ts).
 *
 * The steps: take the first sheet with anything in it, guess which row holds the column names and
 * which columns hold the dates and amounts, work out how the dates and amounts are written (asking
 * the person what the dates can't prove: the order of 03/04/2026, the century of 12-03-05), and
 * add up each month. They used to be repeated in a test helper, and a copy can drift from the
 * screen; now a test of a practice file runs the very code the screen runs.
 *
 * Everything here is pure: it reads rows already in memory. It touches no network and no disk,
 * logs nothing, and no message it builds carries a cell's text or an amount.
 *
 * The zip and XML readers are NOT imported at the top: the screen loads them only when a file is
 * picked, and previewFile does the same (a dynamic import).
 */
import { acrossTotals, guessMonthsRow, readMonthsRow } from "./across";
import { detectDecimalStyle } from "./amounts";
import { dayInWords, detectDateOrder, firstTwoDigitYear, monthInWords } from "./dates";
import { columnLetter, guessColumns, isBlankRow, sheetHasDates } from "./table";
import type { ColumnGuess } from "./table";
import { monthlyTotals } from "./totals";
import type {
  AcrossResult,
  Cell,
  CellPlace,
  Century,
  ColumnChoice,
  DateOrder,
  DecimalStyle,
  MonthColumn,
  Sheet,
  TotalsResult,
} from "./types";

/** Which row holds the column names and which columns hold the dates and amounts (null = not chosen). */
export interface Picks {
  headerRow: number | null;
  dateColumn: number | null;
  amountColumn: number | null;
  /**
   * The optional column of transaction types. Null leaves it unused, and then every row counts.
   * Pre-filled only for a header that is exactly "Transaction Type" or "Type" (see guessColumns).
   */
  typeColumn: number | null;
}

/** What the date column says about how its dates are written (see detectDateOrder). */
export type DateOrderReading = ReturnType<typeof detectDateOrder>;

/** True when a sheet has at least one row with something in it. */
export function sheetHasRows(sheet: Sheet): boolean {
  return sheet.rows.some((row) => !isBlankRow(row));
}

/** Index of the first sheet that has a row with something in it (0 when none does). */
export function firstSheetWithRows(sheets: Sheet[]): number {
  const first = sheets.findIndex(sheetHasRows);
  return first === -1 ? 0 : first;
}

/** The cells under the column names in one column (all of them, blank or not; callers skip what they don't need). */
export function columnCells(rows: Cell[][], headerRow: number, column: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = headerRow + 1; i < rows.length; i += 1) cells.push(rows[i][column] ?? null);
  return cells;
}

/**
 * A first guess at the table's columns. With `forcedHeader`, the person has said which row holds
 * the column names, so the guess only counts if that very row reads as column names; otherwise
 * nothing is pre-filled and they pick.
 *
 * `picks` is always whole: when there is no usable guess it holds the forced row (or null) and
 * empty columns. `guessed` says whether DotAmi pre-filled anything for the person to check.
 */
export function guessPicks(
  rows: Cell[][],
  forcedHeader?: number,
): { guess: ColumnGuess | null; picks: Picks; guessed: boolean } {
  const none: Picks = {
    headerRow: forcedHeader ?? null,
    dateColumn: null,
    amountColumn: null,
    typeColumn: null,
  };
  if (forcedHeader === undefined) {
    const guess = guessColumns(rows);
    if (!guess) return { guess, picks: none, guessed: false };
    return {
      guess,
      picks: {
        headerRow: guess.headerRow,
        dateColumn: guess.dateColumn,
        amountColumn: guess.amountColumn,
        typeColumn: guess.typeColumn,
      },
      guessed: true,
    };
  }
  // Looking from the chosen row down keeps every column index the same as in the whole sheet.
  const guess = guessColumns(rows.slice(forcedHeader));
  if (!guess || guess.headerRow !== 0) return { guess, picks: none, guessed: false };
  return {
    guess,
    picks: {
      headerRow: forcedHeader,
      dateColumn: guess.dateColumn,
      amountColumn: guess.amountColumn,
      typeColumn: guess.typeColumn,
    },
    // A forced row that gave no columns at all is not a guess worth announcing.
    guessed: guess.dateColumn !== null || guess.amountColumn !== null || guess.typeColumn !== null,
  };
}

/** What the person has answered on the screen about the dates and the amounts; unset means "what the file shows". */
export interface PreviewAnswers {
  /** Their answer to "how are the dates written?", asked only when the dates can't prove it. "" = not answered. */
  dateOrder?: DateOrder | "";
  /**
   * Their answer to "Is 05 the year 2005?", asked only when a date in the column has a two-digit
   * year: 2000 (yes) or 1900 (no). "" = not answered. Ignored when every year has four digits.
   */
  century?: Century | "";
  /** Their answer about how amounts are written, if they overrule what the amounts show. */
  decimalStyle?: DecimalStyle;
}

/** Why the screen shows no totals yet. "held" is the screen's own reason (the currency isn't three letters yet). */
export type WaitingFor =
  "a-column" | "different-columns" | "date-order-answer" | "century-answer" | "held";

/** What the preview works out from the person's choices: totals, or the one reason there are none yet. */
export interface SheetPreview {
  /** What the date column says about how its dates are written. */
  detectedOrder: DateOrderReading;
  /** The style the amounts are written in, as detected from the amount column. */
  detectedStyle: DecimalStyle;
  /**
   * The first two-digit year in the date column, as written ("05"), which the screen asks about;
   * null when every date there has a four-digit year, and then nothing is asked.
   */
  twoDigitYear: string | null;
  /** The order and style the totals were (or will be) worked out with. */
  dateOrder: DateOrder | null;
  /** The century two-digit years are read in: the person's answer, or null (unanswered, or none to ask about). */
  century: Century | null;
  decimalStyle: DecimalStyle;
  /** "ready" with totals, "waiting" for the person, or "failed" (the totals can't be held exactly). */
  state: "ready" | "waiting" | "failed";
  waitingFor: WaitingFor | null;
  /** The sentence the screen shows for a waiting or failed state; null when there is nothing to say. */
  message: string | null;
  result: TotalsResult | null;
}

const DIFFERENT_COLUMNS_MESSAGE = "The date and the amount can't be the same column.";
const DATE_ORDER_MESSAGE = "Say how the dates are written to see the totals.";
const centuryMessage = (year: string) => `Say which year ${year} is to see the totals.`;
const FAILED_MESSAGE = "DotAmi couldn't read that file. Nothing was kept.";

/**
 * Works out the preview for one sheet from the person's picks and answers. `today` is the person's
 * own calendar day (YYYY-MM-DD), so a month's "is it over yet" is theirs and a test can fix it.
 * `hold` makes the preview wait even when it could show totals (the screen uses it while the
 * currency is not yet three letters). `unsavedFormulas` is the sheet's own list from the reader
 * (Excel only): those cells are listed as formulas Excel didn't save a value for.
 */
export function previewSheet(
  rows: Cell[][],
  picks: Picks,
  answers: PreviewAnswers,
  today: string,
  hold = false,
  unsavedFormulas: readonly CellPlace[] = [],
): SheetPreview {
  const dateCells =
    picks.headerRow !== null && picks.dateColumn !== null
      ? columnCells(rows, picks.headerRow, picks.dateColumn)
      : [];
  const detectedOrder = detectDateOrder(dateCells);

  const amountCells =
    picks.headerRow !== null && picks.amountColumn !== null
      ? columnCells(rows, picks.headerRow, picks.amountColumn)
      : [];
  const detectedStyle = detectDecimalStyle(amountCells);
  const decimalStyle = answers.decimalStyle ?? detectedStyle;

  // Asked (or conflicting) dates follow the person's answer; otherwise whatever the dates prove.
  const needsAnswer = detectedOrder.ambiguous;
  const dateOrder: DateOrder | null =
    needsAnswer || detectedOrder.conflicting ? answers.dateOrder || null : detectedOrder.order;

  // A two-digit year is read only in the century the person said, and only for this sheet's date
  // column; with no two-digit year a stray answer is ignored, so it can't touch any other date.
  const twoDigitYear = firstTwoDigitYear(dateCells);
  const century: Century | null = twoDigitYear !== null ? answers.century || null : null;

  const outcome = (
    state: SheetPreview["state"],
    waitingFor: WaitingFor | null,
    message: string | null,
    result: TotalsResult | null,
  ): SheetPreview => ({
    detectedOrder,
    detectedStyle,
    twoDigitYear,
    dateOrder,
    century,
    decimalStyle,
    state,
    waitingFor,
    message,
    result,
  });

  if (picks.headerRow === null || picks.dateColumn === null || picks.amountColumn === null) {
    return outcome("waiting", "a-column", null, null);
  }
  if (picks.dateColumn === picks.amountColumn) {
    return outcome("waiting", "different-columns", DIFFERENT_COLUMNS_MESSAGE, null);
  }
  if (needsAnswer && dateOrder === null) {
    return outcome("waiting", "date-order-answer", DATE_ORDER_MESSAGE, null);
  }
  if (twoDigitYear !== null && century === null) {
    return outcome("waiting", "century-answer", centuryMessage(twoDigitYear), null);
  }
  if (hold) return outcome("waiting", "held", null, null);

  const choice: ColumnChoice = {
    headerRow: picks.headerRow,
    dateColumn: picks.dateColumn,
    amountColumn: picks.amountColumn,
    typeColumn: picks.typeColumn,
    dateOrder,
    century,
    decimalStyle,
  };
  try {
    return outcome("ready", null, null, monthlyTotals(rows, choice, today, unsavedFormulas));
  } catch (error) {
    // The only throw is the "too large" sentence, which carries no amount.
    return outcome("failed", null, error instanceof Error ? error.message : FAILED_MESSAGE, null);
  }
}

/**
 * The sentence every preview shows under its totals: the earliest and latest date DotAmi read, in
 * words, for the person to check against the file ("Dates read: 3 December 2005 to 28 February
 * 2006. ..."). A wrong date order or century shows up here as a day the file doesn't hold. Null
 * when no date was read (nothing to check).
 */
export function datesReadSentence(datesRead: TotalsResult["datesRead"]): string | null {
  if (datesRead === null) return null;
  if (datesRead.first === datesRead.last) {
    return `Dates read: ${dayInWords(datesRead.first)}, the only date. Check it against the file.`;
  }
  return `Dates read: ${dayInWords(datesRead.first)} to ${dayInWords(datesRead.last)}. Check these against the file's earliest and latest dates.`;
}


// ---- [8c-3] Months across the top -----------------------------------------------------------

/**
 * How a sheet is laid out: "rows" is one row per sale with a date (everything above); "across" is
 * one column per month, as in FreshBooks' Revenue by Client (lib/figures/file/across.ts).
 */
export type Layout = "rows" | "across";

/**
 * Where a months-across table's totals come from: "every-row" adds up each month's column, leaving
 * out the report's own totals rows; a number takes that one row (0-based), such as the Total row.
 */
export type AddUp = "every-row" | number;

/** The months-across pickers (null = not chosen). */
export interface AcrossPicks {
  monthsRow: number | null;
  addUp: AddUp;
}

/**
 * The layout the screen starts on, for the person to check. "across" only when no row of column
 * names sits above a date (guessColumns finds nothing) and a row of month names sits above an
 * amount, so every file with a date on its rows keeps the reading it had before.
 */
export function guessLayout(rows: Cell[][]): { layout: Layout; monthsRow: number | null } {
  if (guessColumns(rows) !== null) return { layout: "rows", monthsRow: null };
  const monthsRow = guessMonthsRow(rows);
  return monthsRow === null ? { layout: "rows", monthsRow: null } : { layout: "across", monthsRow };
}

/**
 * The months-across pickers as first filled in: the guessed row of month names (null when there is
 * none to guess) and every row added up. Filled whichever layout the screen starts on, so switching
 * to "months across" finds the row already chosen for the person to check.
 */
export function guessAcrossPicks(rows: Cell[][]): AcrossPicks {
  return { monthsRow: guessMonthsRow(rows), addUp: "every-row" };
}

/** Why a months-across preview shows no totals yet. "held" is the screen's own (the currency). */
export type AcrossWaitingFor = "a-row" | "no-months" | "unclear-month" | "repeated-month" | "held";

/** What the months-across preview works out: totals, or the one reason there are none yet. */
export interface AcrossPreview {
  /** The columns read as months from the chosen row, left to right; empty until a row is chosen. */
  monthColumns: MonthColumn[];
  /** How the amounts under the months are written, as detected, and as used. */
  detectedStyle: DecimalStyle;
  decimalStyle: DecimalStyle;
  state: "ready" | "waiting" | "failed";
  waitingFor: AcrossWaitingFor | null;
  /** The sentence the screen shows for a waiting or failed state; null when there is nothing to say. */
  message: string | null;
  result: AcrossResult | null;
}

/** Column letters in a sentence: "C", "C and D", "C, D and E". */
function lettersInWords(columns: number[]): string {
  const letters = columns.map(columnLetter);
  if (letters.length === 1) return letters[0];
  return `${letters.slice(0, -1).join(", ")} and ${letters[letters.length - 1]}`;
}

const MONTH_NAME_EXAMPLES = "Jul 2026, juillet 2026, 2026-07 or 07/2026";

function unclearMonthMessage(columns: number[]): string {
  return columns.length === 1
    ? `The name of column ${lettersInWords(columns)} looks like a month, but DotAmi can't be sure which month and year it is, so nothing is added up. It reads names like ${MONTH_NAME_EXAMPLES}.`
    : `The names of columns ${lettersInWords(columns)} look like months, but DotAmi can't be sure which month and year they are, so nothing is added up. It reads names like ${MONTH_NAME_EXAMPLES}.`;
}

function repeatedMonthMessage(month: string, columns: number[]): string {
  const verb = columns.length === 2 ? "both name" : "all name";
  return `Columns ${lettersInWords(columns)} ${verb} ${monthInWords(month)}, so nothing is added up. Check the row of month names.`;
}

const noMonthsMessage = (monthsRow: number) =>
  `No column in row ${monthsRow + 1} is named like a month and year (${MONTH_NAME_EXAMPLES}). Pick the row with the month names.`;

/**
 * Works out the preview of a months-across table from the person's picks: which row holds the month
 * names and where the totals come from. A month name DotAmi can't be sure of, or the same month
 * named twice, stops it: nothing is added up, and the message says which columns. `today`,
 * `hold` and `unsavedFormulas` work as in previewSheet.
 */
export function previewAcross(
  rows: Cell[][],
  picks: AcrossPicks,
  answers: Pick<PreviewAnswers, "decimalStyle">,
  today: string,
  hold = false,
  unsavedFormulas: readonly CellPlace[] = [],
): AcrossPreview {
  const { monthsRow } = picks;
  const reading = monthsRow === null ? null : readMonthsRow(rows, monthsRow);
  const monthColumns = reading?.months ?? [];

  // How amounts are written, from every cell under a month name.
  const amountCells: Cell[] = [];
  if (monthsRow !== null) {
    for (let i = monthsRow + 1; i < rows.length; i += 1) {
      for (const m of monthColumns) amountCells.push(rows[i][m.column] ?? null);
    }
  }
  const detectedStyle = detectDecimalStyle(amountCells);
  const decimalStyle = answers.decimalStyle ?? detectedStyle;

  const outcome = (
    state: AcrossPreview["state"],
    waitingFor: AcrossWaitingFor | null,
    message: string | null,
    result: AcrossResult | null,
  ): AcrossPreview => ({
    monthColumns,
    detectedStyle,
    decimalStyle,
    state,
    waitingFor,
    message,
    result,
  });

  if (monthsRow === null || reading === null) return outcome("waiting", "a-row", null, null);
  // An unclear name comes first: the whole table waits rather than leave one month out unseen.
  if (reading.unclear.length > 0) {
    return outcome("waiting", "unclear-month", unclearMonthMessage(reading.unclear), null);
  }
  if (monthColumns.length === 0) {
    return outcome("waiting", "no-months", noMonthsMessage(monthsRow), null);
  }
  if (reading.repeated) {
    const { month, columns } = reading.repeated;
    return outcome("waiting", "repeated-month", repeatedMonthMessage(month, columns), null);
  }
  const totalRow = picks.addUp === "every-row" ? null : picks.addUp;
  // Only a row under the month names can hold their totals.
  if (totalRow !== null && (totalRow <= monthsRow || totalRow >= rows.length)) {
    return outcome("waiting", "a-row", null, null);
  }
  if (hold) return outcome("waiting", "held", null, null);

  try {
    const result = acrossTotals(
      rows,
      { monthsRow, monthColumns, totalRow, decimalStyle },
      today,
      unsavedFormulas,
    );
    return outcome("ready", null, null, result);
  } catch (error) {
    // The only throw is the "too large" sentence, which carries no amount.
    return outcome("failed", null, error instanceof Error ? error.message : FAILED_MESSAGE, null);
  }
}

/**
 * The sentence a months-across preview shows above its totals: the earliest and latest month read
 * from the column names, in words, for the person to check. Null when no month was read.
 */
export function monthsReadSentence(monthsRead: AcrossResult["monthsRead"]): string | null {
  if (monthsRead === null) return null;
  if (monthsRead.first === monthsRead.last) {
    return `Months read from the column names: ${monthInWords(monthsRead.first)}, the only month. Check it against the file.`;
  }
  return `Months read from the column names: ${monthInWords(monthsRead.first)} to ${monthInWords(monthsRead.last)}. Check these against the file.`;
}

// ---- [8c-3] "These dates are right" ------------------------------------------------------------

/**
 * Everything that decides which dates (or, across the top, which months) a preview read. The
 * person's "These dates are right" tick vouches for one combination of these and no other
 * (the maintainer's decision, 2026-10-07: ask the person to confirm dates and times; a time of day
 * never moves the day here and isn't shown, so only dates are confirmed). `file` is a counter the
 * screen bumps for every file it reads, so the same file dropped twice is confirmed twice.
 * `sentence` is the "Dates read: ..." line itself: if the words on screen change, so does the key
 * (while no line is on screen, see datesCheckSentence). The amount column, the currency and the
 * amounts' style aren't here: they don't move a date.
 */
export interface DatesCheckParts {
  file: number;
  sheet: number;
  layout: Layout;
  headerRow: number | null;
  dateColumn: number | null;
  dateOrder: DateOrder | "";
  century: Century | "";
  monthsRow: number | null;
  sentence: string | null;
}

/** The tick-box's state: ticked or not, and the reading of the dates it was last looked at under. */
export interface DatesCheck {
  key: string;
  ticked: boolean;
}

/** Nothing looked at yet. No real key is empty, so this never counts as confirmed. */
export const NO_DATES_CHECK: DatesCheck = { key: "", ticked: false };

/** One string per reading of the dates (JSON keeps null, "" and 0 apart). */
export function datesCheckKey(parts: DatesCheckParts): string {
  return JSON.stringify([
    parts.file,
    parts.sheet,
    parts.layout,
    parts.headerRow,
    parts.dateColumn,
    parts.dateOrder,
    parts.century,
    parts.monthsRow,
    parts.sentence,
  ]);
}

/**
 * The "Dates read" line to put in the key. While the totals are held back for something that never
 * moves a date (the currency half typed, the amount column set to the date column, a totals row that
 * can't be used yet) there is no line on screen, and keying on that null would empty the box every
 * time someone retyped CAD as USD. So the line the box was last looked at under stands in for it.
 * Nothing slips through that way: every answer that moves a date is a part of the key on its own,
 * and once the totals show again it is their own line that is compared.
 */
export function datesCheckSentence(onScreen: string | null, check: DatesCheck): string | null {
  if (onScreen !== null || check.key === "") return onScreen;
  // The line is the last entry of the key (see datesCheckKey).
  const parts: unknown = JSON.parse(check.key);
  const last = Array.isArray(parts) ? parts[parts.length - 1] : null;
  return typeof last === "string" ? last : null;
}

/**
 * The check as it stands under the reading now on screen: unchanged while the reading is the same,
 * un-ticked the moment it differs. It moves to the new key rather than remembering the old one, so
 * going back to the answer the person ticked under (day first, month first, day first again) does
 * not tick the box again by itself: the dates changed on screen twice, so they are looked at again.
 */
export function followDatesCheck(check: DatesCheck, key: string): DatesCheck {
  return check.key === key ? check : { key, ticked: false };
}

/** True only when the box was ticked under exactly the reading now on screen. */
export function datesConfirmed(check: DatesCheck, key: string): boolean {
  return check.ticked && check.key === key;
}

/**
 * Wave's Income by Customer, by the three column names Wave's help page gives it ("Customers",
 * "All income", "Paid income"): one total per customer for a date range, and no date anywhere.
 */
const WAVE_INCOME_BY_CUSTOMER = ["customers", "all income", "paid income"];

export const WAVE_INCOME_BY_CUSTOMER_SENTENCE =
  "This looks like Wave's Income by Customer report: one total per customer, with no dates, so DotAmi can't split it into months. In Wave, export the Account Transactions report for your income account instead (Reports, Account Transactions, Export, as CSV): it has a date on every line.";

export const NO_DATES_SENTENCE =
  "DotAmi found no dates in this file and no months across the top, so it can't split it into months. Export a report from your accounting software that has a date on every sale instead.";

/**
 * When DotAmi can't find a table to add up, the report to export instead, as a sentence; null when
 * there is no such advice to give (the file has dates or months somewhere, and the person picks).
 * Wave's Income by Customer is named and pointed to Wave's Account Transactions; any other file
 * with no date and no month at all gets the general sentence.
 */
export function exportInsteadSentence(rows: Cell[][]): string | null {
  const isWaveIncomeByCustomer = rows.slice(0, 30).some((row) => {
    const names = row
      .filter((cell): cell is string => typeof cell === "string" && cell.trim() !== "")
      .map((cell) => cell.trim().toLowerCase());
    return names.length === 3 && names.every((name, i) => name === WAVE_INCOME_BY_CUSTOMER[i]);
  });
  if (isWaveIncomeByCustomer) return WAVE_INCOME_BY_CUSTOMER_SENTENCE;
  if (guessColumns(rows) !== null || sheetHasDates(rows)) return null;
  // A name that is (or only looks like) a month, in a row of two or more names among the first 30:
  // this may be a months-across table the person can pick, so it isn't told there are no months. A
  // title alone on its row ("Date Range: Jul 1, 2026 to Sep 30, 2026") doesn't count.
  for (let r = 0; r < Math.min(30, rows.length); r += 1) {
    if (rows[r].filter((cell) => cell !== null && String(cell).trim() !== "").length < 2) continue;
    const reading = readMonthsRow(rows, r);
    if (reading.months.length > 0 || reading.unclear.length > 0) return null;
  }
  // A cell with a date INSIDE it ("14-07-2026;1001;Design") means the dates are there but the
  // file was split in the wrong places; telling that person their report has no dates would be
  // wrong, so the general sentence is kept for files with no date-like text at all.
  if (rows.some((row) => row.some((cell) => typeof cell === "string" && DATE_INSIDE.test(cell)))) {
    return null;
  }
  return NO_DATES_SENTENCE;
}

/** Something shaped like a numeric date anywhere in a cell: 14-07-2026, 2026/07/14, 03.12.26. */
const DATE_INSIDE = /\d{1,4}[-/.]\d{1,2}[-/.]\d{2,4}/;

// ---- The whole file, as the screen runs it ------------------------------------------------------

/**
 * What the person does on the screen after the guess, for a whole file at once: every field is
 * optional, and unset means "leave what DotAmi guessed". Used by previewFile.
 */
export interface FileAnswers extends PreviewAnswers {
  /** 0-based row the person says holds the column names (the screen's "Column names are in row" picker). */
  headerRow?: number;
  /** 0-based column they pick for the dates. */
  dateColumn?: number;
  /** 0-based column they pick for the amounts. */
  amountColumn?: number;
  /** 0-based column they pick for the transaction types; null clears it (the select's empty choice). */
  typeColumn?: number | null;
  /** The screen's "The file has" select: one row per sale, or months across the top. */
  layout?: Layout;
  /** 0-based row they say holds the month names (months across only). */
  monthsRow?: number;
  /** Where the totals come from (months across only). */
  addUp?: AddUp;
}

/** A whole file run through the screen's steps. */
export interface FilePreview extends SheetPreview {
  /** The first sheet with anything in it, as rows exactly as read. */
  rows: Cell[][];
  /** What guessColumns said about the whole sheet (null: no row looked like column names above a date). */
  guess: ColumnGuess | null;
  /** The columns in use once the person's own picks are applied. */
  picks: Picks;
  /** The layout in use: the person's answer, or the guess. */
  layout: Layout;
  /** The months-across pickers in use (meaningful only when `layout` is "across"). */
  acrossPicks: AcrossPicks;
  /** The months-across preview when `layout` is "across"; null otherwise (the fields above apply). */
  across: AcrossPreview | null;
  /** The report to export instead, when no column names were found; see exportInsteadSentence. */
  exportInstead: string | null;
}

/**
 * A file's bytes through every step the screen runs: read it, open the first sheet with anything
 * in it, guess the layout and the columns, apply the person's answers, add up by month. The screen
 * reads the file itself (it keeps every sheet so the person can switch) and then calls the same
 * functions above; this is the one-call form for a test of a practice file. It throws when the
 * file can't be read.
 */
export async function previewFile(
  fileName: string,
  bytes: Uint8Array,
  today: string,
  answers: FileAnswers = {},
): Promise<FilePreview> {
  // Loaded here, not at the top of the module, so the screen's page doesn't carry the zip reader.
  const { readSpreadsheet } = await import("./read-file");
  const read = await readSpreadsheet(fileName, bytes);
  if (!read.ok) throw new Error("the file could not be read");

  const sheet = read.sheets[firstSheetWithRows(read.sheets)];
  const rows = sheet.rows;
  const unsaved = sheet.unsavedFormulas ?? [];
  const { guess, picks: guessed } = guessPicks(rows, answers.headerRow);
  const picks: Picks = {
    headerRow: guessed.headerRow,
    dateColumn: answers.dateColumn ?? guessed.dateColumn,
    amountColumn: answers.amountColumn ?? guessed.amountColumn,
    // Unlike the others, null here is an answer: the person cleared the select.
    typeColumn: answers.typeColumn === undefined ? guessed.typeColumn : answers.typeColumn,
  };
  const preview = previewSheet(rows, picks, answers, today, false, unsaved);

  const layout = answers.layout ?? guessLayout(rows).layout;
  const guessedAcross = guessAcrossPicks(rows);
  const acrossPicks: AcrossPicks = {
    monthsRow: answers.monthsRow ?? guessedAcross.monthsRow,
    addUp: answers.addUp ?? guessedAcross.addUp,
  };
  const across =
    layout === "across" ? previewAcross(rows, acrossPicks, answers, today, false, unsaved) : null;
  const exportInstead =
    layout === "rows" && picks.headerRow === null ? exportInsteadSentence(rows) : null;
  return { ...preview, rows, guess, picks, layout, acrossPicks, across, exportInstead };
}
