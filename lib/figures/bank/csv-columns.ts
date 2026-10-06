/**
 * [8g] A bank or card transactions CSV → rows DotAmi can tick.
 *
 * Reuses the [8c] pieces — the CSV reader hands over cells, and the same date and amount readers
 * (file/dates.ts, file/amounts.ts) decide what is certain. What is new is the shape of a
 * transactions file: a date, a description, and the money either in two columns (money in / money
 * out) or in one signed column whose sign the PERSON says the meaning of.
 *
 * Everything pre-filled is a first guess the person checks on screen, and a guess is made only when
 * it is solid: with two possible matches, or none, the choice is left empty. A running Balance
 * column, an account or card number column and a tax column are never pre-filled and are listed
 * last in the pickers. Nothing outside the picked columns is ever read into a row, so an account
 * number sitting in another column (or in lines above the column names) never gets into one.
 *
 * Header words below are common English and French ones, not any bank's own. We have no dated
 * source for the column names a given bank uses in its CSV download, so none of them is claimed
 * for a bank, and the person always sees the guess and can pick the columns themselves.
 *
 * Runs in the browser and keeps nothing: no logging, no storing, no sending.
 */
import { cellToCents, detectDecimalStyle } from "../file/amounts";
import { cellToDay, detectDateOrder } from "../file/dates";
import { guessColumns, isBlankRow, type ColumnInfo } from "../file/table";
import { TOTAL_ROW_LABEL } from "../file/totals";
import type { Cell, DateOrder, DecimalStyle } from "../file/types";
import { spanOfRows } from "./coverage";
import type { BankRow, DaySpan } from "./types";

/** How the money is laid out: two columns, or one column whose sign the person has explained. */
export type AmountLayout =
  | {
      kind: "in-out";
      moneyInColumn: number;
      /** A file may have only a money-in column (a deposits-only download). */
      moneyOutColumn: number | null;
    }
  | {
      kind: "signed";
      amountColumn: number;
      /**
       * Which direction a positive number means. Never guessed: a bank account writes deposits
       * as positive, a card statement writes purchases as positive, and the file doesn't say.
       */
      positiveMeans: "money-in" | "money-out";
    };

/** What the person has chosen (guessed first, always shown to them to check). */
export interface BankCsvChoice {
  /** Index into `rows` of the row holding the column names; data starts on the row after it. */
  headerRow: number;
  dateColumn: number;
  /** Optional: only used to show the person what each row was. */
  descriptionColumn: number | null;
  layout: AmountLayout;
  /** Needed only for dates like 03/01/2026; null when every date in the column is unambiguous. */
  dateOrder: DateOrder | null;
  decimalStyle: DecimalStyle;
}

/** Why a row below the column names didn't become a row to tick. Each is reported, none dropped silently. */
export type BankCsvSkipReason =
  "blank" | "total" | "no-date" | "no-amount" | "bad-amount" | "unexpected-sign" | "both-columns";

export const BANK_CSV_SKIP_TEXT: Record<BankCsvSkipReason, string> = {
  blank: "A blank row.",
  total: "A total line, not a transaction.",
  "no-date": "No date DotAmi can read with certainty.",
  "no-amount": "No amount.",
  "bad-amount": "An amount DotAmi can't read with certainty.",
  "unexpected-sign": "A negative amount in the money-in column.",
  "both-columns": "An amount in both the money-in and the money-out column.",
};

export interface BankCsvSkip {
  /** 1-based, as the person sees it in the file. */
  row: number;
  reason: BankCsvSkipReason;
}

export type BankCsvResult =
  | {
      ok: true;
      rows: BankRow[];
      skipped: BankCsvSkip[];
      /** The first and last day found, for "Which months did you download in full?" — null when no row had a date. */
      span: DaySpan | null;
    }
  | { ok: false; error: string };

/** What the guess found. Anything it wasn't sure of is null. */
export interface BankColumnGuess {
  headerRow: number;
  columns: ColumnInfo[];
  dateColumn: number | null;
  descriptionColumn: number | null;
  moneyInColumn: number | null;
  moneyOutColumn: number | null;
  /** One signed amount column, only when no money-in column was found. The person still says what the sign means. */
  amountColumn: number | null;
  /** Columns that are running balances. Never money, never pre-filled. */
  balanceColumns: number[];
}

