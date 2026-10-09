/**
 * Practice files shaped like FreshBooks reports exported with "Export for Excel" (a CSV).
 *
 * EVERYTHING HERE IS INVENTED. The company, the clients ("Invented Client A") and every amount are
 * made up; nothing was taken from a real export. The only things taken from FreshBooks are layout
 * facts from its own help pages, each listed in `sources` with the day it was read.
 *
 * What the pages say, as read on 2026-10-08:
 *  - every report's "Export for Excel" downloads a CSV, and a report runs in one currency at a time;
 *  - Invoice Details lists the invoices of a period, filtered by Issue Date (every invoice issued)
 *    or Paid Date (only invoices fully paid), by client and by status (such as Disputed, Paid,
 *    Draft). Run for all clients, it carries a summary of the total invoiced and paid AT THE TOP;
 *  - Revenue by Client gives revenue excluding sales taxes, for each client; the old version's CSV
 *    is how FreshBooks says to see a monthly breakdown;
 *  - the Date Format setting offers dd/mm/yyyy, dd.mm.yy, mm/dd/yyyy, yyyy/mm/dd, yyyy-mm-dd and
 *    mmm d, yyyy, for invoices, estimates and proposals. The page does not say reports follow it.
 * What the pages do NOT say, and so is assumed below: every column title, the words and shape of
 * the summary block (two titles over two figures here), that dates in the export follow the Date
 * Format setting (the variants below try four of the six), and that the old Revenue by Client CSV
 * puts the months ACROSS the top, one column per month.
 *
 * Today's wrong answers: none left in these files (there used to be four, pinned as "fails today"
 * tests in tests/figures-file-packages.spec.ts).
 * Fixed since: dd.mm.yy dates (a two-digit year) are read once the person says which century the
 * year is in, and until then nothing is added up; and months across the top are read, one total
 * per month column (lib/figures/file/across.ts). And (the maintainer's decision, 2026-10-07) the
 * summary block's two titles used to be taken for the column names, with "Total Paid" pre-filled as
 * the amount over the invoice numbers, and the Draft invoice used to be counted as a sale. The real
 * column-names row is now found under the summary, and the pre-filled Status column leaves the
 * Draft out.
 */
import { csv } from "./csv";
import { utf8 } from "../../helpers/encode";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-08";
const INVOICE_DETAILS_PAGE =
  "https://support.freshbooks.com/hc/en-us/articles/219575467-What-is-an-Invoice-Details-report";
const EXPORT_PAGE =
  "https://support.freshbooks.com/hc/en-us/articles/227478548-How-do-I-export-my-reports";
const REVENUE_BY_CLIENT_PAGE =
  "https://support.freshbooks.com/hc/en-us/articles/360022118351-What-is-a-Revenue-by-Client-report";
const DATE_FORMAT_PAGE =
  "https://support.freshbooks.com/hc/en-us/articles/360002789691-How-do-I-manage-my-basic-and-financial-information";

export const sources: VendorSource[] = [
  {
    url: INVOICE_DETAILS_PAGE,
    read: READ,
    says: "Invoice Details: Issue Date or Paid Date, statuses such as Disputed, Paid and Draft, a summary of total invoiced and paid at the top",
  },
  {
    url: EXPORT_PAGE,
    read: READ,
    says: "Export for Excel downloads a CSV; a report runs in one currency at a time",
  },
  {
    url: REVENUE_BY_CLIENT_PAGE,
    read: READ,
    says: "Revenue by Client excludes sales taxes; the old report's CSV gives a monthly breakdown",
  },
  {
    url: DATE_FORMAT_PAGE,
    read: READ,
    says: "date formats dd/mm/yyyy, dd.mm.yy, mm/dd/yyyy, yyyy/mm/dd, yyyy-mm-dd, mmm d, yyyy; stated for invoices, not reports",
  },
];

/** A title we guessed: the Invoice Details page names no columns. */
const assumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: INVOICE_DETAILS_PAGE,
});
/** A title we guessed for the old Revenue by Client CSV. */
const assumedRevenue = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: REVENUE_BY_CLIENT_PAGE,
});

const INVOICE_COLUMNS: ColumnNote[] = [
  assumed("Client"), // 0
  assumed("Invoice Number"), // 1: "0000001"; read as a number, it looks like an amount
  assumed("Issue Date"), // 2
  assumed("Status"), // 3: Paid, Disputed, Draft (the statuses the page names)
  assumed("Subtotal"), // 4: before tax
  assumed("Tax"), // 5
  assumed("Total"), // 6: with tax
  assumed("Paid"), // 7
];
const ISSUE_DATE = 2;
const SUBTOTAL = 4;
/** 0-based row of the real column names, under the summary block (see invoiceDetailsText). */
const INVOICE_HEADER_ROW = 4;

