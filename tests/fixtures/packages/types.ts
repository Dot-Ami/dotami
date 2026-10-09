/**
 * The shape every practice file shares (docs/connectors/practice-files.md).
 *
 * A practice file is an INVENTED spreadsheet laid out the way an accounting program's help pages
 * say its export looks. It is built in code (never committed as a binary), so a reviewer can read
 * every cell in the diff. No real export, no real person and no real figure is used anywhere.
 */
import type { DateOrder, DecimalStyle, MonthTotal, SkippedRow } from "@/lib/figures/file/types";

/** One vendor page a layout fact comes from. */
export interface VendorSource {
  url: string;
  /** The day the page was read (YYYY-MM-DD). Vendors change these pages; a later reader re-checks. */
  read: string;
  /** The one fact the page was used for. */
  says: string;
}

/**
 * Where a column header came from.
 *   documented - the vendor's page spells this exact name.
 *   assumed    - nobody has published this name; it is our best guess, shaped from `basis`. A real
 *                export may differ, so a test passing on it proves nothing about the real file.
 */
export interface ColumnNote {
  header: string;
  status: "documented" | "assumed";
  /** The vendor page (a `url` in the module's `sources`) the name is documented on, or guessed from. */
  basis: string;
}

/** What the screen's steps must come out as for one practice file. */
export interface Expected {
  /**
   * What guessColumns says for the whole sheet (0-based row and columns). Where this records a
   * guess that is wrong, the fixture says so beside the value; a gap not yet fixed is pinned by an
   * `it.fails` test in tests/figures-file-packages.spec.ts saying what it should be.
   */
  guess: { headerRow: number; dateColumn: number | null; amountColumn: number | null } | null;
  /**
   * What the person picks where the guess leaves one empty or wrong (0-based). `headerRow` is the
   * screen's "Column names are in row" select, set when DotAmi found no column names (guess null)
   * or took the wrong row for them. `refundColumn` is the optional refunds pick, which is never
   * pre-filled, so a file that needs it always records it here.
   */
  picks?: { headerRow?: number; dateColumn?: number; amountColumn?: number; refundColumn?: number };
  /**
   * WRONG TODAY when set: the reader splits the rows on the wrong character, so the file's column
   * titles never come out as columns. `readAs` is what the column-names row reads as today; the
   * spec checks the titles are exactly that (so this pins one particular misreading, not any wrong
   * reading), and an `it.fails` test says what they should be.
   */
  columnsMisread?: { readAs: string[] };
  /** What the date column says about how its dates are written, and the answer asked of the person if it can't say. */
  dateOrder: { order: DateOrder | null; ambiguous: boolean; conflicting: boolean };
  answer?: DateOrder;
  decimalStyle: DecimalStyle;
  /** The months, to the cent, with how many rows each adds up. */
  months: MonthTotal[];
  /** Every row the totals leave out: 1-based row number and the reason. */
  skipped: SkippedRow[];
}

export interface PracticeFile {
  /** Short and unique across all packages: "xero-dmy". */
  id: string;
  /** One line: what this file is shaped like. */
  shape: string;
  /** The name the file would have been saved under. */
  fileName: string;
  bytes: () => Uint8Array;
  columns: ColumnNote[];
  expected: Expected;
}
