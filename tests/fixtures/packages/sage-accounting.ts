/**
 * Practice files shaped like Sage Accounting (Canada, the cloud product) lists and reports
 * exported to CSV.
 *
 * EVERYTHING HERE IS INVENTED. The company, the clients and every amount are made up; nothing was
 * taken from a real export. The only things taken from Sage are layout facts from its own Canadian
 * knowledge-base pages, each listed in `sources` with the day it was read.
 *
 * What the pages say, as read on 2026-10-08:
 *  - reports export to PDF or CSV, and the listings on the Sales tab export to CSV or PDF with the
 *    columns the person has set to show (page last modified 14 April 2026);
 *  - in the Sales list the person adds, removes and reorders columns, but Invoice Number is always
 *    first and can't be moved; the CSV holds the visible columns. Sage recommends voiding a
 *    non-draft invoice rather than deleting it, to keep the CRA's sequential numbers;
 *  - the Sales Day Book shows each transaction's type and amounts, Detailed or Summary, exports to
 *    CSV or PDF, and credit notes are found by a NEGATIVE amount (page last modified 28 April 2026).
 * What the pages do NOT say, and so is assumed below: every column title but "Invoice Number", the
 * order of the others, how dates are written (dd/mm/yyyy here), the word on a voided invoice
 * ("Void"), that a voided invoice stays in the list with its amount, that credit notes sit in the
 * same list, and the Day Book's totals row. The 2026-10-06 design pass read the Sales list page as
 * naming "invoice date, customer name, amount and status"; on 2026-10-08 the page named no default
 * column, so those are assumed too.
 *
 * Today's wrong answer, pinned as a "fails today" test: the voided invoice is counted as a sale.
 */
import { csv } from "./csv";
import { utf8 } from "../../helpers/encode";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-08";
const EXPORT_PAGE =
  "https://ca-kb.sage.com/portal/app/portlets/results/viewsolution.jsp?solutionid=210129222721353";
const SALES_LIST_PAGE =
  "https://ca-kb.sage.com/portal/app/portlets/results/viewsolution.jsp?solutionid=240304191727837";
const DAY_BOOK_PAGE =
  "https://ca-kb.sage.com/portal/app/portlets/results/viewsolution.jsp?solutionid=240304191731950";

// These addresses carry a query (?solutionid=), which is how Sage's knowledge base names an
// article. It holds an article number, nothing from a file; the spec allows exactly this pattern.
export const sources: VendorSource[] = [
  {
    url: EXPORT_PAGE,
    read: READ,
    says: "reports export to PDF or CSV; Sales-tab listings export to CSV or PDF with the columns set to show",
  },
  {
    url: SALES_LIST_PAGE,
    read: READ,
    says: "Invoice Number is always the first column; the CSV holds the visible columns; void a non-draft invoice, don't delete it",
  },
  {
    url: DAY_BOOK_PAGE,
    read: READ,
    says: "the Sales Day Book shows each transaction's type and amounts, exports to CSV or PDF; credit notes are negative",
  },
];

const documented = (header: string): ColumnNote => ({
  header,
  status: "documented",
  basis: SALES_LIST_PAGE,
});
const assumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: SALES_LIST_PAGE,
});
const assumedDayBook = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: DAY_BOOK_PAGE,
});

const LIST_COLUMNS: ColumnNote[] = [
  documented("Invoice Number"), // 0: always first
  assumed("Date"), // 1
  assumed("Customer"), // 2
  assumed("Net"), // 3: before tax
  assumed("Tax"), // 4
  assumed("Total"), // 5: with tax; never pre-filled beside a tax column
  assumed("Status"), // 6
];
const LIST_NET = 3;

const DAY_BOOK_COLUMNS: ColumnNote[] = [
  assumedDayBook("Date"), // 0
  assumedDayBook("Type"), // 1: a bare "Type" is never pre-filled
  assumedDayBook("Reference"), // 2
  assumedDayBook("Customer"), // 3
  assumedDayBook("Net"), // 4
  assumedDayBook("Tax"), // 5
  assumedDayBook("Total"), // 6
];
const DAY_BOOK_NET = 4;

interface SaleDoc {
  number: string;
  date: string;
  customer: string;
  kind: "Sales Invoice" | "Sales Credit Note";
  netCents: number;
  taxCents: number;
  status: "Paid" | "Unpaid" | "Void";
}