interface Invoice {
  client: string;
  number: string;
  issued: string;
  status: "Paid" | "Disputed" | "Draft";
  subtotalCents: number;
  taxCents: number;
  paidCents: number;
}

/** Some day above 12 in each month, so dd/mm/yyyy proves its own order. */
export const INVOICES: Invoice[] = [
  {
    client: "Invented Client A",
    number: "0000001",
    issued: "2026-07-06",
    status: "Paid",
    subtotalCents: 40000,
    taxCents: 2000,
    paidCents: 42000,
  },
  {
    client: "Invented Client B",
    number: "0000002",
    issued: "2026-07-21",
    status: "Paid",
    subtotalCents: 10000,
    taxCents: 500,
    paidCents: 10500,
  },
  {
    client: "Invented Client C",
    number: "0000003",
    issued: "2026-08-18",
    status: "Disputed",
    subtotalCents: 47619,
    taxCents: 2381,
    paidCents: 0,
  },
  // Never sent: a draft is not a sale. Left out through the Status column.
  {
    client: "Invented Client B",
    number: "0000004",
    issued: "2026-08-29",
    status: "Draft",
    subtotalCents: 25000,
    taxCents: 1250,
    paidCents: 0,
  },
  {
    client: "Invented Client A",
    number: "0000005",
    issued: "2026-09-14",
    status: "Paid",
    subtotalCents: 30000,
    taxCents: 1500,
    paidCents: 31500,
  },
  // 1 October: a month not over on 2026-10-06.
  {
    client: "Invented Client C",
    number: "0000006",
    issued: "2026-10-01",
    status: "Paid",
    subtotalCents: 9000,
    taxCents: 450,
    paidCents: 9450,
  },
];

const money = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type DateFormat = "yyyy-mm-dd" | "mmm d, yyyy" | "dd/mm/yyyy" | "dd.mm.yy";

function written(iso: string, format: DateFormat): string {
  const [y, m, d] = iso.split("-");
  if (format === "yyyy-mm-dd") return iso;
  if (format === "mmm d, yyyy") return `${MONTH_ABBR[Number(m) - 1]} ${Number(d)}, ${y}`;
  if (format === "dd/mm/yyyy") return `${d}/${m}/${y}`;
  return `${d}.${m}.${y.slice(2)}`;
}

/** "Invoice Details" for all clients by Issue Date: the summary on top, then the invoices. */
function invoiceDetailsText(format: DateFormat): string {
  // The summary counts what was issued, drafts left out; the figures here only need to be text.
  const issued = INVOICES.filter((i) => i.status !== "Draft");
  const invoiced = issued.reduce((sum, i) => sum + i.subtotalCents + i.taxCents, 0);
  const paid = issued.reduce((sum, i) => sum + i.paidCents, 0);
  return csv([
    ["Invoice Details"],
    ["Total Invoiced", "Total Paid"], // the summary's titles (assumed words): two text cells, like column names
    [money(invoiced), money(paid)],
    [],
    INVOICE_COLUMNS.map((c) => c.header),
    ...INVOICES.map((i) => [
      i.client,
      i.number,
      written(i.issued, format),
      i.status,
      money(i.subtotalCents),
      money(i.taxCents),
      money(i.subtotalCents + i.taxCents),
      money(i.paidCents),
    ]),
  ]);
}

/**
 * The old "Revenue by Client" CSV: one row per client and, ASSUMED, one column per month. The page
 * says only that this CSV gives a monthly breakdown. Drafts are left out, and taxes are, as the page
 * says.
 */
const REVENUE_COLUMNS: ColumnNote[] = [
  assumedRevenue("Client"),
  assumedRevenue("Jul 2026"),
  assumedRevenue("Aug 2026"),
  assumedRevenue("Sep 2026"),
  assumedRevenue("Total"),
];
function revenueByClientText(): string {
  return csv([
    ["Revenue by Client"],
    ["Invented Shop Ltd."],
    [],
    REVENUE_COLUMNS.map((c) => c.header),
    ["Invented Client A", "400.00", "0.00", "300.00", "700.00"],
    ["Invented Client B", "100.00", "0.00", "0.00", "100.00"],
    ["Invented Client C", "0.00", "476.19", "0.00", "476.19"],
    ["Total", "500.00", "476.19", "300.00", "1276.19"],
  ]);
}

