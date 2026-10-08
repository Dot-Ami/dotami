/**
 * Practice files shaped like Wave reports exported to CSV.
 *
 * EVERYTHING HERE IS INVENTED. The company ("Invented Shop Ltd."), the clients and every amount are
 * made up; nothing was taken from a real export. The only things taken from Wave are layout facts
 * and names from its own help pages, each listed in `sources` with the day it was read.
 *
 * What the pages say, as read on 2026-10-08:
 *  - a report is exported from Reports > the report > Export, as CSV or PDF only;
 *  - to list transactions between two dates, Wave points to the Account Transactions report;
 *  - Account Transactions (General Ledger) is grouped by account, with each account's starting and
 *    ending balances, each transaction's debit OR credit amount, the total debits and credits per
 *    account, and the balance change. It can be run for one account;
 *  - Income by Customer has exactly three columns, "Customers", "All income" and "Paid income", one
 *    row per customer for a chosen date range, with the sums at the bottom, and no date column;
 *  - Wave is only available in English, so there is no French layout to plan for.
 * What the pages do NOT say, and so is assumed below: every column title of the Account
 * Transactions CSV, the title rows above the table, how dates are written (written here as
 * 2026-07-08), the words on the balance and totals rows, and where the account's name sits. For
 * Income by Customer only the title rows above the three documented columns are assumed.
 *
 * In a sales (income) account money in is a CREDIT and a refund paid back is a DEBIT, so the sales
 * are in one column and the refunds in another. DotAmi adds up one column, so with Credit picked
 * the refund row has nothing in it and is listed as "no amount": August comes out 40.00 too high.
 * That is pinned as a "fails today" test; refunds are their own slice.
 */
import { csv } from "./csv";
import { utf8 } from "../../helpers/encode";
import type { ColumnNote, PracticeFile, VendorSource } from "./types";

const READ = "2026-10-08";
const EXPORT_PAGE = "https://support.waveapps.com/hc/en-us/articles/38600080764692-Export-a-report";
const LEDGER_PAGE =
  "https://support.waveapps.com/hc/en-us/articles/38991118101908-View-and-understand-your-account-transactions-general-ledger-report";
const DATA_EXPORT_PAGE =
  "https://support.waveapps.com/hc/en-us/articles/4411360860692-Download-your-account-data";
const INCOME_BY_CUSTOMER_PAGE =
  "https://support.waveapps.com/hc/en-us/articles/38970823071508-View-and-understand-your-Income-by-Customer-report";
const LANGUAGE_PAGE =
  "https://support.waveapps.com/hc/en-us/articles/115005571103-Is-Wave-available-in-my-language";

export const sources: VendorSource[] = [
  {
    url: EXPORT_PAGE,
    read: READ,
    says: "reports export from Reports > the report > Export, as CSV or PDF only (page updated 2026-10-08)",
  },
  {
    url: LEDGER_PAGE,
    read: READ,
    says: "Account Transactions is grouped by account: starting and ending balances, each transaction's debit or credit, total debits and credits, balance change",
  },
  {
    url: DATA_EXPORT_PAGE,
    read: READ,
    says: "for the transactions between two dates, export an Account Transactions report filtered to those dates",
  },
  {
    url: INCOME_BY_CUSTOMER_PAGE,
    read: READ,
    says: "Income by Customer has 3 columns, Customers, All income and Paid income, sums at the bottom, and no dates",
  },
  {
    url: LANGUAGE_PAGE,
    read: READ,
    says: "Wave is only available in English, so its reports have English titles only",
  },
];

/** A title we guessed: the ledger page lists what the report shows, not its column titles. */
const assumedLedger = (header: string): ColumnNote => ({
  header,
  status: "assumed",
  basis: LEDGER_PAGE,
});
/** A title the Income by Customer page spells out. */
const documentedIncome = (header: string): ColumnNote => ({
  header,
  status: "documented",
  basis: INCOME_BY_CUSTOMER_PAGE,
});

const LEDGER_COLUMNS: ColumnNote[] = [
  assumedLedger("Date"), // 0; the account's name and the balance rows sit here too (assumed)
  assumedLedger("Description"), // 1
  assumedLedger("Debit"), // 2: a refund paid back out of a sales account
  assumedLedger("Credit"), // 3: a sale
  assumedLedger("Balance"), // 4: running
];
export const LEDGER_DEBIT = 2;
export const LEDGER_CREDIT = 3;

const INCOME_COLUMNS: ColumnNote[] = [
  documentedIncome("Customers"),
  documentedIncome("All income"),
  documentedIncome("Paid income"),
];

/** One line in the Sales account: a sale (credit) or a refund paid back (debit). */
interface LedgerLine {
  date: string;
  description: string;
  /** Positive cents: a credit for a sale, a debit for a refund. */
  cents: number;
  side: "credit" | "debit";
}

/**
 * Three months of sales in the Sales account, one refund in August, and one sale on 2 October, a
 * month not over on 2026-10-06 (the day the tests fix as "today").
 */
