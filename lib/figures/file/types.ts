/**
 * [8c] Drop a file — shared types.
 *
 * A spreadsheet is read inside the app's own window, in memory. Its bytes never go to the server
 * or the disk: only the monthly totals the person goes on to agree to leave the page, through
 * /api/figures/propose like every other figure (docs/architecture/figures-privacy-review.md).
 * Nothing in lib/figures/file keeps the file, and nothing in it logs a cell.
 */

/** One cell as the readers hand it over: text from a CSV; text, a number, true/false or a date from Excel. */
export type Cell = string | number | boolean | Date | null;

/**
 * A sheet as rows of cells, exactly as read — no row dropped, none guessed at. `rows[i]` is the
 * row the person sees as row `i + 1` in Excel (or line `i + 1` of a CSV without line breaks
 * inside quotes), so "row 14" in a message points at the right place.
 */
export interface Sheet {
  name: string;
  rows: Cell[][];
}

export type ReadResult =
  { ok: true; format: "csv" | "xlsx"; sheets: Sheet[] } | { ok: false; error: string };

/** The largest file DotAmi reads. Checked before a single byte is read, so a huge file can't freeze the window. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** How a date like 03/01/2026 is written: year first (2026-03-01), month first, or day first. */
export type DateOrder = "ymd" | "mdy" | "dmy";

/** How an amount is written: 1,234.56 ("point") or 1 234,56 ("comma", French and most of Europe). */
export type DecimalStyle = "point" | "comma";

/** What the person told DotAmi about the file's columns (guessed first, always shown to them to check). */
export interface ColumnChoice {
  /** Index into `rows` of the row holding the column names; data starts on the row after it. */
  headerRow: number;
  dateColumn: number;
  amountColumn: number;
  /**
   * The column holding each row's transaction type (QuickBooks' "Transaction Type"), if the person
   * picked one. Rows typed Payment or Deposit are left out so a sale isn't counted again as the
   * money arriving. Unset or null: every row counts.
   */
  typeColumn?: number | null;
  /** Needed only for dates like 03/01/2026; null when every date in the column is unambiguous. */
  dateOrder: DateOrder | null;
  decimalStyle: DecimalStyle;
}

/** One calendar month's total — the shape lib/brain/records.ts adds up into quarters. */
export interface MonthTotal {
  /** YYYY-MM-01 */
  periodStart: string;
  /** The month's last day, YYYY-MM-DD. */
  periodEnd: string;
  /** Integer cents; negative when refunds outweigh sales that month. */
  amountCents: number;
  /** How many rows of the file were added up into this total. */
  rows: number;
}

/**
 * Why a row below the column names wasn't added to any total. Every skipped row is reported to the
 * person — none is dropped silently.
 *
 * blank      — every cell empty
 * total      — no date, and a cell says "Total", "Grand total", "Sous-total"…: a report's own sum row
 * no-date    — no date DotAmi can read with certainty (notes, headings, a merged cell's empty half)
 * no-amount  — a date but an empty amount cell
 * bad-amount — a date but an amount DotAmi can't read with certainty
 * payment    — the type column says Payment or Deposit: money received for a sale the file already lists
 * not-over   — its month hasn't ended yet, so there's no total for it yet
 */
export type SkipReason =
  "blank" | "total" | "no-date" | "no-amount" | "bad-amount" | "payment" | "not-over";

export interface SkippedRow {
  /** 1-based, as the person sees it in Excel. */
  row: number;
  reason: SkipReason;
}

export interface TotalsResult {
  /** Oldest first; only months that have ended by `today`. */
  months: MonthTotal[];
  /** Rows added into `months`. */
  rowsCounted: number;
  skipped: SkippedRow[];
}