/** A day above 12 in each month, so dd/mm/yyyy proves its own order. */
export const SALES: SaleDoc[] = [
  {
    number: "SI-1",
    date: "2026-07-03",
    customer: "Invented Client A",
    kind: "Sales Invoice",
    netCents: 60000,
    taxCents: 3000,
    status: "Paid",
  },
  {
    number: "SI-2",
    date: "2026-07-16",
    customer: "Invented Client B",
    kind: "Sales Invoice",
    netCents: 15000,
    taxCents: 750,
    status: "Paid",
  },
  // Voided to keep the numbers in sequence: not a sale. Counted today.
  {
    number: "SI-3",
    date: "2026-08-07",
    customer: "Invented Client C",
    kind: "Sales Invoice",
    netCents: 20000,
    taxCents: 1000,
    status: "Void",
  },
  {
    number: "SCN-1",
    date: "2026-08-20",
    customer: "Invented Client B",
    kind: "Sales Credit Note",
    netCents: -5000,
    taxCents: -250,
    status: "Paid",
  },
  {
    number: "SI-4",
    date: "2026-09-25",
    customer: "Invented Client A",
    kind: "Sales Invoice",
    netCents: 42550,
    taxCents: 2128,
    status: "Unpaid",
  },
  // 5 October: a month not over on 2026-10-06.
  {
    number: "SI-5",
    date: "2026-10-05",
    customer: "Invented Client C",
    kind: "Sales Invoice",
    netCents: 8000,
    taxCents: 400,
    status: "Unpaid",
  },
];

const money = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
};
const dmy = (iso: string): string => iso.split("-").reverse().join("/");

function salesListText(): string {
  return csv([
    LIST_COLUMNS.map((c) => c.header),
    ...SALES.map((s) => [
      s.number,
      dmy(s.date),
      s.customer,
      money(s.netCents),
      money(s.taxCents),
      money(s.netCents + s.taxCents),
      s.status,
    ]),
  ]);
}

/** The Day Book, Detailed: the same documents (the void left out, as assumed), then a totals row. */
function dayBookText(): string {
  const shown = SALES.filter((s) => s.status !== "Void");
  const net = shown.reduce((sum, s) => sum + s.netCents, 0);
  const tax = shown.reduce((sum, s) => sum + s.taxCents, 0);
  return csv([
    DAY_BOOK_COLUMNS.map((c) => c.header),
    ...shown.map((s) => [
      dmy(s.date),
      s.kind,
      s.number,
      s.customer,
      money(s.netCents),
      money(s.taxCents),
      money(s.netCents + s.taxCents),
    ]),
    ["Total", "", "", "", money(net), money(tax), money(net + tax)],
  ]);
}

/** The sales with the void left out: July 750.00, August -50.00 (the credit note alone), September 425.50. */
export const SALES_NOT_VOID = [
  { periodStart: "2026-07-01", amountCents: 75000 },
  { periodStart: "2026-08-01", amountCents: -5000 },
  { periodStart: "2026-09-01", amountCents: 42550 },
];

const dayFirst = { order: "dmy" as const, ambiguous: false, conflicting: false };

export const files: PracticeFile[] = [
  {
    id: "sage-accounting-sales-list",
    shape:
      "the Sales list as CSV: Invoice Number first, a voided invoice and a credit note in the list",
    fileName: "Sales.csv",
    bytes: () => utf8(salesListText()),
    columns: LIST_COLUMNS,
    expected: {
      // Nothing is pre-filled as the amount, rightly: "Net" matches no amount name, and "Total" sits
      // beside a tax column, so it may include the tax. The person picks Net.
      guess: { headerRow: 0, dateColumn: 1, amountColumn: null },
      picks: { amountColumn: LIST_NET },
      dateOrder: dayFirst,
      decimalStyle: "point",
      months: [
        { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 75000, rows: 2 },
        // WRONG TODAY: the void's 200.00 plus the credit note's -50.00. True: -50.00.
        { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 15000, rows: 2 },
        { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 42550, rows: 1 },
      ],
      skipped: [{ row: 7, reason: "not-over" }],
    },
  },
  {
    id: "sage-accounting-day-book",
    shape:
      "the Sales Day Book, Detailed, as CSV: a Type column, a negative credit note, a totals row",
    fileName: "Sales Day Book.csv",
    bytes: () => utf8(dayBookText()),
    columns: DAY_BOOK_COLUMNS,
    expected: {
      // A bare "Type" is never pre-filled as the type column, and no row here is a payment anyway.
      guess: { headerRow: 0, dateColumn: 0, amountColumn: null },
      picks: { amountColumn: DAY_BOOK_NET },
      dateOrder: dayFirst,
      decimalStyle: "point",
      months: [
        { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 75000, rows: 2 },
        { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: -5000, rows: 1 },
        { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 42550, rows: 1 },
      ],
      skipped: [
        { row: 6, reason: "not-over" },
        { row: 7, reason: "total" },
      ],
    },
  },
];
