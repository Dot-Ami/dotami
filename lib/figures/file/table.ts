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
  /** The column of transaction types, pre-filled only for a header that is exactly that (see TYPE_HEADER). */
  typeColumn: number | null;
  /** The column of invoice statuses, pre-filled only for a header that is exactly "Status" or "Statut" (see STATUS_HEADER). */
  statusColumn: number | null;
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

/**
 * A row can be the header when it has two or more text cells and none of them is a date or an amount.
 * Exported for [8c-2] (layout.ts): it is the guard that keeps a data row from being remembered as
 * column names. Note it looks at text cells only — a number or Date cell is skipped, not refused.
 */
export function looksLikeHeader(row: Cell[]): boolean {
  return headerLabelCount(row) >= 2;
}

/**
 * How many column names a row holds: its text cells, or 0 when any text cell reads as a date or an
 * amount (then it is a data row, not column names). Used to tell a short summary above a table
 * from the table's own, wider row of column names.
 */
function headerLabelCount(row: Cell[]): number {
  let labels = 0;
  for (const cell of row) {
    if (typeof cell !== "string" || cell.trim() === "") continue;
    if (readsAsDate(cell) || readsAsAmount(cell)) return 0;
    labels += 1;
  }
  return labels;
}

/**
 * Share (0 to 1) of a column's non-blank cells that `reads` accepts; 0 when the column is empty.
 * Cells for which `ignore` says true are left out of the count altogether (neither for nor against).
 */
function columnScore(
  dataRows: Cell[][],
  column: number,
  reads: (cell: Cell | undefined) => boolean,
  ignore?: (row: Cell[], cell: Cell) => boolean,
): number {
  let filled = 0;
  let readable = 0;
  for (const row of dataRows) {
    const cell = row[column];
    if (isEmptyCell(cell)) continue;
    if (ignore?.(row, cell)) continue;
    filled += 1;
    if (reads(cell)) readable += 1;
  }
  return filled === 0 ? 0 : readable / filled;
}

const DATE_HEADER = /\b(date|day|jour|posted|issued)\b/i;
/**
 * A date column that says when money is DUE, not when the sale happened. It is never chosen by its
 * header, so a Xero export's DueDate never beats its InvoiceDate. A sheet whose only date column is
 * a due date still gets it through the "only column that is mostly dates" fallback below, but a
 * sheet with some OTHER date column we could not name gets nothing: an empty dropdown beats filing
 * a July sale under August. The words are matched with a letter-aware boundary because the word-edge marker only
 * knows ASCII letters and would never see the start of "échéance".
 */
const DUE_DATE_HEADER = /(?<![\p{L}\p{N}])(due|échéance|echeance)(?![\p{L}\p{N}])/iu;
/**
 * Header text with word breaks put back where a program wrote its names without spaces:
 * "InvoiceDate" and "Invoice_Date" become "Invoice Date", so the \b in DATE_HEADER can see the word
 * "date". Only the date test uses it; the amount patterns already match inside a word.
 */
function spacedLabel(label: string): string {
  return label.replace(/([a-zà-ÿ0-9])([A-ZÀ-Þ])/g, "$1 $2").replace(/[_.]+/g, " ");
}
/** True when one of the row's text cells names a sale-date column ("Date", "Issue Date"; not a due date). */
function namesDateColumn(row: Cell[]): boolean {
  return row.some((cell) => {
    if (typeof cell !== "string") return false;
    const label = spacedLabel(cell);
    return DATE_HEADER.test(label) && !DUE_DATE_HEADER.test(label);
  });
}
/**
 * A cell that is not a date because it names a group or a total, not a transaction: a customer name
 * sitting alone on its row, or a "Total for ..." line. Grouped reports (QuickBooks' Sales by
 * Customer Detail) put these in the same column as the dates, and with one line per customer they
 * would outnumber the dates and sink the date column's score, so the date test skips them.
 */
