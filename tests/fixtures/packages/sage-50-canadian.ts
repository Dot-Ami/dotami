/**
 * Practice files shaped like a Sage 50 Canadian (desktop) Customer Sales Detail report exported to
 * CSV, the route in docs/connectors/sage-50-canada.md.
 *
 * EVERYTHING HERE IS INVENTED. The company, the clients and every amount are made up; nothing was
 * taken from a real export. The only things taken from Sage are layout facts from its own Canadian
 * help pages, each listed in `sources` with the day it was read.
 *
 * What the pages say, as read on 2026-10-08:
 *  - a report is exported with Export on the report viewer's toolbar, choosing a "Save as type"
 *    (2026 help, published June 10, 2026); the types are .csv, .htm, .pdf, .xls and .txt. The
 *    Excel choice is the old .xls format, which DotAmi refuses, so the route is .csv;
 *  - Customer Sales reports show quantity, revenue, cost of goods sold, profit, and markup or
 *    margin; the Detail version can Show Corrections, choose its columns, and report on inventory
 *    and service amounts, freight amounts and other amounts (2024 help);
 *  - dates show Short (Sage's own example: 12-03-05) or Long (Nov 12, 05), the order of month, day
 *    and year can be changed (2016 help), and the setting is used on screen and in reports (2024);
 *  - the program switches between English and French (2023 help); whether a report's titles
 *    change with it is not said.
 * What the pages do NOT say, and so is assumed below: every column title (the words follow the
 * page's list), the title rows, that the detail is grouped under each customer's name with a
 * "Total" row, the month-first order with a four-digit year, and the whole French file: its titles,
 * day-first dates, semicolons, "1 134,56" amounts and windows-1252 bytes.
 *
 * Today's wrong answers, pinned as "fails today" tests:
 *  - dates written with a two-digit year, Sage's own short-date example, are not read at all;
 *  - the French file is split on its COMMAS, not its semicolons: with four comma-decimal columns on
 *    every line ("1 000,00;0,00;1 000,00;100,0") the comma wins the delimiter guess, so no column
 *    names are found and nothing can be added up. A French file with one amount column reads.
 */
import { csv } from "./csv";
import { utf8, windows1252 } from "../../helpers/encode";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-08";
const EXPORT_TYPES_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2026/Content/Reports_Forms/ExportingReports.htm";
const EXPORT_STEPS_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2026/Content/Reports_Forms/ExportReport.htm";
const CUSTOMER_SALES_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2024/Content/Reports_Forms/SalesCustomers/CustomerSalesReport.htm";
const CUSTOMER_SALES_OPTIONS_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2024/Content/Reports_Forms/SalesCustomers/ModifyCustomerSalesReport.htm";
const DATES_2016_PAGE =
  "https://help-sage50.na.sage.com/en-ca/2016/core/Content/System_Settings-ss/ss-co-xx-Dates.htm";
const DATE_FORMAT_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2024/Content/System_Settings/General/ChangeDateFormatLongShort.htm";
const LANGUAGE_PAGE =
  "https://help-sage50.na.sage.com/en-ca/core/2023/Content/CommonTasks/SwitchLanguage.htm";

export const sources: VendorSource[] = [
  {
    url: EXPORT_TYPES_PAGE,
    read: READ,
    says: "reports export as .csv, .htm, .pdf, .xls or .txt (Release 2026, published June 10, 2026)",
  },
  {
    url: EXPORT_STEPS_PAGE,
    read: READ,
    says: "Export on the report viewer toolbar, then pick a folder, a name and a Save as type, then Save",
  },
  {
    url: CUSTOMER_SALES_PAGE,
    read: READ,
    says: "Customer Sales reports show quantity, revenue, cost of goods sold, profit, and markup or margin",
  },
  {
    url: CUSTOMER_SALES_OPTIONS_PAGE,
    read: READ,
    says: "Customer Sales Detail: Show Corrections, choose columns, report on inventory and service, freight and other amounts",
  },
  {
    url: DATES_2016_PAGE,
    read: READ,
    says: "Short dates like 12-03-05 and Long dates like Nov 12, 05; the order of month, day and year can be changed",
  },
  {
    url: DATE_FORMAT_PAGE,
    read: READ,
    says: "the short and long date formats and separators are set under Setup > Settings > Company > Date Format, for screens and reports",
  },
  {
    url: LANGUAGE_PAGE,
    read: READ,
    says: "the program switches between English and French; nothing is said about report titles",
  },
];