export const SALES_LINES: LedgerLine[] = [
  {
    date: "2026-07-08",
    description: "Invoice 1 - Invented Client A",
    cents: 50000,
    side: "credit",
  },
  {
    date: "2026-07-22",
    description: "Invoice 2 - Invented Client B",
    cents: 25000,
    side: "credit",
  },
  {
    date: "2026-08-05",
    description: "Invoice 3 - Invented Client C",
    cents: 32000,
    side: "credit",
  },
  // 40.00 paid back to Invented Client B for part of invoice 2: money OUT of the sales account.
  { date: "2026-08-19", description: "Refund - Invented Client B", cents: 4000, side: "debit" },
  {
    date: "2026-09-10",
    description: "Invoice 4 - Invented Client A",
    cents: 18000,
    side: "credit",
  },
  { date: "2026-10-02", description: "Invoice 5 - Invented Client C", cents: 9000, side: "credit" },
];

const money = (cents: number): string =>
  `${Math.floor(Math.abs(cents) / 100)}.${String(Math.abs(cents) % 100).padStart(2, "0")}`;

/** "Account Transactions (General Ledger)" for the Sales account only, as CSV. */
function ledgerText(): string {
  let balance = 0;
  let debits = 0;
  let credits = 0;
  const lines = SALES_LINES.map((l) => {
    if (l.side === "credit") {
      balance += l.cents;
      credits += l.cents;
    } else {
      balance -= l.cents;
      debits += l.cents;
    }
    return [
      l.date,
      l.description,
      l.side === "debit" ? money(l.cents) : "",
      l.side === "credit" ? money(l.cents) : "",
      money(balance),
    ];
  });
  return csv([
    ["Invented Shop Ltd."],
    ["Account Transactions"],
    ["Date Range: Jul 1, 2026 to Oct 6, 2026"],
    ["Report Type: Accrual (Paid & Unpaid)"],
    [],
    LEDGER_COLUMNS.map((c) => c.header),
    ["Sales"], // the account's name, alone on its row (assumed)
    ["Starting Balance", "", "", "", "0.00"],
    ...lines,
    ["Totals", "", money(debits), money(credits), ""],
    ["Balance Change", "", "", "", money(balance)],
    ["Ending Balance", "", "", "", money(balance)],
  ]);
}

/** "Income by Customer" for July to September: one row per customer, the sums at the bottom. */
function incomeByCustomerText(): string {
  return csv([
    ["Invented Shop Ltd."],
    ["Income by Customer"],
    ["Date Range: Jul 1, 2026 to Sep 30, 2026"],
    [],
    INCOME_COLUMNS.map((c) => c.header),
    ["Invented Client A", "680.00", "680.00"],
    ["Invented Client B", "210.00", "210.00"],
    ["Invented Client C", "320.00", "0.00"],
    ["Total", "1210.00", "890.00"],
  ]);
}

/**
 * What the sales add up to once refunds are taken off in the month they were paid back: July 750.00,
 * August 320.00 - 40.00 = 280.00, September 180.00. Pinned in tests/figures-file-packages.spec.ts as
 * what the ledger should give; today it gives August 320.00.
 */
export const LEDGER_NET_OF_REFUNDS = [
  { periodStart: "2026-07-01", amountCents: 75000 },
  { periodStart: "2026-08-01", amountCents: 28000 },
  { periodStart: "2026-09-01", amountCents: 18000 },
];

export const files: PracticeFile[] = [
  {
    id: "wave-account-transactions",
    shape:
      "Account Transactions (General Ledger) for the Sales account: balance rows, Debit and Credit columns, a refund",
    fileName: "Account Transactions.csv",
    bytes: () => utf8(ledgerText()),
    columns: LEDGER_COLUMNS,
    expected: {
      // "Date" is pre-filled. Debit and Credit match no amount name, so nothing is pre-filled as the
      // amount and the person picks Credit, where the sales are.
      guess: { headerRow: 5, dateColumn: 0, amountColumn: null },
      picks: { amountColumn: LEDGER_CREDIT },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [
        { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 75000, rows: 2 },
        // WRONG TODAY: the 40.00 refund is in the Debit column, so it isn't taken off. True: 280.00.
        { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 32000, rows: 1 },
        { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 18000, rows: 1 },
      ],
      skipped: [
        { row: 7, reason: "no-date" }, // Sales, the account's name
        { row: 8, reason: "no-date" }, // Starting Balance
        { row: 12, reason: "no-amount" }, // the refund: its Credit cell is empty
        { row: 14, reason: "not-over" }, // 2 October
        { row: 15, reason: "total" }, // Totals
        { row: 16, reason: "no-date" }, // Balance Change
        { row: 17, reason: "no-date" }, // Ending Balance
      ],
    },
  },
  {
    id: "wave-income-by-customer",
    shape: "Income by Customer: one total per customer for a date range, and no date column",
    fileName: "Income by Customer.csv",
    bytes: () => utf8(incomeByCustomerText()),
    columns: INCOME_COLUMNS,
    expected: {
      // No row of column names has a date under it, so DotAmi finds none. The person picks row 5,
      // and with no date column at all, every row is "no date": nothing can be added up by month.
      // Fails today: the screen should say which report to export instead (Account Transactions).
      guess: null,
      picks: { headerRow: 4, dateColumn: 0, amountColumn: 1 },
      dateOrder: { order: null, ambiguous: false, conflicting: false },
      decimalStyle: "point",
      months: [],
      skipped: [
        { row: 6, reason: "no-date" },
        { row: 7, reason: "no-date" },
        { row: 8, reason: "no-date" },
        { row: 9, reason: "total" },
      ],
    },
  },
];
