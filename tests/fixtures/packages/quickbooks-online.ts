/**
 * Practice files shaped like QuickBooks Online reports exported to Excel.
 *
 * EVERYTHING HERE IS INVENTED. The company ("Invented Shop Ltd."), the clients and every amount
 * are made up; nothing was taken from a real export. The only things taken from Intuit are layout
 * facts and column titles from its help and developer pages, each listed in `sources` with the day
 * it was read.
 *
 * What the pages say, as read on 2026-10-06 (the 8c-3 design pass; see docs/connectors/practice-files.md):
 *  - Excel is reached through Reports > Export to Excel; the pages do not describe the file's
 *    layout, so the layout below is shaped from the report pages, not from a file anyone here saw;
 *  - a report has a header (company name, report title, report period); its date and time
 *    prepared and report basis are footer OPTIONS a person can switch off. Whether an Excel
 *    export keeps a footer, and in what words, is assumed (see FOOTER);
 *  - "Sales by Customer Detail" lists invoice lines grouped by customer, with a Description column;
 *  - a grouped report carries "Total for <name>" rows and a grand total, while a "list" report
 *    (Transaction List by Date) shows amounts and no totals rows;
 *  - Intuit's Transaction List report names these columns: Date, Transaction Type, Num, Posting,
 *    Name, Department, Memo/Description, Account, Split, Amount. That is the API's report, not an
 *    Excel file, and its sample mixes Invoice, Payment, Credit Memo (negative) and Sales Receipt rows.
 * Because the Sales by Customer Detail page does not list its own column titles, the grouped
 * files BORROW the Transaction List titles and add Product/Service, Qty, Sales Price and Balance:
 * every one of those headers is marked "assumed".
 */
import { makeXlsx } from "../../helpers/make-xlsx";
import type { XlsxCell } from "../../helpers/make-xlsx";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-06";
const TRANSACTION_LIST_DOC =
  "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/report-entities/transactionlist";
const SALES_BY_CUSTOMER_PAGE =
  "https://quickbooks.intuit.com/learn-support/en-ca/help-article/report-management/use-reports-see-sales-inventory-status/L7ocoLmqP_CA_en_CA";
const CUSTOMIZE_PAGE =
  "https://quickbooks.intuit.com/learn-support/en-ca/help-article/business-reports/customize-reports-using-new-modern-view/L2ta2XZDQ_CA_en_CA";
const LIST_VS_TOTALED_PAGE =
  "https://quickbooks.intuit.com/learn-support/en-us/help-article/report-management/difference-list-reports-balance-totaled-reports/L3SLK6jes_US_en_US";
const EXPORT_PAGE =
  "https://quickbooks.intuit.com/learn-support/en-ca/help-article/report-management/export-reports-excel-quickbooks-online/L7iAoP97n_CA_en_CA";

export const sources: VendorSource[] = [
  {
    url: TRANSACTION_LIST_DOC,
    read: READ,
    says: "the Transaction List report's column titles; a grouped sample with 'Total for <name>' rows; Invoice, Payment, Credit Memo and Sales Receipt rows mixed",
  },
  {
    url: SALES_BY_CUSTOMER_PAGE,
    read: READ,
    says: "Sales by Customer Detail lists invoice line items grouped by customer, with a Description column",
  },
  {
    url: CUSTOMIZE_PAGE,
    read: READ,
    says: "a report's header (company name, title, period); date and time prepared and basis are footer options a person can switch off",
  },
  {
    url: LIST_VS_TOTALED_PAGE,
    read: READ,
    says: "'list' reports such as Transaction List by Date show amounts but no totals rows; totaled reports have them",
  },
  {
    url: EXPORT_PAGE,
    read: READ,
    says: "the Export to Excel route; the file type and layout are not described",
  },
];

/** A title Intuit spells out for the Transaction List report. */
const documented = (header: string): ColumnNote => ({
  header,
  status: "documented",
  basis: TRANSACTION_LIST_DOC,
});
/** A title we borrowed or guessed: no page lists this report's own columns. */
const assumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: SALES_BY_CUSTOMER_PAGE,
});

/**
 * The grouped report's columns. The titles are Intuit's Transaction List titles reused (assumed to
 * be the same on this report), plus four we added.
 *
 * ASSUMED LAYOUT, and the "sparse" gap depends on it: that the customer names and the "Total for"
 * rows are written in the SAME column as Date (column A), so they sit in the date column too. No
 * source listed here documents where those cells go. If a real export puts them elsewhere, the
 * sparse gap may not exist at all.
 */
const GROUPED_COLUMNS: ColumnNote[] = [
  assumed("Date"), // 0
  assumed("Transaction Type"), // 1
  assumed("Num"), // 2
  assumed("Name"), // 3
  assumed("Memo/Description"), // 4: the page says a Description column exists; the exact title is a guess
  assumed("Product/Service"), // 5
  assumed("Qty"), // 6
  assumed("Sales Price"), // 7: a price PER ITEM, like Xero's UnitAmount
  assumed("Amount"), // 8
  assumed("Balance"), // 9: a running balance
];
const GROUPED_AMOUNT = 8;

