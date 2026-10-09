/**
 * [8c] Adding a sheet's rows up into one total per calendar month.
 *
 * Every row below the column names is accounted for: either it is added into a month or it is
 * listed as skipped with the reason, so the person can see exactly what the totals leave out.
 * Nothing here logs, and no error message ever carries an amount or a cell's text.
 */
import type { FigureView } from "../types";
import { cellToCents } from "./amounts";
import { cellToDay } from "./dates";
import { isBlankRow } from "./table";
import type {
  Cell,
  ColumnChoice,
  MonthTotal,
  SkippedRow,
  SkipReason,
  TotalsResult,
} from "./types";

/**
 * The text of a report's own sum row: "Total", "Total for Customer A", "Grand total", "Subtotal",
 * "Sous-total", "Total général", "Totaux". Anchored at the start, and not followed by another
 * letter, so "Totally new client" is just a note.
 */
export const TOTAL_ROW_LABEL =
  /^\s*(?:grand[\s-]+total|sub[\s-]?total|sous[\s-]?total|totals|totaux|total)(?!\p{L})/iu;

/**
 * What a transaction's type cell says when the row is the money arriving for a sale the file
 * already lists as a separate row (so adding it would count the sale twice). Matched on the whole
 * cell, trimmed and ignoring case; "Payment received" or "Deposit slip" is not one.
 *
 * "payment" and "deposit" are the words Intuit's Transaction List documents for QuickBooks Online.
 * "paiement" and "dépôt" are ASSUMED: no French QuickBooks export has been seen, so they are the
 * obvious translations, nothing more. Every other type (Invoice, Sales Receipt, Credit Memo...)
 * counts as a sale or a refund, exactly as it does without a type column.
 */
const PAYMENT_TYPES = new Set(["payment", "deposit", "paiement", "dépôt"]);

/** True when a type cell names a payment or deposit (see PAYMENT_TYPES). */
export function isPaymentType(cell: Cell | undefined): boolean {
  return typeof cell === "string" && PAYMENT_TYPES.has(cell.trim().toLowerCase());
}

/**
 * What an invoice's status cell says when the invoice was never a sale: voided, deleted or never
 * sent. Matched on the whole cell, trimmed, ignoring case and accents, so "Draft sent to client" or
 * "Not void" is not one, and only the column the person chose is ever read: a memo that happens to
 * say "Draft" can't hide a sale.
 *
 * Where each word comes from (see tests/fixtures/packages/ and docs/connectors/practice-files.md):
 *  - "Draft" is published: FreshBooks' Invoice Details help page names it as a status (read 2026-10-08).
 *  - "Void" (Sage Accounting) and "Voided" (Xero) are ASSUMED. Sage's help page says to void an
 *    invoice rather than delete it (read 2026-10-08), and Xero's says its Receivable Invoice Detail
 *    report includes voided and deleted invoices by default (as of 2026-10-06), but neither page
 *    shows the word the status cell holds.
 *  - "Deleted" is ASSUMED the same way, from that Xero page.
 *  - The French words (annulé / annulée, supprimé / supprimée, brouillon) are ASSUMED: no French
 *    export has been seen, so they are the obvious translations, nothing more. They are kept
 *    without accents here because the cell is compared with its accents taken off ("Annulée" and
 *    "annulee" both match).
 */
const LEFT_OUT_STATUSES = new Set([
  "void",
  "voided",
  "deleted",
  "draft",
  "annule",
  "annulee",
  "supprime",
  "supprimee",
  "brouillon",
]);

