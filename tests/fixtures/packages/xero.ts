/**
 * Practice files shaped like a Xero invoice export (Xero: "Export invoices and bills").
 *
 * EVERYTHING HERE IS INVENTED. The company, the clients ("Invented Client A") and every amount are
 * made up; nothing was taken from a real export. The only things taken from Xero are layout facts
 * and field names from its help pages, each listed in `sources` with the day it was read.
 *
 * What the pages say, as read on 2026-10-06 (the 8c-3 design pass; see docs/connectors/practice-files.md):
 *  - the export is CSV only, at most 500 transactions at a time, and each invoice LINE is its own
 *    row, in the same format as the import template;
 *  - the template's fields include ContactName, EmailAddress, InvoiceNumber, InvoiceDate, DueDate,
 *    InventoryItemCode, UnitAmount, Discount, AccountCode, TaxType, TaxAmount and Currency, and
 *    UnitAmount may include or leave out tax (never a mix);
 *  - dates are DD/MM/YYYY on the global page and MM/DD/YYYY on the US page;
 *  - France and Germany write comma decimals (1100,00 / 1.000,00).
 * What the pages do NOT say, and so is assumed below: the order of the columns, a Description and
 * a Quantity column (the field list as read does not name them), the line breaks, what a real
 * export writes in a cell that has nothing (EmailAddress and the like are left empty here), and
 * how a comma-decimal export is quoted. There is no line-total column among the documented
 * fields, which is the point of the "UnitAmount" gap: a price per item is not what was sold.
 *
 * The Receivable Invoice Detail report (an Excel file, added 2026-10-08) rests on two more pages read
 * in the same design pass on 2026-10-06. Xero's help pages are drawn by script and could not be
 * read again on 2026-10-08, so those facts are as of 2026-10-06:
 *  - the report lists sales invoices line by line and includes deleted and VOIDED invoices by
 *    default; its named columns include Unit Price (ex), Due Date and Balance;
 *  - a report exported to Excel with formulas may show 0.00 until Excel's Enable Editing is clicked,
 *    so a sum can arrive with no saved value.
 * Assumed: the title rows, the order of the columns, the Invoice Date, Invoice Number, Contact,
 * Status, Description, Quantity and Line Amount (ex) titles, the word "Voided" in the Status
 * column, and WHICH cells are formulas (one line amount and the Total here).
 */
import { makeXlsx } from "../../helpers/make-xlsx";
import type { XlsxCell } from "../../helpers/make-xlsx";
import { windows1252, utf8 } from "../../helpers/encode";
import { csv } from "./csv";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-06";
const EXPORT_PAGE = "https://central.xero.com/s/article/Export-invoices-and-bills";
const IMPORT_GLOBAL = "https://central.xero.com/s/article/Import-customer-invoices-GL";
const IMPORT_US = "https://central.xero.com/s/article/Import-customer-invoices-US";
const INVOICE_DETAIL_PAGE = "https://central.xero.com/s/article/Receivable-Invoice-Detail-report-New";
const EXPORT_REPORT_PAGE = "https://central.xero.com/s/article/Export-or-print-a-report";

export const sources: VendorSource[] = [
  {
    url: EXPORT_PAGE,
    read: READ,
    says: "CSV only; at most 500 transactions per export; each invoice line is its own row, in the import template's format",
  },
  {
    url: IMPORT_GLOBAL,
    read: READ,
    says: "the template's field names; UnitAmount includes or excludes tax, never a mix; DD/MM/YYYY; France and Germany use comma decimals",
  },
  {
    url: IMPORT_US,
    read: READ,
    says: "the US version of the same page: InvoiceDate and DueDate are MM/DD/YYYY",
  },
  {
    url: INVOICE_DETAIL_PAGE,
    read: READ,
    says: "Receivable Invoice Detail: line by line, deleted and voided invoices included by default; columns include Unit Price (ex), Due Date, Balance",
  },
  {
    url: EXPORT_REPORT_PAGE,
    read: READ,
    says: "reports export to PDF, Excel or Google Sheets; an Excel export with formulas may show 0.00 until Enable Editing",
  },
];