/** Rows sampled when scoring a column. */
const SAMPLE_ROWS = 500;

const DATE_HEADER = /\b(date|day|jour|posted)\b/i;
/** Among several date columns the bank's posting date is the one that matches what an OFX file calls the day. */
const POSTED_HEADER = /(post|inscri|comptabilis)/i;
const BALANCE_HEADER = /(balance|solde)/i;
/**
 * Columns that look like money or text but are about something else: running balances, account or
 * card numbers and ids, branch and institution numbers, tax. Never pre-filled, always listed last.
 */
const NOT_MONEY_HEADER =
  /(balance|solde|account|compte|card|carte|number|num[ée]ro|\bno\.|#|\bid\b|transit|branch|succursale|institution|tax|gst|hst|pst|qst|tps|tvq|tvh)/i;

// `(?!\p{L})` rather than `\b`: a word boundary doesn't see "é".
const MONEY_IN_HEADER =
  /^\s*(?:deposits?|credits?|money[\s-]in|paid[\s-]in|received|d[ée]p[oô]ts?|cr[ée]dits?|entr[ée]es?|encaissements?)(?!\p{L})/iu;
const MONEY_OUT_HEADER =
  /^\s*(?:withdrawals?|debits?|money[\s-]out|paid[\s-]out|d[ée]bits?|retraits?|sorties?|d[ée]caissements?)(?!\p{L})/iu;
const AMOUNT_HEADER = /^\s*(?:transaction\s+)?(?:amount|montant)(?!\p{L})/iu;
const DESCRIPTION_HEADER_FIRST =
  /^\s*(?:transaction\s+)?(?:description|libell[ée]|details?|d[ée]tails?)(?!\p{L})/iu;
const DESCRIPTION_HEADER_ANY =
  /(payee|name|memo|narrative|merchant|particulars|nom\b|b[ée]n[ée]ficiaire)/i;

function isEmptyCell(cell: Cell | undefined): boolean {
  return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
}

function readsAsDay(cell: Cell | undefined): boolean {
  const value = cell ?? null;
  return (
    cellToDay(value, null) !== null ||
    cellToDay(value, "mdy") !== null ||
    cellToDay(value, "dmy") !== null
  );
}

function readsAsMoney(cell: Cell | undefined): boolean {
  const value = cell ?? null;
  return cellToCents(value, "point") !== null || cellToCents(value, "comma") !== null;
}

/** Share (0 to 1) of a column's non-blank cells that `reads` accepts; 0 when the column is empty. */
function columnScore(
  dataRows: Cell[][],
  column: number,
  reads: (cell: Cell | undefined) => boolean,
): number {
  let filled = 0;
  let readable = 0;
  for (const row of dataRows) {
    const cell = row[column];
    if (isEmptyCell(cell)) continue;
    filled += 1;
    if (reads(cell)) readable += 1;
  }
  return filled === 0 ? 0 : readable / filled;
}

/**
 * Guesses where the table starts and which columns are which. Returns null when no row looks like
 * column names above at least one date; the person is then asked to pick the row themselves.
 */
export function guessBankColumns(rows: Cell[][]): BankColumnGuess | null {
  // The [8c] header search: a row of labels with a date somewhere beneath it. Whatever sits above
  // it (a title, "Account: ...", an opening balance) is never looked at again.
  const base = guessColumns(rows);
  if (!base) return null;
  const { headerRow, columns } = base;

  const dataRows = rows
    .slice(headerRow + 1)
    .filter((row) => !isBlankRow(row))
    .slice(0, SAMPLE_ROWS);

  // Date: a column named like a date that mostly holds dates. With two of those (a transaction date
  // and a posting date) take the posting date; with no way to tell, leave it to the person.
  const named = columns.filter(
    (c) => DATE_HEADER.test(c.label) && columnScore(dataRows, c.index, readsAsDay) >= 0.5,
  );
  let dateColumn: number | null = null;
  if (named.length === 1) {
    dateColumn = named[0].index;
  } else if (named.length > 1) {
    const posted = named.filter((c) => POSTED_HEADER.test(c.label));
    if (posted.length === 1) dateColumn = posted[0].index;
  } else {
    const mostlyDates = columns.filter((c) => columnScore(dataRows, c.index, readsAsDay) >= 0.5);
    if (mostlyDates.length === 1) dateColumn = mostlyDates[0].index;
  }

  /** The one column whose name matches and that reads as money; null for none OR for two (don't pick for them). */
  const onlyMoneyColumn = (pattern: RegExp, taken: (number | null)[]): number | null => {
    const found = columns.filter(
      (c) =>
        !taken.includes(c.index) &&
        pattern.test(c.label) &&
        !NOT_MONEY_HEADER.test(c.label) &&
        columnScore(dataRows, c.index, readsAsMoney) >= 0.5,
    );
    return found.length === 1 ? found[0].index : null;
  };

  const moneyInColumn = onlyMoneyColumn(MONEY_IN_HEADER, [dateColumn]);
  const moneyOutColumn = onlyMoneyColumn(MONEY_OUT_HEADER, [dateColumn, moneyInColumn]);
  // A money-in column settles the layout; a lone "Amount" beside it would be a second opinion.
  const amountColumn = moneyInColumn === null ? onlyMoneyColumn(AMOUNT_HEADER, [dateColumn]) : null;

  // Description: a column named like one, the "Description"/"Details" kind first. Display only, so
  // the first match will do, but never one that is about an account, a card or a balance.
  const taken = [dateColumn, moneyInColumn, moneyOutColumn, amountColumn];
  const usable = columns.filter((c) => !taken.includes(c.index) && !NOT_MONEY_HEADER.test(c.label));
  const descriptionColumn =
    (
      usable.find((c) => DESCRIPTION_HEADER_FIRST.test(c.label)) ??
      usable.find((c) => DESCRIPTION_HEADER_ANY.test(c.label))
    )?.index ?? null;

  return {
    headerRow,
    columns,
    dateColumn,
    descriptionColumn,
    moneyInColumn,
    moneyOutColumn,
    amountColumn,
    balanceColumns: columns.filter((c) => BALANCE_HEADER.test(c.label)).map((c) => c.index),
  };
}

/**
 * The columns in the order a money picker should list them: everything else first, then the ones
 * that only look like money (a running Balance, an account or card number, an id, a tax column).
 * They stay pickable — only never first.
 */
export function orderedMoneyColumns(columns: readonly ColumnInfo[]): ColumnInfo[] {
  return [
    ...columns.filter((c) => !NOT_MONEY_HEADER.test(c.label)),
    ...columns.filter((c) => NOT_MONEY_HEADER.test(c.label)),
  ];
}

/**
 * How the dates and the amounts in the picked columns are written, worked out from the cells
 * themselves exactly as [8c] does — so the screen can ask the person only when the file can't tell.
 */
export function detectBankFormats(
  rows: Cell[][],
  headerRow: number,
  dateColumn: number,
  moneyColumns: readonly number[],
): { dateOrder: ReturnType<typeof detectDateOrder>; decimalStyle: DecimalStyle } {
  const below = rows.slice(headerRow + 1);
  return {
    dateOrder: detectDateOrder(below.map((row) => row[dateColumn] ?? null)),
    decimalStyle: detectDecimalStyle(
      below.flatMap((row) => moneyColumns.map((c) => row[c] ?? null)),
    ),
  };
}

function cellText(cell: Cell | undefined): string {
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return String(cell);
  return "";
}

/** Money in as positive cents, money out as negative: the one convention BankRow uses. */
function readMoney(
  row: Cell[],
  layout: AmountLayout,
  style: DecimalStyle,
): { cents: number } | { skip: BankCsvSkipReason } {
  if (layout.kind === "signed") {
    const cell = row[layout.amountColumn];
    if (isEmptyCell(cell)) return { skip: "no-amount" };
    const cents = cellToCents(cell ?? null, style);
    if (cents === null) return { skip: "bad-amount" };
    if (cents === 0) return { cents: 0 };
    return { cents: layout.positiveMeans === "money-in" ? cents : -cents };
  }

  const inCell = row[layout.moneyInColumn];
  const outCell = layout.moneyOutColumn === null ? undefined : row[layout.moneyOutColumn];
  const inEmpty = isEmptyCell(inCell);
  const outEmpty = isEmptyCell(outCell);
  if (inEmpty && outEmpty) return { skip: "no-amount" };

  const moneyIn = inEmpty ? 0 : cellToCents(inCell ?? null, style);
  const moneyOut = outEmpty ? 0 : cellToCents(outCell ?? null, style);
  if (moneyIn === null || moneyOut === null) return { skip: "bad-amount" };
  // A negative "money in" would be counted as a deposit if we took its size, so it is refused. A
  // money-out figure is read by its size either way: some banks print withdrawals with a minus.
  if (moneyIn < 0) return { skip: "unexpected-sign" };
  const out = Math.abs(moneyOut);
  // Banks often print 0.00 in the column that doesn't apply; two real amounts can't be netted without guessing.
  if (moneyIn !== 0 && out !== 0) return { skip: "both-columns" };
  return { cents: moneyIn !== 0 ? moneyIn : out === 0 ? 0 : -out };
}

/** The sentence for a choice that can't be used, or null when it can. */
function problemWith(rows: Cell[][], choice: BankCsvChoice, currency: string): string | null {
  if (!/^[A-Z]{3}$/.test(currency))
    return "The currency has to be a three-letter code such as CAD.";
  const columns = [
    choice.dateColumn,
    ...(choice.descriptionColumn === null ? [] : [choice.descriptionColumn]),
    ...(choice.layout.kind === "signed"
      ? [choice.layout.amountColumn]
      : [
          choice.layout.moneyInColumn,
          ...(choice.layout.moneyOutColumn === null ? [] : [choice.layout.moneyOutColumn]),
        ]),
  ];
  if (!columns.every((c) => Number.isInteger(c) && c >= 0))
    return "Pick a column for each of these.";
  if (new Set(columns).size !== columns.length)
    return "Each column can only be used for one thing.";
  if (
    !Number.isInteger(choice.headerRow) ||
    choice.headerRow < 0 ||
    choice.headerRow >= rows.length
  ) {
    return "Pick the row that holds the column names.";
  }
  return null;
}

/**
 * Turns the rows under the column names into BankRows, keeping a note of every row that couldn't
 * become one. `idPrefix` keeps ids apart when rows from several files are ticked together; the id
 * is the prefix plus the row's number in the file, so it carries nothing from the file's text.
 */
export function bankRowsFromSheet(
  rows: Cell[][],
  choice: BankCsvChoice,
  currency: string,
  idPrefix = "",
): BankCsvResult {
  const problem = problemWith(rows, choice, currency);
  if (problem !== null) return { ok: false, error: problem };

  // Blank rows after the last real row are just the sheet's trailing space, not part of the table.
  let lastRow = rows.length - 1;
  while (lastRow > choice.headerRow && isBlankRow(rows[lastRow])) lastRow -= 1;

  const out: BankRow[] = [];
  const skipped: BankCsvSkip[] = [];

  for (let i = choice.headerRow + 1; i <= lastRow; i += 1) {
    const row = rows[i];
    const skip = (reason: BankCsvSkipReason) => skipped.push({ row: i + 1, reason });

    if (isBlankRow(row)) {
      skip("blank");
      continue;
    }

    const day = cellToDay(row[choice.dateColumn] ?? null, choice.dateOrder);
    if (day === null) {
      const isSumRow = row.some((cell) => typeof cell === "string" && TOTAL_ROW_LABEL.test(cell));
      skip(isSumRow ? "total" : "no-date");
      continue;
    }

    const money = readMoney(row, choice.layout, choice.decimalStyle);
    if ("skip" in money) {
      skip(money.skip);
      continue;
    }

    out.push({
      id: `${idPrefix}${i + 1}`,
      day,
      cents: money.cents,
      currency,
      description: choice.descriptionColumn === null ? "" : cellText(row[choice.descriptionColumn]),
    });
  }

  return { ok: true, rows: out, skipped, span: spanOfRows(out) };
}