const TOTAL_LABEL = /^\s*(grand[\s-]+total|total|subtotal|sub-total|sous-total)\b/i;
function isGroupOrTotalLabel(row: Cell[], cell: Cell): boolean {
  if (typeof cell !== "string") return false;
  // Alone on its row: a group's heading, a title or a footer note. No transaction is one cell wide.
  if (row.filter((c) => !isEmptyCell(c)).length === 1) return true;
  return TOTAL_LABEL.test(cell);
}
const AMOUNT_HEADER_FIRST = /^\s*(amount|montant|sub[\s-]?total|sous[\s-]?total)\b/i;
const AMOUNT_HEADER_ANY =
  /(amount|montant|revenue|revenu|sales|ventes|income|subtotal|sous-total)/i;
/**
 * The only header pre-filled as the transaction-type column: exactly "Transaction Type", in any case
 * and with any spacing — the name QuickBooks' Transaction List uses. A bare "Type" is left for the
 * person to pick: on someone's own sheet it can hold words like "Payment" for real sales, and a
 * pre-filled pick would quietly leave those out. The cells are never read to guess the column, and a
 * header that merely contains the word ("Type of work", "Account Type") is never pre-filled either.
 */
const TYPE_HEADER = /^transaction\s*type$/i;
/**
 * The only headers pre-filled as the status column: exactly "Status" or "Statut", in any case. Both
 * are ASSUMED titles: the FreshBooks, Sage Accounting and Xero help pages name a status for each
 * invoice but none shows the column's title (see tests/fixtures/packages/), and no French export has
 * been seen. A longer name ("Payment Status", "Status Date")
 * is left for the person to pick, and the cells are never read to guess the column. Pre-filling is
 * safe in a way a bare "Type" is not: only a cell that is exactly void, voided, deleted or draft
 * is ever left out, and every such row is listed with its reason.
 */
const STATUS_HEADER = /^(status|statut)$/i;

/** "Total" columns: in many invoice exports the total includes the sales tax collected. */
const TOTAL_HEADER = /^\s*(total|grand[\s-]+total)\b/i;
/**
 * Columns that look like money but aren't the revenue figure: tax, running balances, counts, ids,
 * and the price of ONE item. A price per item ("UnitAmount", "Unit Price", "Rate", "Price each",
 * "Prix unitaire") is not what was sold when more than one item was: Xero's UnitAmount gave July
 * $150 against a true $350. The per-item words only count as a phrase ("unit price", "price each",
 * "per item"), never alone: "Total Price" beside a "Unit Price" is the line total and stays
 * pre-fillable, and "Community sales" or "Business Unit Revenue" are not per-item either.
 *
 * The price-per-item phrases, in order: "unit amount/price/cost" (UnitAmount, Unit_Price), "unitaire"
 * (Prix unitaire), "price each", "amount per item", "sales price", a bare "Price", and a money word
 * followed by "(each)", "/unit" or "(per unit)" at the end ("Amount (each)", "Amount/unit").
 */
const PER_ITEM_HEADER =
  /\bunit[\s_-]*(amount|price|cost|rate|value)|unitaire|(price|amount|cost|prix|montant)[\s_-]*(each|ea\b)|per[\s_-]+(item|unit)|(sales|selling|list|retail)[\s_-]*price|^\s*(price|prix)\s*$|(price|amount|cost|prix|montant)\s*[(/]\s*((per|par)\s+)?(each|ea|unit|unité|unite|item)\s*\)?\s*$/i;