const assumed = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: CUSTOMER_SALES_PAGE,
});

const COLUMNS: ColumnNote[] = [
  assumed("Date"), // 0; each customer's name and its Total row sit here too (assumed)
  assumed("Source"), // 1: the invoice number
  assumed("Item"), // 2
  assumed("Quantity"), // 3
  assumed("Revenue"), // 4
  assumed("COGS"), // 5: cost of goods sold
  assumed("Profit"), // 6
  assumed("Margin (%)"), // 7
];
/** The same columns in French. Every word is assumed; "Revenu" is the obvious translation. */
const FRENCH_COLUMNS: ColumnNote[] = [
  assumed("Date"),
  assumed("Source"),
  assumed("Article"),
  assumed("Quantité"),
  assumed("Revenu"),
  assumed("Coût des marchandises vendues"),
  assumed("Bénéfice"),
  assumed("Marge (%)"),
];
const DATE = 0;
const REVENUE = 4;

interface Sale {
  date: string;
  source: string;
  item: string;
  quantity: number;
  revenueCents: number;
  costCents: number;
}
interface Customer {
  name: string;
  sales: Sale[];
}

/** July 1134.56, August 420.00, September 75.25, and one line on 2 October (not over on 2026-10-06). */
export const CUSTOMERS: Customer[] = [
  {
    name: "Invented Client A",
    sales: [
      {
        date: "2026-07-14",
        source: "1001",
        item: "Design",
        quantity: 1,
        revenueCents: 100000,
        costCents: 0,
      },
      {
        date: "2026-08-03",
        source: "1004",
        item: "Prints",
        quantity: 4,
        revenueCents: 12000,
        costCents: 4800,
      },
      {
        date: "2026-10-02",
        source: "1007",
        item: "Design",
        quantity: 1,
        revenueCents: 5000,
        costCents: 0,
      },
    ],
  },
  {
    name: "Invented Client B",
    sales: [
      {
        date: "2026-07-28",
        source: "1002",
        item: "Prints",
        quantity: 3,
        revenueCents: 13456,
        costCents: 5400,
      },
      {
        date: "2026-08-21",
        source: "1005",
        item: "Design",
        quantity: 1,
        revenueCents: 30000,
        costCents: 0,
      },
      {
        date: "2026-09-16",
        source: "1006",
        item: "Prints",
        quantity: 1,
        revenueCents: 7525,
        costCents: 1800,
      },
    ],
  },
];

export const TRUE_MONTHS = [
  { periodStart: "2026-07-01", amountCents: 113456 },
  { periodStart: "2026-08-01", amountCents: 42000 },
  { periodStart: "2026-09-01", amountCents: 7525 },
];

type Style = {
  date: (iso: string) => string;
  money: (cents: number) => string;
  margin: (cents: number, cost: number) => string;
};

const pointMoney = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
/** "1 134,56": a no-break space between thousands (U+00A0, one byte in windows-1252), a decimal comma. */
const commaMoney = (cents: number): string => {
  const whole = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${whole},${String(cents % 100).padStart(2, "0")}`;
};
/** Margin to one decimal; never added up, only there so the row looks like the report's. */
const margin = (cents: number, cost: number, comma: boolean): string => {
  const tenths = Math.round(((cents - cost) * 1000) / cents);
  const text = `${Math.floor(tenths / 10)}.${tenths % 10}`;
  return comma ? text.replace(".", ",") : text;
};

const mdy4 = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
};
/** Sage's own short example, 12-03-05: a two-digit year. Month first, as the long example (Nov 12, 05) is. */
const mdy2 = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y.slice(2)}`;
};
const dmy4 = (iso: string): string => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

const ENGLISH: Style = { date: mdy4, money: pointMoney, margin: (c, k) => margin(c, k, false) };
const SHORT_YEAR: Style = { date: mdy2, money: pointMoney, margin: (c, k) => margin(c, k, false) };
const FRENCH: Style = { date: dmy4, money: commaMoney, margin: (c, k) => margin(c, k, true) };

