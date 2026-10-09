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
import { detectDecimalStyle } from "./amounts";
import { dayInWords, detectDateOrder, firstTwoDigitYear } from "./dates";
import { guessColumns, isBlankRow } from "./table";
import type { ColumnGuess } from "./table";
import { monthlyTotals } from "./totals";
import type {
  Cell,
  Century,
  ColumnChoice,
  DateOrder,
  DecimalStyle,
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
 * currency is not yet three letters).
 */
export function previewSheet(
  rows: Cell[][],
  picks: Picks,
  answers: PreviewAnswers,
  today: string,
  hold = false,
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
    return outcome("ready", null, null, monthlyTotals(rows, choice, today));
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
}

/** A whole file run through the screen's steps. */
export interface FilePreview extends SheetPreview {
  /** The first sheet with anything in it, as rows exactly as read. */
  rows: Cell[][];
  /** What guessColumns said about the whole sheet (null: no row looked like column names above a date). */
  guess: ColumnGuess | null;
  /** The columns in use once the person's own picks are applied. */
  picks: Picks;
}

/**
 * A file's bytes through every step the screen runs: read it, open the first sheet with anything
 * in it, guess the columns, apply the person's answers, add up by month. The screen reads the file
 * itself (it keeps every sheet so the person can switch) and then calls the same functions above;
 * this is the one-call form for a test of a practice file. It throws when the file can't be read.
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

  const rows = read.sheets[firstSheetWithRows(read.sheets)].rows;
  const { guess, picks: guessed } = guessPicks(rows, answers.headerRow);
  const picks: Picks = {
    headerRow: guessed.headerRow,
    dateColumn: answers.dateColumn ?? guessed.dateColumn,
    amountColumn: answers.amountColumn ?? guessed.amountColumn,
    // Unlike the others, null here is an answer: the person cleared the select.
    typeColumn: answers.typeColumn === undefined ? guessed.typeColumn : answers.typeColumn,
  };
  const preview = previewSheet(rows, picks, answers, today);
  return { ...preview, rows, guess, picks };
}