/**
 * What the invoices add up to with the Draft left out: July 500.00, August 476.19 (not 726.19),
 * September 300.00. The months-across file holds the same three figures in its Total row, and its
 * client rows add up to them too.
 */
export const ISSUED_NOT_DRAFT = [
  { periodStart: "2026-07-01", amountCents: 50000 },
  { periodStart: "2026-08-01", amountCents: 47619 },
  { periodStart: "2026-09-01", amountCents: 30000 },
];

/** The months with the Draft left out: the same three figures as ISSUED_NOT_DRAFT, with their rows. */
const MONTHS_NOT_DRAFT = [
  { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 50000, rows: 2 },
  // 476.19 alone: the Draft's 250.00 is left out (it used to be counted, giving 726.19).
  { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 47619, rows: 1 },
  { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 30000, rows: 1 },
];

/**
 * The guess for every Invoice Details file whose dates DotAmi can read. Row 2's two summary titles
 * look like column names with dates below, but the wider row of real column names under them wins
 * (row 5, 0-based 4); Issue Date and Subtotal are pre-filled, and Status too (see the spec).
 */
const REAL_HEADER_GUESS = { headerRow: INVOICE_HEADER_ROW, dateColumn: ISSUE_DATE, amountColumn: SUBTOTAL };
/** 1-based row of the Draft invoice (0000004): the header is row 5, the invoices rows 6 to 11. */
const DRAFT_ROW = 9;

const invoiceFile = (
  id: string,
  format: DateFormat,
  dateOrder: PracticeFile["expected"]["dateOrder"],
  century?: PracticeFile["expected"]["century"],
): PracticeFile => ({
  id,
  shape: `Invoice Details by Issue Date, a summary on top, dates written ${format}`,
  fileName: "invoice_details.csv",
  bytes: () => utf8(invoiceDetailsText(format)),
  columns: INVOICE_COLUMNS,
  expected: {
    guess: REAL_HEADER_GUESS,
    dateOrder,
    century,
    decimalStyle: "point",
    months: MONTHS_NOT_DRAFT,
    skipped: [
      { row: DRAFT_ROW, reason: "void-or-draft" },
      // Row 11 is 1 October, a month not over yet.
      { row: 11, reason: "not-over" },
    ],
  },
});

const noOrder = { order: null, ambiguous: false, conflicting: false };

export const files: PracticeFile[] = [
  invoiceFile("freshbooks-invoices-iso", "yyyy-mm-dd", noOrder),
  invoiceFile("freshbooks-invoices-month-name", "mmm d, yyyy", noOrder),
  // 21/07/2026 can only be day-first.
  invoiceFile("freshbooks-invoices-dmy", "dd/mm/yyyy", {
    order: "dmy",
    ambiguous: false,
    conflicting: false,
  }),
  // dd.mm.yy, one of the six Date Format choices: 21.07.26 can only be day-first, and the person
  // answers that 26 is 2026. Read like the others since, the summary and the Draft included.
  invoiceFile(
    "freshbooks-invoices-two-digit-year",
    "dd.mm.yy",
    { order: "dmy", ambiguous: false, conflicting: false },
    2000,
  ),
  {
    id: "freshbooks-revenue-by-client",
    shape: "the old Revenue by Client CSV, months across the top (assumed), one row per client",
    fileName: "revenue_by_client.csv",
    bytes: () => utf8(revenueByClientText()),
    columns: REVENUE_COLUMNS,
    expected: {
      // No date sits under any column, so no row of column names is found for the usual reading.
      // The screen starts on "months across" instead: row 4 holds the month names, and Client and
      // Total are not months, so they are not added.
      guess: null,
      dateOrder: noOrder,
      decimalStyle: "point",
      months: [],
      skipped: [],
      across: {
        monthsRow: 3,
        monthColumns: [
          { column: 1, month: "2026-07" },
          { column: 2, month: "2026-08" },
          { column: 3, month: "2026-09" },
        ],
        // Every client row added down each month's column; a 0.00 cell is read and counted.
        months: [
          { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 50000, rows: 3 },
          { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 47619, rows: 3 },
          { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 30000, rows: 3 },
        ],
        // The report's own Total row would count everything twice.
        skippedRows: [{ row: 8, reason: "total" }],
        skippedCells: [],
      },
    },
  },
];

/** 0-based row of the Revenue by Client file's own Total row, which the person can take instead. */
export const REVENUE_TOTAL_ROW = 7;
