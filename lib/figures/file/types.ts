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
  /**
   * Excel only: the cells holding a formula saved with no value (read-xlsx.ts). The reader can only
   * give such a cell as empty, since DotAmi never works a formula out itself, so this says which
   * "empty" cells are really sums Excel never calculated, and the person is told so rather than
   * "no amount". Absent for a CSV, which has no formulas.
   */
  unsavedFormulas?: CellPlace[];
}

/** Where a cell is in a sheet, 0-based: `rows[row][column]`. */
export interface CellPlace {
  row: number;
  column: number;
}

export type ReadResult =
  { ok: true; format: "csv" | "xlsx"; sheets: Sheet[] } | { ok: false; error: string };

/** The largest file DotAmi reads. Checked before a single byte is read, so a huge file can't freeze the window. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** How a date like 03/01/2026 is written: year first (2026-03-01), month first, or day first. */
export type DateOrder = "ymd" | "mdy" | "dmy";

/**
 * Which hundred years a two-digit year is read in: 2000 reads "05" as 2005, 1900 reads it as 1905.
 * Only ever the person's own answer, for one file ("Is 05 the year 2005?"); DotAmi never picks it.
 */
export type Century = 1900 | 2000;

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
  /**
   * The column holding each row's status (an invoice list's "Status"), if the person picked one.
   * Rows marked void, voided, deleted or draft are left out: none of them was ever a sale. Unset
   * or null: every row counts.
   */
  statusColumn?: number | null;
  /**
   * The column holding refunds paid back to customers, if the person picked one: a ledger export's
   * Debit column, where the sales are in Credit (Wave's Account Transactions). Each amount in it is
   * money out, taken off the month of that row's date (lib/figures/refunds.ts). Unset or null:
   * refunds are not taken off, and a row with only a refund in it has no amount.
   */
  refundColumn?: number | null;
  /** Needed only for dates like 03/01/2026; null when every date in the column is unambiguous. */
  dateOrder: DateOrder | null;
  /**
   * The person's answer about a two-digit year (12-03-05). Unset or null: a date written with a
   * two-digit year is not read, and its row is listed as "no date".
   */
  century?: Century | null;
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
  /**
   * Set only when a refunds column took something off this month: how many rows had a refund in
   * it, and the size of what was taken off (positive cents), so the screen can say so beside the
   * total. Absent for every month when no refunds column is picked.
   */
  refunds?: { rows: number; cents: number };
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
 * unsaved-formula — the amount (or the date) is an Excel formula saved with no value: the cell
 *              looks empty, but it is a sum Excel never worked out, and DotAmi never guesses it
 * payment    — the type column says Payment or Deposit: money received for a sale the file already lists
 * void-or-draft — the status column says void, voided, deleted or draft: an invoice that was never a sale
 * not-over   — its month hasn't ended yet, so there's no total for it yet
 */
export type SkipReason =
  | "blank"
  | "total"
  | "no-date"
  | "no-amount"
  | "bad-amount"
  | "unsaved-formula"
  | "payment"
  | "void-or-draft"
  | "not-over";

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
  /**
   * The earliest and latest day read from the date column (YYYY-MM-DD), over every row whose date
   * was read, whether it was added up or not (a month not over yet, no amount). Shown to the person
   * in words so a date read the wrong way stands out. Null when no row had a date DotAmi could read.
   */
  datesRead: { first: string; last: string } | null;
}

/**
 * [8c-3] Months across the top: a report with one column per month (FreshBooks' Revenue by Client)
 * instead of one row per sale with a date. `month` is the month a column's name was read as.
 */
export interface MonthColumn {
  /** 0-based position in a row. */
  column: number;
  /** YYYY-MM */
  month: string;
}

/**
 * Why a whole row under the month names wasn't read, when every row is added up.
 *
 * blank     — every cell empty
 * total     — a cell outside the month columns says "Total", "Grand total"…: the report's own sum
 * no-amount — nothing at all under any month (a heading, a note, a client with no figures)
 */
export type AcrossRowReason = "blank" | "total" | "no-amount";

/**
 * Why one cell under a month wasn't added, in a row that was otherwise read.
 *
 * empty           — nothing in the cell
 * bad-amount      — something DotAmi can't read as an amount with certainty
 * unsaved-formula — an Excel formula saved with no value (see SkipReason)
 */
export type AcrossCellReason = "empty" | "bad-amount" | "unsaved-formula";

/** What adding up a months-across table gives. Every cell under a month is accounted for. */
export interface AcrossResult {
  /** Oldest first; only months that have ended. `rows` is how many rows' cells were added into the month. */
  months: MonthTotal[];
  /** Rows with at least one cell added into a month. */
  rowsCounted: number;
  /** Whole rows left out, 1-based as the person sees them in Excel. */
  skippedRows: { row: number; reason: AcrossRowReason }[];
  /** Single cells left out: 1-based row, 0-based column (the screen writes it "C6", as Excel does). */
  skippedCells: { row: number; column: number; reason: AcrossCellReason }[];
  /** Month columns left out whole because the month hasn't ended yet. */
  notOver: MonthColumn[];
  /**
   * The earliest and latest month read from the column names (YYYY-MM), over every month column,
   * a month not over yet included. Shown in words so a column read as the wrong month stands out.
   */
  monthsRead: { first: string; last: string } | null;
}
