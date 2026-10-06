/**
 * [8c] Finding the table inside a sheet: which row holds the column names and which columns hold
 * the dates and the amounts. Everything here is a first guess the person checks on screen — and
 * a guess is only pre-filled when it is solid. A wrong pre-filled amount column would quietly
 * misstate someone's income, so an unsure guess leaves the dropdown empty for the person to pick.
 */
import { cellToCents } from "./amounts";
import { cellToDay } from "./dates";
import type { Cell } from "./types";

export interface ColumnInfo {
  /** 0-based position in a row. */
  index: number;
  /** Excel's name for the column: A, B, … Z, AA. */
  letter: string;
  /** The column's header text, or "Column C" when the header cell is empty. */
  label: string;
}

export interface ColumnGuess {
  /** Index into `rows` of the row holding the column names. */
  headerRow: number;
  columns: ColumnInfo[];
  dateColumn: number | null;
  amountColumn: number | null;
}

/** Widest sheet we offer columns for; a real export never needs more, and a bad file can't make a huge list. */
const MAX_COLUMNS = 200;
/** How far down we look for the header row, and how far below it for a first date. */
const HEADER_SEARCH_ROWS = 30;
const DATE_LOOKAHEAD_ROWS = 50;
/** Rows sampled when scoring a column. */
const SAMPLE_ROWS = 500;

/** 0 → "A", 25 → "Z", 26 → "AA", 701 → "ZZ", 702 → "AAA". */
export function columnLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

function isEmptyCell(cell: Cell | undefined): boolean {
  return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
}

/** True when a row is missing or every cell in it is empty (null, "" or only spaces). */
export function isBlankRow(row: Cell[] | undefined): boolean {
  return row === undefined || row.every((cell) => isEmptyCell(cell));
}

/** A header cell as the text shown to the person. */
function headerText(cell: Cell | undefined): string {
  if (typeof cell === "string") return cell.trim();
  if (typeof cell === "number") return String(cell);
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) return cell.toISOString().slice(0, 10);
  return "";
}

/** One entry per column, as wide as the longest row from the header row down. */
export function columnsOf(rows: Cell[][], headerRow: number): ColumnInfo[] {
  let width = 0;
  for (let i = Math.max(headerRow, 0); i < rows.length; i += 1) {
    if (rows[i].length > width) width = rows[i].length;
  }
  width = Math.min(width, MAX_COLUMNS);

  const header = rows[headerRow] ?? [];
  const columns: ColumnInfo[] = [];
  for (let index = 0; index < width; index += 1) {
    const letter = columnLetter(index);
    columns.push({ index, letter, label: headerText(header[index]) || `Column ${letter}` });
  }
  return columns;
}

function readsAsDate(cell: Cell | undefined): boolean {
  const value = cell ?? null;
  return (
    cellToDay(value, null) !== null ||
    cellToDay(value, "mdy") !== null ||
    cellToDay(value, "dmy") !== null
  );
}

function readsAsAmount(cell: Cell | undefined): boolean {
  const value = cell ?? null;
  return cellToCents(value, "point") !== null || cellToCents(value, "comma") !== null;
}

/** A row can be the header when it has two or more text cells and none of them is a date or an amount. */
function looksLikeHeader(row: Cell[]): boolean {
  let labels = 0;
  for (const cell of row) {
    if (typeof cell !== "string" || cell.trim() === "") continue;
    if (readsAsDate(cell) || readsAsAmount(cell)) return false;
    labels += 1;
  }
  return labels >= 2;
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

const DATE_HEADER = /\b(date|day|jour|posted|issued)\b/i;
const AMOUNT_HEADER_FIRST = /^\s*(amount|montant|sub[\s-]?total|sous[\s-]?total)\b/i;
const AMOUNT_HEADER_ANY =
  /(amount|montant|revenue|revenu|sales|ventes|income|subtotal|sous-total)/i;
/** "Total" columns: in many invoice exports the total includes the sales tax collected. */
const TOTAL_HEADER = /^\s*(total|grand[\s-]+total)\b/i;
/** Columns that look like money but aren't the revenue figure: tax, running balances, counts, ids. */
const NOT_REVENUE_HEADER =
  /(tax|gst|hst|pst|qst|tps|tvq|tvh|balance|solde|qty|quantity|quantité|rate|taux|\bid\b|number|\bno\.|#)/i;

/**
 * Guesses where the table starts and which columns are the date and the amount. Returns null when
 * no row looks like column names above at least one date — the person is then asked to pick the
 * row themselves.
 */
export function guessColumns(rows: Cell[][]): ColumnGuess | null {
  let headerRow = -1;
  for (let r = 0; r < Math.min(HEADER_SEARCH_ROWS, rows.length); r += 1) {
    if (!looksLikeHeader(rows[r])) continue;
    // A header with no dates under it is a title or a note, not the table's header.
    const below = rows.slice(r + 1, r + 1 + DATE_LOOKAHEAD_ROWS);
    if (below.some((row) => row.some((cell) => readsAsDate(cell)))) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) return null;

  const columns = columnsOf(rows, headerRow);
  const dataRows = rows
    .slice(headerRow + 1)
    .filter((row) => !isBlankRow(row))
    .slice(0, SAMPLE_ROWS);

  // Date column: a header that says "date" and mostly dates beneath it, else the only column that is mostly dates.
  const dateScores = columns.map((c) => columnScore(dataRows, c.index, readsAsDate));
  let dateColumn: number | null = null;
  let best = -1;
  for (const c of columns) {
    if (DATE_HEADER.test(c.label) && dateScores[c.index] >= 0.5 && dateScores[c.index] > best) {
      best = dateScores[c.index];
      dateColumn = c.index;
    }
  }
  if (dateColumn === null) {
    const mostlyDates = columns.filter((c) => dateScores[c.index] >= 0.5);
    if (mostlyDates.length === 1) dateColumn = mostlyDates[0].index;
  }

  // Amount column: only on a header-name match. Better an empty dropdown than a wrong income figure.
  // A "Total" column is a last resort, and never when the file has a tax column beside it — then the
  // total most likely includes the tax, and the person should pick.
  const hasTaxColumn = columns.some((c) => /(tax|gst|hst|pst|qst|tps|tvq|tvh)/i.test(c.label));
  const patterns = hasTaxColumn
    ? [AMOUNT_HEADER_FIRST, AMOUNT_HEADER_ANY]
    : [AMOUNT_HEADER_FIRST, AMOUNT_HEADER_ANY, TOTAL_HEADER];
  let amountColumn: number | null = null;
  for (const pattern of patterns) {
    let bestScore = -1;
    for (const c of columns) {
      if (c.index === dateColumn) continue;
      if (NOT_REVENUE_HEADER.test(c.label) || !pattern.test(c.label)) continue;
      const score = columnScore(dataRows, c.index, readsAsAmount);
      if (score >= 0.5 && score > bestScore) {
        bestScore = score;
        amountColumn = c.index;
      }
    }
    if (amountColumn !== null) break;
  }

  return { headerRow, columns, dateColumn, amountColumn };
}