/** A cell's text trimmed, lower-cased and with its accents taken off ("Annulée" -> "annulee"). */
function plainWord(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** True when a status cell says the invoice is void, deleted or a draft (see LEFT_OUT_STATUSES). */
export function isLeftOutStatus(cell: Cell | undefined): boolean {
  return typeof cell === "string" && LEFT_OUT_STATUSES.has(plainWord(cell));
}

/**
 * The shared "which rows count" rule: why the person's optional columns leave a row out, or null
 * when they don't. Both columns are optional and each reads only its own cell. A status column is
 * checked first, so a voided payment is listed as void (it is neither a sale nor money received).
 * Called before the date and amount are read, so a row left out here is told so even when its
 * date or amount couldn't be read.
 */
export function leftOutByColumns(row: Cell[], choice: ColumnChoice): SkipReason | null {
  if (choice.statusColumn != null && isLeftOutStatus(row[choice.statusColumn])) {
    return "void-or-draft";
  }
  if (choice.typeColumn != null && isPaymentType(row[choice.typeColumn])) return "payment";
  return null;
}

function isEmpty(cell: Cell | undefined): boolean {
  return cell === null || cell === undefined || (typeof cell === "string" && cell.trim() === "");
}

/** The last day of a YYYY-MM month, written YYYY-MM-DD (leap years included). */
function lastDayOfMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/**
 * Walks every row after the column names and totals the amounts by month. Only months that have
 * ended by `today` (YYYY-MM-DD) are totalled: a month still running has no total yet.
 */
export function monthlyTotals(rows: Cell[][], choice: ColumnChoice, today: string): TotalsResult {
  // Blank rows after the last real row are just the sheet's trailing space, not part of the table.
  let lastRow = rows.length - 1;
  while (lastRow > choice.headerRow && isBlankRow(rows[lastRow])) lastRow -= 1;

  const sums = new Map<string, { cents: bigint; rows: number }>();
  const skipped: SkippedRow[] = [];
  let rowsCounted = 0;

  for (let i = choice.headerRow + 1; i <= lastRow; i += 1) {
    const row = rows[i];
    const skip = (reason: SkippedRow["reason"]) => skipped.push({ row: i + 1, reason });

    if (isBlankRow(row)) {
      skip("blank");
      continue;
    }

    // The optional Status and Type columns come first. A void, deleted or draft invoice was never
    // a sale; in QuickBooks a Payment or Deposit is usually money received for a sale on another
    // row (a Deposit can also be the only record of a sale — the screen's hint says so). Either is
    // left out whatever else is wrong with the row, so the person is told why rather than "no date".
    const byColumns = leftOutByColumns(row, choice);
    if (byColumns !== null) {
      skip(byColumns);
      continue;
    }

    const day = cellToDay(row[choice.dateColumn] ?? null, choice.dateOrder);
    if (day === null) {
      const isSumRow = row.some((cell) => typeof cell === "string" && TOTAL_ROW_LABEL.test(cell));
      skip(isSumRow ? "total" : "no-date");
      continue;
    }

    const amountCell = row[choice.amountColumn];
    if (isEmpty(amountCell)) {
      skip("no-amount");
      continue;
    }
    const cents = cellToCents(amountCell ?? null, choice.decimalStyle);
    if (cents === null) {
      skip("bad-amount");
      continue;
    }

    const month = day.slice(0, 7);
    // ISO dates compare correctly as text: a month that ends after today isn't over.
    if (lastDayOfMonth(month) > today) {
      skip("not-over");
      continue;
    }

    // BigInt, so a very long sheet can never silently lose a cent to floating point.
    const sum = sums.get(month) ?? { cents: 0n, rows: 0 };
    sum.cents += BigInt(cents);
    sum.rows += 1;
    sums.set(month, sum);
    rowsCounted += 1;
  }

  const months: MonthTotal[] = [];
  for (const month of [...sums.keys()].sort()) {
    const sum = sums.get(month)!;
    const amount = Number(sum.cents);
    if (!Number.isSafeInteger(amount) || BigInt(amount) !== sum.cents) {
      throw new Error("A month's total is too large to hold exactly.");
    }
    months.push({
      periodStart: `${month}-01`,
      periodEnd: lastDayOfMonth(month),
      amountCents: amount,
      rows: sum.rows,
    });
  }

  return { months, rowsCounted, skipped };
}

/**
 * Splits proposed months into those the figures store already holds (same month, same amount,
 * same currency, still proposed or confirmed) and the fresh ones. A discarded or retracted figure
 * doesn't count as known, and neither does the same month with a different amount — that is
 * something new for the person to look at.
 */
export function splitAlreadyKnown(
  months: MonthTotal[],
  existing: Pick<
    FigureView,
    "kind" | "periodStart" | "periodEnd" | "amountCents" | "currency" | "status"
  >[],
  currency: string,
): { fresh: MonthTotal[]; known: MonthTotal[] } {
  const fresh: MonthTotal[] = [];
  const known: MonthTotal[] = [];
  for (const month of months) {
    const isKnown = existing.some(
      (figure) =>
        (figure.status === "proposed" || figure.status === "confirmed") &&
        figure.kind === "gross-revenue" &&
        figure.periodStart === month.periodStart &&
        figure.periodEnd === month.periodEnd &&
        figure.amountCents === month.amountCents &&
        figure.currency === currency,
    );
    (isKnown ? known : fresh).push(month);
  }
  return { fresh, known };
}
