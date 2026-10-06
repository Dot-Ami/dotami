/**
 * [8c-2] Remembering a file's columns — the half that runs in the window, with nothing stored yet.
 *
 * The idea: the second time someone drops a spreadsheet whose column names match one they used
 * before, DotAmi pre-fills the date and amount columns for them to check. These helpers do the two
 * jobs that need the file's rows: turn a column-names row into a comparable list of names, and find
 * a remembered list inside a freshly read sheet. Nothing here keeps, sends or logs a cell.
 *
 * The one rule that matters for privacy: ONLY a column-names row is ever turned into something
 * that could be kept. A data row picked by mistake (client names, dates, amounts) must give
 * nothing back, so every route to a name list goes through `rememberableHeaderNames`.
 */
import { looksLikeHeader } from "./table";
import type { Cell, ColumnChoice, DateOrder, DecimalStyle, Sheet } from "./types";

/**
 * How far down a sheet we look for a remembered row. The same window `guessColumns` uses (rows 1
 * to 30), because a column-names row below that is never offered either; a test keeps the two in
 * step.
 */
export const REMEMBER_SEARCH_ROWS = 30;
/** The widest column-names row we keep, and the longest single name. Past these it is not a header. */
export const MAX_LAYOUT_COLUMNS = 200;
export const MAX_LAYOUT_NAME_CHARS = 120;

/** One header cell as comparable text: NFC form, every run of whitespace (NBSP and line breaks too) one space, trimmed. */
function cellText(cell: Cell | undefined): string {
  let text = "";
  if (typeof cell === "string") text = cell;
  // The same readings table.ts shows the person as the column's label (headerText), so the stored
  // name is the label they saw.
  else if (typeof cell === "number" && Number.isFinite(cell)) text = String(cell);
  else if (cell instanceof Date && !Number.isNaN(cell.getTime()))
    text = cell.toISOString().slice(0, 10);
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * A column-names row as a list of comparable names, one per column.
 *
 * Trailing empty cells are dropped, because the CSV reader hands back every cell a line has
 * (a trailing comma is an empty cell) while the .xlsx reader cuts empty cells off the end — the
 * same export saved either way must give the same list. Empty cells INSIDE the row stay as "" so
 * every name keeps its column position; the position is what gets pre-filled. Case is kept: a
 * different capital letter is a different layout, and a wrong match is worse than a missed one.
 */
export function normalizeHeaderRow(row: Cell[]): string[] {
  const names = row.map(cellText);
  let end = names.length;
  while (end > 0 && names[end - 1] === "") end -= 1;
  return names.slice(0, end);
}

/**
 * The names in a row, but only when the row is safe to remember or to match against; otherwise
 * null. This is the privacy guard: a data row must never become a column-names list.
 *
 * - Every filled cell must be text. `looksLikeHeader` skips number and Date cells instead of
 *   refusing them, and an .xlsx data row holds its dates and amounts as exactly those, so on its own
 *   it would let "Date, Client, 1234.5" through. Real column names are text.
 * - Not absurdly wide or long (MAX_LAYOUT_*): a long cell is a title or a note, not a name.
 * - It passes `looksLikeHeader`: two or more text cells, none of which reads as a date or an amount.
 */
export function rememberableHeaderNames(row: Cell[]): string[] | null {
  if (!row.every((cell) => cell === null || cell === undefined || typeof cell === "string")) {
    return null;
  }
  const names = normalizeHeaderRow(row);
  if (names.length > MAX_LAYOUT_COLUMNS || names.some((n) => n.length > MAX_LAYOUT_NAME_CHARS)) {
    return null;
  }
  return looksLikeHeader(row) ? names : null;
}

/** What is kept about a layout: the names and the person's picks. Holds no cell from the data rows. */
export interface LayoutMemory {
  /** Normalised column names, as `normalizeHeaderRow` makes them. */
  headerNames: string[];
  /** 0-based positions, as in a row. */
  dateColumn: number;
  amountColumn: number;
  /** As the person left it; null when the file's own dates settled the order. */
  dateOrder: DateOrder | null;
  decimalStyle: DecimalStyle;
}

function isColumnIndex(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < MAX_LAYOUT_COLUMNS;
}

/**
 * What to remember from the columns the person settled on, or null when nothing should be kept:
 * the chosen row isn't a column-names row (see `rememberableHeaderNames`), it sits below where a
 * later file would be searched, or the date and amount picks are not two different columns.
 */
export function layoutFromChoice(rows: Cell[][], choice: ColumnChoice): LayoutMemory | null {
  const row = rows[choice.headerRow];
  if (!row || choice.headerRow >= REMEMBER_SEARCH_ROWS) return null;
  const headerNames = rememberableHeaderNames(row);
  if (!headerNames) return null;

  const { dateColumn, amountColumn } = choice;
  if (!isColumnIndex(dateColumn) || !isColumnIndex(amountColumn) || dateColumn === amountColumn) {
    return null;
  }
  return {
    headerNames,
    dateColumn,
    amountColumn,
    dateOrder: choice.dateOrder,
    decimalStyle: choice.decimalStyle,
  };
}

export interface RememberedLayoutMatch<L> {
  /** Index into the `sheets` passed in. */
  sheetIndex: number;
  /** Index into that sheet's `rows` of the column-names row. */
  headerRow: number;
  /** The remembered layout that matched, exactly as it was passed in. */
  layout: L;
}

function sameNames(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

/**
 * Finds a remembered layout in a freshly read file: the first sheet (in order) with a row among
 * its first 30 whose names equal a remembered layout's and which is itself a safe column-names row.
 * The title lines above the names change with every export, so they play no part. A remembered
 * layout whose names are really a data row can never match, because the file's row must pass the
 * same guard. Sheets with nothing in them simply have no row that qualifies.
 *
 * Generic so the caller's own layout record (with its picks) comes back untouched.
 */
export function findRememberedLayout<L extends { headerNames: string[] }>(
  sheets: Sheet[],
  layouts: L[],
): RememberedLayoutMatch<L> | null {
  if (layouts.length === 0) return null;
  // Normalised again here so a list kept by an older version of the rules still compares fairly.
  const remembered = layouts.map((layout) => ({
    layout,
    names: normalizeHeaderRow(layout.headerNames),
  }));

  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    const rows = sheets[sheetIndex].rows;
    for (
      let headerRow = 0;
      headerRow < Math.min(REMEMBER_SEARCH_ROWS, rows.length);
      headerRow += 1
    ) {
      const names = rememberableHeaderNames(rows[headerRow]);
      if (!names) continue;
      const hit = remembered.find((candidate) => sameNames(candidate.names, names));
      if (hit) return { sheetIndex, headerRow, layout: hit.layout };
    }
  }
  return null;
}