const NOT_REVENUE_HEADER =
  /(tax|gst|hst|pst|qst|tps|tvq|tvh|balance|solde|qty|quantity|quantité|rate|taux|\bid\b|number|\bno\.|#)/i;

/**
 * Guesses where the table starts and which columns are the date and the amount. Returns null when
 * no row looks like column names above at least one date — the person is then asked to pick the
 * row themselves.
 *
 * `keepFirstRow`: the person has said the first row holds the column names (the rows passed start
 * at their pick), so a wider row further down never takes its place.
 */
export function guessColumns(
  rows: Cell[][],
  options: { keepFirstRow?: boolean } = {},
): ColumnGuess | null {
  const searchEnd = Math.min(HEADER_SEARCH_ROWS, rows.length);
  /** True when a date sits in the rows just below row r: a header with none is a title or a note. */
  const datesBelow = (r: number) =>
    rows.slice(r + 1, r + 1 + DATE_LOOKAHEAD_ROWS).some((row) => row.some((c) => readsAsDate(c)));

  let headerRow = -1;
  for (let r = 0; r < searchEnd; r += 1) {
    if (looksLikeHeader(rows[r]) && datesBelow(r)) {
      headerRow = r;
      break;
    }
  }
  if (headerRow === -1) return null;

  // A short summary above the table (FreshBooks' Invoice Details: "Total Invoiced, Total Paid" over
  // two figures) also reads as column names with dates further down. When the row found so far
  // names no date column, a WIDER row below it that does name one wins: that is the table's own.
  // A row that already names its date column is kept, so a note row under a simple "Date, Amount"
  // header is never taken for the header. The search stops at the first dated row (the table has
  // started) and never runs when the person picked the row themselves.
  if (!options.keepFirstRow && !namesDateColumn(rows[headerRow])) {
    const labels = headerLabelCount(rows[headerRow]);
    for (let r = headerRow + 1; r < searchEnd; r += 1) {
      if (rows[r].some((cell) => readsAsDate(cell))) break;
      if (headerLabelCount(rows[r]) > labels && namesDateColumn(rows[r]) && datesBelow(r)) {
        headerRow = r;
        break;
      }
    }
  }

  const columns = columnsOf(rows, headerRow);
  const dataRows = rows
    .slice(headerRow + 1)
    .filter((row) => !isBlankRow(row))
    .slice(0, SAMPLE_ROWS);

  // Date column: a header that says "date" and mostly dates beneath it, else the only column that is mostly dates.
  // Group names and "Total for" rows don't count against a column (see isGroupOrTotalLabel).
  const dateScores = columns.map((c) =>
    columnScore(dataRows, c.index, readsAsDate, isGroupOrTotalLabel),
  );
  // A header that says "date" and is mostly dates; the best score wins. Due-date headers are skipped.
  let dateColumn: number | null = null;
  let bestDate = -1;
  for (const c of columns) {
    const label = spacedLabel(c.label);
    if (!DATE_HEADER.test(label) || DUE_DATE_HEADER.test(label)) continue;
    if (dateScores[c.index] >= 0.5 && dateScores[c.index] > bestDate) {
      bestDate = dateScores[c.index];
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
      if (NOT_REVENUE_HEADER.test(c.label) || PER_ITEM_HEADER.test(c.label)) continue;
      if (!pattern.test(c.label)) continue;
      const score = columnScore(dataRows, c.index, readsAsAmount);
      if (score >= 0.5 && score > bestScore) {
        bestScore = score;
        amountColumn = c.index;
      }
    }
    if (amountColumn !== null) break;
  }

  // Type column: one header that is exactly a type header. Two of them and nothing is pre-filled.
  const typeColumns = columns.filter(
    (c) => c.index !== dateColumn && c.index !== amountColumn && TYPE_HEADER.test(c.label.trim()),
  );
  const typeColumn = typeColumns.length === 1 ? typeColumns[0].index : null;

  // Status column: the same rule, one header that is exactly "Status" or "Statut".
  const statusColumns = columns.filter(
    (c) =>
      c.index !== dateColumn &&
      c.index !== amountColumn &&
      c.index !== typeColumn &&
      STATUS_HEADER.test(c.label.trim()),
  );
  const statusColumn = statusColumns.length === 1 ? statusColumns[0].index : null;

  return { headerRow, columns, dateColumn, amountColumn, typeColumn, statusColumn };
}