/** A name the Xero page spells out. */
const documented = (header: string): ColumnNote => ({
  header,
  status: "documented",
  basis: IMPORT_GLOBAL,
});
/** A name we guessed: the field list read on 2026-10-06 (IMPORT_GLOBAL) does not include it. */
const assumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: IMPORT_GLOBAL,
});

/** The columns, in the order we assume (the pages list names, not positions). */
const COLUMNS: ColumnNote[] = [
  documented("ContactName"), // 0
  documented("EmailAddress"), // 1
  documented("InvoiceNumber"), // 2
  documented("InvoiceDate"), // 3
  documented("DueDate"), // 4
  documented("InventoryItemCode"), // 5
  assumed("Description"), // 6: what was sold; not in the field list as read
  assumed("Quantity"), // 7: how many; not in the field list as read
  documented("UnitAmount"), // 8: a price PER ITEM; there is no line-total column
  documented("Discount"), // 9
  documented("AccountCode"), // 10
  documented("TaxType"), // 11
  documented("TaxAmount"), // 12
  documented("Currency"), // 13
];

/** Column positions the spec relies on, named so the expectations read clearly. */
export const INVOICE_DATE = 3;
export const UNIT_AMOUNT = 8;

/** One invoice line. Xero writes one row per line, so an invoice with two lines repeats its number. */
export interface XeroLine {
  contact: string;
  number: string;
  /** ISO day; written in whichever order the variant uses. */
  date: string;
  due: string;
  description: string;
  quantity: number;
  /** Price per item, in cents. */
  unitCents: number;
  taxCents: number;
}

const line = (
  contact: string,
  number: string,
  date: string,
  due: string,
  description: string,
  quantity: number,
  unitCents: number,
  taxCents: number,
): XeroLine => ({ contact, number, date, due, description, quantity, unitCents, taxCents });

/**
 * Three months of sales and one line in October, which is still running on 2026-10-06 (the day the
 * tests fix as "today"), so the totals must leave it out. Some day is above 12, so the date order
 * can be proved from the dates alone.
 */
export const MAIN_LINES: XeroLine[] = [
  line("Invented Client A", "INV-0001", "2026-07-15", "2026-08-14", "Design work", 3, 10000, 1500),
  line("Invented Client A", "INV-0001", "2026-07-15", "2026-08-14", "Printing", 1, 5000, 250),
  line("Invented Client B", "INV-0002", "2026-08-03", "2026-09-02", "Design work", 3, 4000, 600),
  line("Invented Client B", "INV-0002", "2026-08-03", "2026-09-02", "Hosting", 1, 6000, 300),
  line("Invented Client C", "INV-0003", "2026-09-18", "2026-10-18", "Design work", 1, 7500, 375),
  line("Invented Client C", "INV-0004", "2026-10-02", "2026-11-01", "Design work", 1, 2500, 125),
];

/**
 * The same shape with every day at 12 or under, so nothing in the dates says which number is the
 * month: 02/07/2026 is 2 July or 7 February. The person must be asked.
 */
export const AMBIGUOUS_LINES: XeroLine[] = [
  line("Invented Client A", "INV-0001", "2026-07-02", "2026-08-01", "Design work", 3, 10000, 1500),
  line("Invented Client A", "INV-0002", "2026-07-09", "2026-08-08", "Printing", 1, 5000, 250),
  line("Invented Client B", "INV-0003", "2026-08-03", "2026-09-02", "Design work", 3, 4000, 600),
  line("Invented Client B", "INV-0003", "2026-08-11", "2026-09-10", "Hosting", 1, 6000, 300),
  line("Invented Client C", "INV-0004", "2026-09-05", "2026-10-05", "Design work", 1, 7500, 375),
  line("Invented Client C", "INV-0005", "2026-10-02", "2026-11-01", "Design work", 1, 2500, 125),
];

