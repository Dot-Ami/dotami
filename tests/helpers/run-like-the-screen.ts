/**
 * Runs a dropped file through the same steps the "Add from a file" screen runs, so a practice file
 * can be checked end to end without a browser: read the file, take the first sheet with anything
 * in it, guess the columns, work out the date order and the decimal style, add up by month.
 *
 * This is a COPY of what components/ventures/file-drop.tsx does (guessPicks, the sheet choice in
 * openFile, the date and amount detection, and the preview). It lives here because the screen's
 * steps are not yet a function in lib/ — moving them there is an open decision (8c-3 decision 8:
 * lib/figures/file/preview.ts). Until then a copy can drift, so tests/figures-file-packages.spec.ts
 * also checks that the screen still calls each of the functions used below. When the decision is
 * made this whole file is replaced by the shared function.
 *
 * Nothing here touches the network or the disk, logs, or puts a cell in a message.
 */
import { detectDecimalStyle } from "@/lib/figures/file/amounts";
import { detectDateOrder } from "@/lib/figures/file/dates";
import { readSpreadsheet } from "@/lib/figures/file/read-file";
import { guessColumns, isBlankRow } from "@/lib/figures/file/table";
import type { ColumnGuess } from "@/lib/figures/file/table";
import { monthlyTotals } from "@/lib/figures/file/totals";
import type {
  Cell,
  ColumnChoice,
  DateOrder,
  DecimalStyle,
  TotalsResult,
} from "@/lib/figures/file/types";

/** What the person does on the screen after the guess: every field is optional, and unset means "leave what DotAmi guessed". */
export interface Answers {
  /** 0-based row the person says holds the column names (the screen's "Column names are in row" picker). */
  headerRow?: number;
  /** 0-based column they pick for the dates. */
  dateColumn?: number;
  /** 0-based column they pick for the amounts. */
  amountColumn?: number;
  /** Their answer to "how are the dates written?", asked only when the dates can't prove it. */
  dateOrder?: DateOrder;
  /** Their answer about how amounts are written, if they overrule what the amounts show. */
  decimalStyle?: DecimalStyle;
}

/** Why the screen shows no totals yet. */
export type WaitingFor = "a-column" | "different-columns" | "date-order-answer";

export interface ScreenRun {
  /** The first sheet with anything in it, as rows exactly as read. */
  rows: Cell[][];
  /** What guessColumns said about the whole sheet (null: no row looked like column names above a date). */
  guess: ColumnGuess | null;
  /** The columns in use once the person's own picks are applied. */
  picks: { headerRow: number | null; dateColumn: number | null; amountColumn: number | null };
  /** What the date column says about how its dates are written. */
  detectedOrder: ReturnType<typeof detectDateOrder>;
  /** The style the amounts are written in, as detected from the amount column. */
  detectedStyle: DecimalStyle;
  /** The order and style the totals were worked out with. */
  dateOrder: DateOrder | null;
  decimalStyle: DecimalStyle;
  /** "ready" with totals, or "waiting" for the person, with the reason. */
  state: "ready" | "waiting";
  waitingFor: WaitingFor | null;
  result: TotalsResult | null;
}

/** The cells under the column names in one column (all of them, blank or not). */
function columnCells(rows: Cell[][], headerRow: number, column: number): Cell[] {
  const cells: Cell[] = [];
  for (let i = headerRow + 1; i < rows.length; i += 1) cells.push(rows[i][column] ?? null);
  return cells;
}

/** The screen's guessPicks: the whole-sheet guess, or one anchored at a header row the person chose. */
function guessPicks(rows: Cell[][], forcedHeader?: number) {
  if (forcedHeader === undefined) {
    const guess = guessColumns(rows);
    return {
      guess,
      picks: guess && {
        headerRow: guess.headerRow,
        dateColumn: guess.dateColumn,
        amountColumn: guess.amountColumn,
      },
    };
  }
  // Looking from the chosen row down keeps every column index the same as in the whole sheet.
  const guess = guessColumns(rows.slice(forcedHeader));
  if (!guess || guess.headerRow !== 0) return { guess, picks: null };
  return {
    guess,
    picks: {
      headerRow: forcedHeader,
      dateColumn: guess.dateColumn,
      amountColumn: guess.amountColumn,
    },
  };
}

/**
 * The screen's steps for one file. `today` is the person's own calendar day (YYYY-MM-DD), fixed by
 * the test so a month's "is it over yet" never depends on the clock.
 */
export async function runLikeTheScreen(
  fileName: string,
  bytes: Uint8Array,
  today: string,
  answers: Answers = {},
): Promise<ScreenRun> {
  const read = await readSpreadsheet(fileName, bytes);
  if (!read.ok) throw new Error("the practice file could not be read");

  // The screen opens the first sheet that has a row with something in it.
  const first = read.sheets.findIndex((sheet) => sheet.rows.some((row) => !isBlankRow(row)));
  const rows = read.sheets[first === -1 ? 0 : first].rows;

  const { guess, picks: guessed } = guessPicks(rows, answers.headerRow);
  const base = guessed ?? {
    headerRow: answers.headerRow ?? null,
    dateColumn: null,
    amountColumn: null,
  };
  const picks = {
    headerRow: base.headerRow,
    dateColumn: answers.dateColumn ?? base.dateColumn,
    amountColumn: answers.amountColumn ?? base.amountColumn,
  };

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
    needsAnswer || detectedOrder.conflicting ? (answers.dateOrder ?? null) : detectedOrder.order;

  const run = (waitingFor: WaitingFor | null, result: TotalsResult | null): ScreenRun => ({
    rows,
    guess,
    picks,
    detectedOrder,
    detectedStyle,
    dateOrder,
    decimalStyle,
    state: waitingFor === null ? "ready" : "waiting",
    waitingFor,
    result,
  });

  if (picks.headerRow === null || picks.dateColumn === null || picks.amountColumn === null) {
    return run("a-column", null);
  }
  if (picks.dateColumn === picks.amountColumn) return run("different-columns", null);
  if (needsAnswer && dateOrder === null) return run("date-order-answer", null);

  const choice: ColumnChoice = {
    headerRow: picks.headerRow,
    dateColumn: picks.dateColumn,
    amountColumn: picks.amountColumn,
    dateOrder,
    decimalStyle,
  };
  return run(null, monthlyTotals(rows, choice, today));
}