/** The Transaction List report's columns, as Intuit's developer page names them. */
const LIST_COLUMNS: ColumnNote[] = [
  documented("Date"), // 0
  documented("Transaction Type"), // 1
  documented("Num"), // 2
  documented("Posting"), // 3
  documented("Name"), // 4
  documented("Department"), // 5
  documented("Memo/Description"), // 6
  documented("Account"), // 7
  documented("Split"), // 8
  documented("Amount"), // 9
];
const LIST_AMOUNT = 9;

const COMPANY = "Invented Shop Ltd.";
/**
 * ASSUMED footer. The customize page says only that date and time prepared (and the basis) are
 * footer OPTIONS a person can switch on or off; no page read says an Excel export keeps a footer,
 * or in what words. It is here so the files exercise a text row after the totals.
 * 2026-10-06 is a Tuesday.
 */
const FOOTER = "Accrual basis Tuesday, October 6, 2026 10:15 AM";

interface SaleLine {
  date: string;
  type: "Invoice" | "Sales Receipt" | "Credit Memo";
  num: string;
  memo: string;
  product: string;
  quantity: number;
  priceCents: number;
  amountCents: number;
}
interface Customer {
  name: string;
  lines: SaleLine[];
}

const sale = (
  date: string,
  type: SaleLine["type"],
  num: string,
  memo: string,
  product: string,
  quantity: number,
  priceCents: number,
  amountCents: number,
): SaleLine => ({ date, type, num, memo, product, quantity, priceCents, amountCents });

/** Three or more lines per customer: enough dates that the date column still looks like dates. */
const BUSY: Customer[] = [
  {
    name: "Invented Client A",
    lines: [
      sale("2026-07-03", "Invoice", "1001", "Monthly service", "Services", 1, 25000, 25000),
      sale("2026-07-10", "Invoice", "1002", "Extra hours", "Services", 3, 2500, 7500),
      sale("2026-07-17", "Sales Receipt", "1003", "Walk-in", "Services", 1, 3000, 3000),
      sale("2026-07-24", "Invoice", "1004", "Setup fee", "Services", 1, 2000, 2000),
    ],
  },
  {
    name: "Invented Client B",
    lines: [
      sale("2026-08-04", "Sales Receipt", "1005", "Goods", "Goods", 2, 1000, 2000),
      sale("2026-08-12", "Sales Receipt", "1006", "Goods", "Goods", 1, 1455, 1455),
      sale("2026-08-26", "Invoice", "1007", "Goods", "Goods", 1, 2000, 2000),
    ],
  },
  {
    name: "Invented Client C",
    lines: [
      sale("2026-09-03", "Invoice", "1008", "Monthly service", "Services", 1, 3000, 3000),
      sale("2026-09-15", "Invoice", "1009", "Extra hours", "Services", 1, 1000, 1000),
      sale("2026-09-22", "Credit Memo", "1010", "Refund", "Services", 1, 5620, -5620),
    ],
  },
];

/** One line per customer, the same totals as BUSY (375.00, 54.55, -16.20). */
const SPARSE: Customer[] = [
  {
    name: "Invented Client A",
    lines: [sale("2026-07-14", "Invoice", "1001", "Work", "Services", 1, 37500, 37500)],
  },
  {
    name: "Invented Client B",
    lines: [sale("2026-08-02", "Sales Receipt", "1002", "Goods", "Goods", 1, 5455, 5455)],
  },
  {
    name: "Invented Client C",
    lines: [sale("2026-09-20", "Credit Memo", "1003", "Refund", "Services", 1, 1620, -1620)],
  },
];

const dollars = (cents: number): number => cents / 100;

/** "Sales by Customer Detail": header block, then each customer's name, lines and "Total for" row. */
function groupedSheet(customers: Customer[]): XlsxCell[][] {
  const rows: XlsxCell[][] = [
    [COMPANY],
    ["Sales by Customer Detail"],
    ["July 1 - September 30, 2026"],
    [],
    GROUPED_COLUMNS.map((c) => c.header),
  ];
  let grand = 0;
  for (const customer of customers) {
    rows.push([customer.name]); // the group's name, alone in column A
    let balance = 0;
    for (const l of customer.lines) {
      balance += l.amountCents;
      rows.push([
        { date: l.date },
        l.type,
        l.num,
        customer.name,
        l.memo,
        l.product,
        l.quantity,
        dollars(l.priceCents),
        dollars(l.amountCents),
        dollars(balance),
      ]);
    }
    rows.push([
      `Total for ${customer.name}`,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      dollars(balance),
    ]);
    grand += balance;
  }
  rows.push(["TOTAL", null, null, null, null, null, null, null, dollars(grand)]);
  rows.push([]);
  rows.push([FOOTER]);
  return rows;
}