function reportRows(columns: ColumnNote[], style: Style, title: string, range: string): string[][] {
  const rows: string[][] = [
    ["Invented Shop Ltd."],
    [title],
    [range],
    [],
    columns.map((c) => c.header),
  ];
  for (const customer of CUSTOMERS) {
    rows.push([customer.name]);
    let revenue = 0;
    let cost = 0;
    for (const s of customer.sales) {
      revenue += s.revenueCents;
      cost += s.costCents;
      rows.push([
        style.date(s.date),
        s.source,
        s.item,
        String(s.quantity),
        style.money(s.revenueCents),
        style.money(s.costCents),
        style.money(s.revenueCents - s.costCents),
        style.margin(s.revenueCents, s.costCents),
      ]);
    }
    rows.push([
      "Total",
      "",
      "",
      "",
      style.money(revenue),
      style.money(cost),
      style.money(revenue - cost),
      "",
    ]);
  }
  return rows;
}

const ENGLISH_TITLE = "Customer Sales Detail Report";
const ENGLISH_RANGE = "07-01-2026 to 10-06-2026";

/** 0-based rows: titles 0-2, blank 3, column names 4, then A's name 5, three lines, Total 9, B's name 10, three lines, Total 14. */
const MONTHS_TODAY = [
  { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 113456, rows: 2 },
  { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 42000, rows: 2 },
  { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 7525, rows: 1 },
];
const SKIPPED_TODAY = [
  { row: 6, reason: "no-date" as const }, // Invented Client A
  { row: 9, reason: "not-over" as const }, // 2 October
  { row: 10, reason: "total" as const },
  { row: 11, reason: "no-date" as const }, // Invented Client B
  { row: 15, reason: "total" as const },
];

const FRENCH_TITLE = "Rapport détaillé des ventes par client";
const FRENCH_RANGE = "01-07-2026 au 06-10-2026";

/** Every row under the column names left out: no date can be read, and the two Total rows. */
const SKIPPED_TWO_DIGIT = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((row) => ({
  row,
  reason: row === 10 || row === 15 ? ("total" as const) : ("no-date" as const),
}));

export const files: PracticeFile[] = [
  {
    id: "sage50-customer-sales-detail",
    shape: "Customer Sales Detail as .csv: grouped by customer with Total rows, dates 07-14-2026",
    fileName: "Customer Sales Detail.csv",
    bytes: () => utf8(csv(reportRows(COLUMNS, ENGLISH, ENGLISH_TITLE, ENGLISH_RANGE))),
    columns: COLUMNS,
    expected: {
      guess: { headerRow: 4, dateColumn: DATE, amountColumn: REVENUE },
      // 07-14-2026 can only be month-first.
      dateOrder: { order: "mdy", ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: MONTHS_TODAY,
      skipped: SKIPPED_TODAY,
    },
  },
  {
    id: "sage50-two-digit-year",
    shape: "the same report with Sage's own short date shape, 07-14-26",
    fileName: "Customer Sales Detail.csv",
    bytes: () => utf8(csv(reportRows(COLUMNS, SHORT_YEAR, ENGLISH_TITLE, "07-01-26 to 10-06-26"))),
    columns: COLUMNS,
    expected: {
      // WRONG TODAY: a two-digit year is never guessed, so no row has a date and no row of column
      // names is found. The person picks the row and the columns, and every line is still "no
      // date". True: TRUE_MONTHS.
      guess: null,
      picks: { headerRow: 4, dateColumn: DATE, amountColumn: REVENUE },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [],
      skipped: SKIPPED_TWO_DIGIT,
    },
  },
  {
    id: "sage50-french",
    shape:
      "the report in French: semicolons, day-first dates, 1 134,56 amounts, saved as windows-1252",
    fileName: "Ventes détaillées par client.csv",
    bytes: () =>
      windows1252(
        csv(reportRows(FRENCH_COLUMNS, FRENCH, FRENCH_TITLE, FRENCH_RANGE), { delimiter: ";" }),
      ),
    columns: FRENCH_COLUMNS,
    expected: {
      // WRONG TODAY: every line is split on its commas, so row 5 is one cell ("Date;Source;...")
      // and no row reads as column names. Whatever the person picks, column A holds the start of
      // each line, not a date: nothing is added up. True: TRUE_MONTHS, read day-first in comma style.
      guess: null,
      picks: { headerRow: 4, dateColumn: 0, amountColumn: 1 },
      // The whole header line stays one cell (it holds no comma to split on); the data lines split
      // into five pieces on the commas of their four "1 000,00" amounts, so B to E get the screen's
      // stand-in names.
      columnsMisread: {
        readAs: [
          FRENCH_COLUMNS.map((c) => c.header).join(";"),
          "Column B",
          "Column C",
          "Column D",
          "Column E",
        ],
      },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [],
      skipped: SKIPPED_TWO_DIGIT,
    },
  },
];