/** A French-region file: amounts written 1100,00. Invented names with accents (é) so the bytes matter. */
export const FRANCE_LINES: XeroLine[] = [
  line(
    "Société Inventée A",
    "FAC-0001",
    "2026-07-15",
    "2026-08-14",
    "Conception graphique",
    1,
    110000,
    22000,
  ),
  line("Société Inventée A", "FAC-0001", "2026-07-15", "2026-08-14", "Hébergement", 2, 8050, 3220),
  line(
    "Café Inventé B",
    "FAC-0002",
    "2026-08-20",
    "2026-09-19",
    "Création de logo",
    1,
    25000,
    5000,
  ),
  line("Café Inventé B", "FAC-0003", "2026-10-03", "2026-11-02", "Maintenance", 1, 4000, 800),
];

/** What was actually sold per month (quantity times price per item), straight from the line data. */
export function invoicedCents(lines: XeroLine[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lines) {
    const month = l.date.slice(0, 7);
    out[month] = (out[month] ?? 0) + l.quantity * l.unitCents;
  }
  return out;
}

function money(cents: number, style: "point" | "comma"): string {
  const text = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
  return style === "comma" ? text.replace(".", ",") : text;
}

function written(iso: string, order: "dmy" | "mdy"): string {
  const [y, m, d] = iso.split("-");
  return order === "dmy" ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

function exportText(
  lines: XeroLine[],
  order: "dmy" | "mdy",
  style: "point" | "comma",
  currency: string,
  taxType: string,
): string {
  const rows = lines.map((l) => [
    l.contact,
    "", // EmailAddress: left empty here. ASSUMED: no page read says what a real export writes for it
    l.number,
    written(l.date, order),
    written(l.due, order),
    "", // InventoryItemCode
    l.description,
    String(l.quantity),
    money(l.unitCents, style),
    "", // Discount
    "200",
    taxType,
    money(l.taxCents, style),
    currency,
  ]);
  return csv([COLUMNS.map((c) => c.header), ...rows]);
}

/**
 * What is added up for MAIN_LINES and AMBIGUOUS_LINES read day-first once the person picks the
 * UnitAmount column (a price per item; DotAmi no longer pre-fills it). Where a line sold more than
 * one item the sum falls short of what was invoiced, and the entry says so.
 */
const UNIT_AMOUNT_SUMS_DAY_FIRST = [
  // SHORT: 100.00 + 50.00 = 150.00 is a sum of prices per item. Invoiced: 3 x 100.00 + 50.00
  // = 350.00 (35000 cents). This is why UnitAmount is no longer pre-filled.
  { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 15000, rows: 2 },
  // SHORT: 40.00 + 60.00 = 100.00. Invoiced: 3 x 40.00 + 60.00 = 180.00 (18000 cents).
  { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 10000, rows: 2 },
  // Right only because the one line sold one item: 75.00 is both the price per item and the total.
  { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 7500, rows: 1 },
];

/**
 * The guess for any Xero export (the maintainer's decision, 2026-10-07):
 *  - dateColumn is InvoiceDate (column 3): the camel-case name now reads as the word "date", and
 *    DueDate loses to it.
 *  - amountColumn is null: UnitAmount is a price per item and is never pre-filled, and no
 *    documented column holds a line total. The person picks the column (PICKS below). UnitAmount
 *    is the only money column, so the sums stay short of what was invoiced whenever a line sold
 *    more than one item; choosing it is the person's call, not DotAmi's pre-fill.
 */
const TODAYS_GUESS = { headerRow: 0, dateColumn: INVOICE_DATE, amountColumn: null };
/** What the person picks where nothing is pre-filled: the only money column the export has. */
const PICKS = { amountColumn: UNIT_AMOUNT };

export const files: PracticeFile[] = [
  {
    id: "xero-dmy",
    shape: "Export.csv, DD/MM/YYYY (the global import page), one row per invoice line",
    fileName: "Export.csv",
    bytes: () => utf8(exportText(MAIN_LINES, "dmy", "point", "CAD", "GST on Income")),
    columns: COLUMNS,
    expected: {
      guess: TODAYS_GUESS,
      picks: PICKS,
      dateOrder: { order: "dmy", ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: UNIT_AMOUNT_SUMS_DAY_FIRST,
      // Row 7 is 2 October, a month that has not ended on 2026-10-06.
      skipped: [{ row: 7, reason: "not-over" }],
    },
  },
  {
    id: "xero-mdy",
    shape: "Export.csv, MM/DD/YYYY (the US import page)",
    fileName: "Export.csv",
    bytes: () => utf8(exportText(MAIN_LINES, "mdy", "point", "USD", "Tax on Sales")),
    columns: COLUMNS,
    expected: {
      guess: TODAYS_GUESS,
      picks: PICKS,
      // 07/15/2026 can only be month-first.
      dateOrder: { order: "mdy", ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: UNIT_AMOUNT_SUMS_DAY_FIRST,
      skipped: [{ row: 7, reason: "not-over" }],
    },
  },
  {
    id: "xero-ambiguous",
    shape: "Export.csv with every day at 12 or under: the person is asked how dates are written",
    fileName: "Export.csv",
    bytes: () => utf8(exportText(AMBIGUOUS_LINES, "dmy", "point", "CAD", "GST on Income")),
    columns: COLUMNS,
    expected: {
      guess: TODAYS_GUESS,
      picks: PICKS,
      dateOrder: { order: null, ambiguous: true, conflicting: false },
      // The file was written day-first, so that is the true answer.
      answer: "dmy",
      decimalStyle: "point",
      months: UNIT_AMOUNT_SUMS_DAY_FIRST,
      skipped: [{ row: 7, reason: "not-over" }],
    },
  },
  {
    id: "xero-france",
    shape:
      "Export.csv for a region that writes 1100,00; saved by Windows as windows-1252, not UTF-8",
    fileName: "Export.csv",
    bytes: () => windows1252(exportText(FRANCE_LINES, "dmy", "comma", "EUR", "TVA sur ventes")),
    columns: COLUMNS,
    expected: {
      guess: TODAYS_GUESS,
      picks: PICKS,
      dateOrder: { order: "dmy", ambiguous: false, conflicting: false },
      decimalStyle: "comma",
      months: [
        // SHORT: 1100,00 + 80,50 = 1180,50 sums prices per item, and the second line sold two
        // of them. Invoiced: 1 x 1100,00 + 2 x 80,50 = 1261,00 (126100 cents). This is why UnitAmount is
        // no longer pre-filled.
        { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 118050, rows: 2 },
        // Right only because the one line sold one item.
        { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 25000, rows: 1 },
      ],
      // Row 5 is 3 October, a month that has not ended.
      skipped: [{ row: 5, reason: "not-over" }],
    },
  },
];

/**
 * The ambiguous file read the other way round. Month-first, 02/07/2026 is 7 February, so the same
 * rows land in other months, and one (11/08/2026, read as 8 November) is a month not over yet.
 * Asking is what keeps a month filed under the right name. The amounts are the UnitAmount sums
 * again, so they carry the same SHORT gap as UNIT_AMOUNT_SUMS_DAY_FIRST.
 */
export const AMBIGUOUS_READ_MONTH_FIRST = {
  answer: "mdy" as const,
  months: [
    // SHORT: 100.00 + 25.00 = 125.00 sums prices per item. Invoiced on these two lines:
    // 3 x 100.00 + 25.00 = 325.00 (32500 cents).
    { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 12500, rows: 2 },
    // SHORT: 40.00 is a price per item. Invoiced: 3 x 40.00 = 120.00 (12000 cents).
    { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 4000, rows: 1 },
    // These two are right only because each line sold one item.
    { periodStart: "2026-05-01", periodEnd: "2026-05-31", amountCents: 7500, rows: 1 },
    { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 5000, rows: 1 },
  ],
  skipped: [{ row: 5, reason: "not-over" as const }],
};

// ---- Receivable Invoice Detail (Excel), added 2026-10-08 ----

const detailDocumented = (header: string): ColumnNote => ({
  header,
  status: "documented",
  basis: INVOICE_DETAIL_PAGE,
});
const detailAssumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: INVOICE_DETAIL_PAGE,
});

const DETAIL_COLUMNS: ColumnNote[] = [
  detailAssumed("Invoice Date"), // 0 (A)
  detailAssumed("Invoice Number"), // 1 (B)
  detailAssumed("Contact"), // 2 (C)
  detailAssumed("Status"), // 3 (D): Paid, Awaiting Payment, Voided
  detailAssumed("Description"), // 4 (E)
  detailAssumed("Quantity"), // 5 (F)
  detailDocumented("Unit Price (ex)"), // 6 (G): a price per item, never pre-filled
  detailAssumed("Line Amount (ex)"), // 7 (H): what the line sold, before tax
  detailDocumented("Due Date"), // 8 (I)
  detailDocumented("Balance"), // 9 (J)
];
const DETAIL_LINE_AMOUNT = 7;

/** 1-based rows of the two cells that matter below, named so the spec reads clearly. */
export const DETAIL_VOIDED_ROW = 8;
export const DETAIL_UNSAVED_FORMULA_ROW = 9;

function invoiceDetailSheet(): XlsxCell[][] {
  return [
    ["Receivable Invoice Detail"],
    ["Invented Shop Ltd."],
    ["For the period 1 July 2026 to 30 September 2026"],
    [],
    DETAIL_COLUMNS.map((c) => c.header),
    // Row 6 and 7: one invoice with two lines (3 x 100.00 and 1 x 50.00).
    [{ date: "2026-07-15" }, "INV-0001", "Invented Client A", "Paid", "Design work", 3, 100, 300, { date: "2026-08-14" }, 0],
    [{ date: "2026-07-15" }, "INV-0001", "Invented Client A", "Paid", "Printing", 1, 50, 50, { date: "2026-08-14" }, 0],
    // Row 8: voided, so not a sale; included because the report includes voided invoices by default.
    [{ date: "2026-08-03" }, "INV-0002", "Invented Client B", "Voided", "Design work", 3, 40, 120, { date: "2026-09-02" }, 0],
    // Row 9: 2 x 30.00 = 60.00, but the line amount is a formula saved with no value.
    [{ date: "2026-08-12" }, "INV-0003", "Invented Client B", "Awaiting Payment", "Hosting", 2, 30, { formula: "F9*G9" }, { date: "2026-09-11" }, 60],
    [{ date: "2026-09-18" }, "INV-0004", "Invented Client C", "Paid", "Design work", 1, 75, 75, { date: "2026-10-18" }, 0],
    // Row 11: the report's own sum, also a formula with no saved value.
    ["Total", null, null, null, null, null, null, { formula: "SUM(H6:H10)" }],
  ];
}

files.push({
  id: "xero-receivable-invoice-detail",
  shape:
    "Receivable Invoice Detail.xlsx: a Voided invoice, and a line amount and a total saved as formulas with no value",
  fileName: "Receivable Invoice Detail.xlsx",
  bytes: () => makeXlsx([{ name: "Receivable Invoice Detail", rows: invoiceDetailSheet() }]),
  columns: DETAIL_COLUMNS,
  expected: {
    // Invoice Date wins over Due Date; Line Amount (ex) is pre-filled, Unit Price (ex) is not.
    guess: { headerRow: 4, dateColumn: 0, amountColumn: DETAIL_LINE_AMOUNT },
    dateOrder: { order: null, ambiguous: false, conflicting: false },
    decimalStyle: "point",
    months: [
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 35000, rows: 2 },
      // WRONG TODAY: this is the voided invoice's 120.00. INV-0003's 60.00 is left out because its
      // formula has no saved value, and the person is told so (DotAmi never works it out). True,
      // once the voided line is left out and the file is saved again in Excel: 60.00.
      { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 12000, rows: 1 },
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 7500, rows: 1 },
    ],
    skipped: [
      // The cell holds a formula Excel never worked out: told apart from an empty amount.
      { row: DETAIL_UNSAVED_FORMULA_ROW, reason: "unsaved-formula" },
      { row: 11, reason: "total" },
    ],
  },
});