/** "Transaction List by Date": a flat list, no totals rows, an invoice AND the payment received for it. */
function transactionListSheet(): XlsxCell[][] {
  return [
    [COMPANY],
    ["Transaction List by Date"],
    ["July 1 - 31, 2026"],
    [],
    LIST_COLUMNS.map((c) => c.header),
    [
      { date: "2026-07-14" },
      "Invoice",
      "1040",
      "Yes",
      "Invented Client A",
      null,
      "Monthly service",
      "Accounts Receivable (A/R)",
      "-Split-",
      47.6,
    ],
    // The same $47.60 arriving: not a second sale.
    [
      { date: "2026-07-20" },
      "Payment",
      "3456",
      "Yes",
      "Invented Client A",
      null,
      null,
      "Chequing",
      "Accounts Receivable (A/R)",
      47.6,
    ],
    [
      { date: "2026-07-28" },
      "Sales Receipt",
      "1046",
      "Yes",
      "Invented Client B",
      null,
      "Goods",
      "Chequing",
      "Sales",
      54.55,
    ],
    [],
    [FOOTER],
  ];
}

/** The same totals for both grouped files: July 375.00, August 54.55, September -16.20 (a credit memo). */
const GROUPED_TOTALS = {
  july: { periodStart: "2026-07-01", periodEnd: "2026-07-31" },
  august: { periodStart: "2026-08-01", periodEnd: "2026-08-31" },
  september: { periodStart: "2026-09-01", periodEnd: "2026-09-30" },
};

export const files: PracticeFile[] = [
  {
    id: "quickbooks-grouped-busy",
    shape:
      "Sales by Customer Detail, three or more lines per customer, 'Total for' rows and a grand total",
    fileName: "Sales by Customer Detail.xlsx",
    bytes: () => makeXlsx([{ name: "Sales by Customer Detail", rows: groupedSheet(BUSY) }]),
    columns: GROUPED_COLUMNS,
    expected: {
      // 10 dates against 8 other cells in column A (names, totals, footer): over half, so guessed.
      guess: { headerRow: 4, dateColumn: 0, amountColumn: GROUPED_AMOUNT },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [
        { ...GROUPED_TOTALS.july, amountCents: 37500, rows: 4 },
        { ...GROUPED_TOTALS.august, amountCents: 5455, rows: 3 },
        { ...GROUPED_TOTALS.september, amountCents: -1620, rows: 3 },
      ],
      skipped: [
        { row: 6, reason: "no-date" }, // Invented Client A, a group's name
        { row: 11, reason: "total" },
        { row: 12, reason: "no-date" },
        { row: 16, reason: "total" },
        { row: 17, reason: "no-date" },
        { row: 21, reason: "total" },
        { row: 22, reason: "total" }, // TOTAL
        { row: 23, reason: "blank" },
        { row: 24, reason: "no-date" }, // the footer
      ],
    },
  },
  {
    id: "quickbooks-grouped-sparse",
    shape: "Sales by Customer Detail, one line per customer",
    fileName: "Sales by Customer Detail.xlsx",
    bytes: () => makeXlsx([{ name: "Sales by Customer Detail", rows: groupedSheet(SPARSE) }]),
    columns: GROUPED_COLUMNS,
    expected: {
      // WRONG TODAY, on the ASSUMED layout (names and "Total for" rows in column A, see
      // GROUPED_COLUMNS): 3 dates against 8 other cells in column A is under half, so the date
      // column is left empty and the person picks "Date". See the fails-today test "QuickBooks:
      // pre-fills Date when each customer has only one line".
      guess: { headerRow: 4, dateColumn: null, amountColumn: GROUPED_AMOUNT },
      picks: { dateColumn: 0 },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [
        { ...GROUPED_TOTALS.july, amountCents: 37500, rows: 1 },
        { ...GROUPED_TOTALS.august, amountCents: 5455, rows: 1 },
        { ...GROUPED_TOTALS.september, amountCents: -1620, rows: 1 },
      ],
      skipped: [
        { row: 6, reason: "no-date" },
        { row: 8, reason: "total" },
        { row: 9, reason: "no-date" },
        { row: 11, reason: "total" },
        { row: 12, reason: "no-date" },
        { row: 14, reason: "total" },
        { row: 15, reason: "total" }, // TOTAL
        { row: 16, reason: "blank" },
        { row: 17, reason: "no-date" },
      ],
    },
  },
  {
    id: "quickbooks-transaction-list",
    shape:
      "Transaction List by Date: a flat list holding an invoice and the payment received for it",
    fileName: "Transaction List by Date.xlsx",
    bytes: () => makeXlsx([{ name: "Transaction List by Date", rows: transactionListSheet() }]),
    columns: LIST_COLUMNS,
    expected: {
      guess: { headerRow: 4, dateColumn: 0, amountColumn: LIST_AMOUNT },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [
        // The "Transaction Type" header pre-fills the Type column, so the Payment row is left out:
        // 47.60 (invoice) + 54.55 (sales receipt) = 102.15. Without a type column the payment
        // would be added as well, 149.75, and the sale counted twice.
        { ...GROUPED_TOTALS.july, amountCents: 10215, rows: 2 },
      ],
      skipped: [
        { row: 7, reason: "payment" }, // the $47.60 received for invoice 1040
        { row: 9, reason: "blank" },
        { row: 10, reason: "no-date" }, // the footer
      ],
    },
  },
];
