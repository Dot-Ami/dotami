import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeText } from "@/lib/figures/file/decode";
import { previewFile as runLikeTheScreen } from "@/lib/figures/file/preview";
import type { FileAnswers as Answers, FilePreview as ScreenRun } from "@/lib/figures/file/preview";
import { readSpreadsheet } from "@/lib/figures/file/read-file";
import { columnsOf, isBlankRow } from "@/lib/figures/file/table";
import { isRealCalendarDay } from "@/lib/figures/validate";
import * as freshbooks from "./fixtures/packages/freshbooks";
import * as quickbooks from "./fixtures/packages/quickbooks-online";
import * as sageAccounting from "./fixtures/packages/sage-accounting";
import * as sage50 from "./fixtures/packages/sage-50-canadian";
import type { PracticeFile } from "./fixtures/packages/types";
import * as wave from "./fixtures/packages/wave";
import * as xero from "./fixtures/packages/xero";
import { utf8, utf8Bom, windows1252 } from "./helpers/encode";
import { makeXlsx } from "./helpers/make-xlsx";

// [8c-3] Practice files shaped like each accounting program's export, run through the same steps
// the "Add from a file" screen runs (read, guess the columns, work out the date order and decimal
// style, add up by month): lib/figures/file/preview.ts, which the screen calls too. Every file is INVENTED and built in code; see
// docs/connectors/practice-files.md. A passing test here means "DotAmi reads a file SHAPED like
// this", never "a real export works": each guessed column title is marked `assumed` in its fixture.

/** The person's own calendar day, fixed so "is this month over yet" never depends on the clock. */
const TODAY = "2026-10-06";

/** Every package with practice files. A new package is added here AND in tests/fixtures/packages/. */
const PACKAGES = {
  xero: { sources: xero.sources, files: xero.files },
  "quickbooks-online": { sources: quickbooks.sources, files: quickbooks.files },
  wave: { sources: wave.sources, files: wave.files },
  freshbooks: { sources: freshbooks.sources, files: freshbooks.files },
  "sage-accounting": { sources: sageAccounting.sources, files: sageAccounting.files },
  "sage-50-canadian": { sources: sage50.sources, files: sage50.files },
};
const ALL_FILES: PracticeFile[] = Object.values(PACKAGES).flatMap((p) => p.files);

/** The answers a person gives on the screen for a file: the columns they pick, and how dates are written. */
function answersFor(file: PracticeFile): Answers {
  return {
    headerRow: file.expected.picks?.headerRow,
    dateColumn: file.expected.picks?.dateColumn,
    amountColumn: file.expected.picks?.amountColumn,
    refundColumn: file.expected.picks?.refundColumn,
    dateOrder: file.expected.answer,
  };
}

function find(id: string): PracticeFile {
  const file = ALL_FILES.find((f) => f.id === id);
  if (!file) throw new Error(`no practice file called ${id}`);
  return file;
}

/** One month's total, without the row count: for the "fails today" tests, which only pin the amount. */
function amountsOf(run: ScreenRun): { periodStart: string; amountCents: number }[] {
  return (run.result?.months ?? []).map((m) => ({
    periodStart: m.periodStart,
    amountCents: m.amountCents,
  }));
}

/** The reason a 1-based row is listed as left out, or undefined when it was counted. */
function reasonFor(run: ScreenRun, row: number): string | undefined {
  return run.result?.skipped.find((s) => s.row === row)?.reason;
}

/** Rows from just below the column names to the last row with anything in it. */
function rowsBelowHeader(run: ScreenRun): number {
  const header = run.picks.headerRow ?? 0;
  let last = run.rows.length - 1;
  while (last > header && isBlankRow(run.rows[last])) last -= 1;
  return last - header;
}

describe("encode helpers", () => {
  it("writes plain UTF-8 and UTF-8 with the three-byte mark", () => {
    expect([...utf8("é")]).toEqual([0xc3, 0xa9]);
    const withMark = utf8Bom("é");
    expect([...withMark.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(decodeText(withMark)).toBe("é");
  });

  it("writes Windows-1252 as one byte per letter, and the reader gets the same words back", () => {
    expect([...windows1252("reçu")]).toEqual([...utf8("re"), 0xe7, ...utf8("u")]);
    expect(decodeText(windows1252("Montant reçu"))).toBe("Montant reçu");
    // Every Latin-1 letter and sign has the same byte as its Unicode number.
    const latin1 = Array.from({ length: 0x100 - 0xa0 }, (_, i) =>
      String.fromCharCode(0xa0 + i),
    ).join("");
    expect(new TextDecoder("windows-1252").decode(windows1252(latin1))).toBe(latin1);
    expect(windows1252("a\r\nb").length).toBe(4);
  });

  it("refuses a character it can't write, and the error never repeats the text", () => {
    expect(() => windows1252("5 €")).toThrow(/U\+20AC/);
    expect(() => windows1252("it’s")).toThrow(/U\+2019/);
    let message = "";
    try {
      windows1252("client Atelier Nord €");
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).not.toContain("Atelier");
  });
});

describe("the workbook helper", () => {
  // Xero's help: an Excel report with formulas can show 0.00 until Enable Editing. A formula with no
  // `value` is written with no saved value, and the reader then has nothing to give for that cell.
  it("writes a formula with no saved value, which reads back as an empty cell", async () => {
    const bytes = makeXlsx([
      {
        name: "Sheet1",
        rows: [
          ["Qty", "Price", "Line"],
          [2, 30, { formula: "A2*B2" }],
          [1, 5, { formula: "A3*B3", value: 5 }],
        ],
      },
    ]);
    const read = await readSpreadsheet("formulas.xlsx", bytes);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.sheets[0].rows[2]).toEqual([1, 5, 5]); // a saved value is read
    expect(read.sheets[0].rows[1][2] ?? null).toBeNull(); // no saved value: nothing
  });
});

describe("every package says where its layout came from", () => {
  it("has a fixture module registered here for every file in tests/fixtures/packages", () => {
    const modules = readdirSync(new URL("./fixtures/packages/", import.meta.url))
      .filter((name) => name.endsWith(".ts") && !["types.ts", "csv.ts"].includes(name))
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();
    expect(modules).toEqual(Object.keys(PACKAGES).sort());
  });

  for (const [name, pkg] of Object.entries(PACKAGES)) {
    it(`${name}: lists vendor pages, each with an https address and the day it was read`, () => {
      expect(pkg.sources.length).toBeGreaterThan(0);
      for (const source of pkg.sources) {
        expect(source.url).toMatch(/^https:\/\/[^\s]+$/);
        // An address, never a query that could carry a figure. The one exception is how Sage's
        // Canadian knowledge base names an article: "?solutionid=" and the article's number.
        const url = source.url.replace(/^(https:\/\/ca-kb\.sage\.com\/[^?#]+)\?solutionid=\d+$/, "$1");
        expect(url).not.toMatch(/[?#]/);
        expect(source.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(isRealCalendarDay(source.read)).toBe(true);
        expect(source.says.length).toBeGreaterThan(10);
      }
    });

    it(`${name}: marks every column title documented or assumed, citing one of its pages`, () => {
      const urls = new Set(pkg.sources.map((s) => s.url));
      expect(pkg.files.length).toBeGreaterThan(0);
      for (const file of pkg.files) {
        expect(file.columns.length).toBeGreaterThan(1);
        for (const column of file.columns) {
          expect(["documented", "assumed"]).toContain(column.status);
          expect(
            urls.has(column.basis),
            `${file.id}: "${column.header}" cites a page not in sources`,
          ).toBe(true);
        }
      }
    });

    it(`${name}: says in its own header that everything is invented`, () => {
      const source = readFileSync(
        new URL(`./fixtures/packages/${name}.ts`, import.meta.url),
        "utf8",
      );
      expect(source).toContain("EVERYTHING HERE IS INVENTED");
    });
  }

  it("gives every practice file its own id", () => {
    const ids = ALL_FILES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(ALL_FILES)("$id", (file) => {
  it("finds the column names row and guesses the columns as recorded", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    const guess = run.guess;
    expect(
      guess && {
        headerRow: guess.headerRow,
        dateColumn: guess.dateColumn,
        amountColumn: guess.amountColumn,
      },
    ).toEqual(file.expected.guess);
    // The titles the file really holds, on the row the person ends up using, are the ones the
    // fixture marks documented or assumed.
    const answered = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(answered.picks.headerRow).not.toBeNull();
    const labels = columnsOf(answered.rows, answered.picks.headerRow!).map((c) => c.label);
    if (file.expected.columnsMisread) {
      expect(labels).toEqual(file.expected.columnsMisread.readAs);
      expect(labels).not.toEqual(file.columns.map((c) => c.header));
    } else {
      expect(labels).toEqual(file.columns.map((c) => c.header));
    }
  });

  it("reads the dates and the amounts the way the file writes them", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(run.detectedOrder).toEqual(file.expected.dateOrder);
    expect(run.detectedStyle).toBe(file.expected.decimalStyle);
  });

  it("adds up each month to the cent and lists every row it leaves out", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(run.state).toBe("ready");
    const result = run.result!;
    expect(result.months).toEqual(file.expected.months);
    expect(result.skipped).toEqual(file.expected.skipped);
    // Every row below the column names is either in a month or listed, none dropped.
    expect(result.rowsCounted).toBe(result.months.reduce((sum, m) => sum + m.rows, 0));
    expect(result.rowsCounted + result.skipped.length).toBe(rowsBelowHeader(run));
  });
});

describe("Xero", () => {
  it("waits for the person's answer when no date proves the order, then reads it as told", async () => {
    const file = find("xero-ambiguous");
    const asked = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, {
      dateColumn: xero.INVOICE_DATE,
      amountColumn: xero.UNIT_AMOUNT,
    });
    expect(asked.state).toBe("waiting");
    expect(asked.waitingFor).toBe("date-order-answer");
    expect(asked.result).toBeNull();
  });

  it("files the same rows under other months when the order is read the other way", async () => {
    const file = find("xero-ambiguous");
    const other = xero.AMBIGUOUS_READ_MONTH_FIRST;
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, {
      dateColumn: xero.INVOICE_DATE,
      amountColumn: xero.UNIT_AMOUNT,
      dateOrder: other.answer,
    });
    expect(run.result!.months).toEqual(other.months);
    expect(run.result!.skipped).toEqual(other.skipped);
    expect(run.result!.months).not.toEqual(file.expected.months);
  });

  it("writes the French file in windows-1252, which is not valid UTF-8, so the reader's fallback is what runs", () => {
    const bytes = find("xero-france").bytes();
    expect(bytes).toContain(0xe9); // é as one byte
    expect(() => new TextDecoder("utf-8", { fatal: true }).decode(bytes)).toThrow();
    expect(decodeText(bytes)).toContain("Société Inventée A");
  });

  it("UnitAmount is a price per item: summing it falls short of what was invoiced", async () => {
    const file = find("xero-dmy");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    const summed = Object.fromEntries(
      run.result!.months.map((m) => [m.periodStart.slice(0, 7), m.amountCents]),
    );
    const invoiced = xero.invoicedCents(xero.MAIN_LINES);
    // July: 3 x 100.00 + 50.00 was invoiced, but the column holds 100.00 + 50.00.
    expect(invoiced["2026-07"]).toBe(35000);
    expect(summed["2026-07"]).toBe(15000);
    expect(invoiced["2026-08"]).toBe(18000);
    expect(summed["2026-08"]).toBe(10000);
    // A month where every line sold one item is the one place the two agree.
    expect(summed["2026-09"]).toBe(invoiced["2026-09"]);
  });

  it("the true totals written beside the wrong-today figures in the fixture match the line data", () => {
    // French file: July sold 1 x 1100,00 and 2 x 80,50; August sold one item at 250,00.
    expect(xero.invoicedCents(xero.FRANCE_LINES)).toMatchObject({
      "2026-07": 126100,
      "2026-08": 25000,
    });
    // Read month-first, 02/07/2026 is 7 February: put each line in the month its day number names.
    const readMonthFirst = xero.AMBIGUOUS_LINES.map((l) => {
      const [year, month, day] = l.date.split("-");
      return { ...l, date: `${year}-${day}-${month}` };
    });
    expect(xero.invoicedCents(readMonthFirst)).toMatchObject({
      "2026-02": 32500,
      "2026-03": 12000,
      "2026-05": 7500,
      "2026-09": 5000,
    });
  });
});

/*
 * The three gaps the practice files found, all fixed (the maintainer's decision, 2026-10-07). They
 * were `it.fails` tests until the fix landed; each is now a normal test. The rules themselves have
 * their own tests in tests/figures-file-logic.spec.ts ("guessColumns" blocks).
 */
describe("gaps the practice files found, now fixed", () => {
  // Xero's UnitAmount is the price of ONE item. Pre-filled, it gave July $150 against a true $350.
  it("Xero: does not pre-fill UnitAmount as the amount (a price per item, not a total)", async () => {
    const file = find("xero-dmy");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.guess?.amountColumn).toBeNull();
    expect(run.picks.amountColumn).toBeNull();
    // Nothing is added up until the person picks a column.
    expect(run.state).toBe("waiting");
    expect(run.waitingFor).toBe("a-column");
  });

  // InvoiceDate and DueDate both read as dates; the invoice date is the day of the sale and wins.
  it("Xero: pre-fills InvoiceDate as the date column, not DueDate", async () => {
    const file = find("xero-dmy");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.dateColumn).toBe(xero.INVOICE_DATE);
  });

  // With one line per customer the names and "Total for" rows outnumber the dates in column A.
  it("QuickBooks: pre-fills Date when each customer has only one line", async () => {
    const file = find("quickbooks-grouped-sparse");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.dateColumn).toBe(0);
  });
});

// A fourth gap, a Payment row counted as a second sale, was fixed by the optional Type column
// (the maintainer's decision, 2026-10-07): the "Transaction Type" header pre-fills it and Payment and
// Deposit rows are left out and listed. Tests of the rule itself: tests/figures-file-type-column.spec.ts.
describe("QuickBooks Transaction List", () => {
  it("does not count a Payment row as a second sale", async () => {
    const file = find("quickbooks-transaction-list");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.typeColumn).toBe(1); // "Transaction Type"
    const july = run.result!.months.find((m) => m.periodStart === "2026-07-01");
    expect(july?.amountCents).toBe(10215); // invoice 47.60 + sales receipt 54.55
    expect(run.result!.skipped).toContainEqual({ row: 7, reason: "payment" });
  });

  it("would count the payment too, as before, if the person cleared the Type column", async () => {
    const file = find("quickbooks-transaction-list");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, { typeColumn: null });
    const july = run.result!.months.find((m) => m.periodStart === "2026-07-01");
    expect(july?.amountCents).toBe(14975); // 47.60 + 47.60 + 54.55
  });
});

// Three more gaps, fixed by the optional Status column and a smarter search for the column names
// (the maintainer's decision, 2026-10-07): void, deleted and draft invoices are left out and listed,
// and a summary block above the table is no longer taken for the column names. They were `it.fails`
// tests until the fix landed. Tests of the rules themselves: tests/figures-file-status-column.spec.ts.
describe("void and draft invoices, and a summary above the table", () => {
  // The summary's "Total Invoiced, Total Paid" titles were taken for the column names, and "Total
  // Paid" was pre-filled as the amount over the invoice numbers.
  it("FreshBooks: finds the real column names under the summary block", async () => {
    for (const id of [
      "freshbooks-invoices-iso",
      "freshbooks-invoices-month-name",
      "freshbooks-invoices-dmy",
    ]) {
      const run = await runLikeTheScreen(find(id).fileName, find(id).bytes(), TODAY);
      expect(run.picks, id).toEqual({
        headerRow: 4,
        dateColumn: 2, // Issue Date
        amountColumn: 4, // Subtotal, before tax
        typeColumn: null,
        statusColumn: 3, // Status
      });
    }
  });

  it("FreshBooks: a Draft invoice is left out and listed", async () => {
    const file = find("freshbooks-invoices-iso");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(amountsOf(run)).toEqual(freshbooks.ISSUED_NOT_DRAFT); // August 476.19, not 726.19
    expect(reasonFor(run, 9)).toBe("void-or-draft"); // invoice 0000004, the Draft
  });

  it("Sage Accounting: a voided invoice is left out and listed", async () => {
    const file = find("sage-accounting-sales-list");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(run.picks.statusColumn).toBe(6);
    expect(amountsOf(run)).toEqual(sageAccounting.SALES_NOT_VOID); // August -50.00, not 150.00
    expect(reasonFor(run, 4)).toBe("void-or-draft"); // SI-3, Void
  });

  // Receivable Invoice Detail includes voided invoices by default.
  it("Xero Receivable Invoice Detail: the Voided invoice is left out and listed", async () => {
    const file = find("xero-receivable-invoice-detail");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.statusColumn).toBe(3);
    expect(reasonFor(run, xero.DETAIL_VOIDED_ROW)).toBe("void-or-draft");
    // No August total at all: its only other line is the formula with no saved value (still a gap).
    expect(amountsOf(run).map((m) => m.periodStart)).toEqual(["2026-07-01", "2026-09-01"]);
  });

  it("clearing the Status column counts the void and the draft again, as before", async () => {
    const sage = find("sage-accounting-sales-list");
    const run = await runLikeTheScreen(sage.fileName, sage.bytes(), TODAY, {
      ...answersFor(sage),
      statusColumn: null,
    });
    const august = run.result!.months.find((m) => m.periodStart === "2026-08-01");
    expect(august?.amountCents).toBe(15000); // the void's 200.00 plus the credit note's -50.00
  });
});

// One more gap, fixed by the optional "Refunds / money out" column (the maintainer's decision,
// 2026-10-07: refunds are subtracted from the month the money left, under the same rule as the bank
// screen). It was an `it.fails` test until the fix landed. Tests of the rule itself:
// tests/figures-file-refunds.spec.ts.
describe("a refund in a ledger's Debit column", () => {
  // Wave's ledger keeps sales in Credit and a refund in Debit. With Credit picked as the amount and
  // Debit as the refunds column, the 40.00 refund paid back on 19 August is taken off August.
  it("Wave: a refund in the Debit column lowers the month it was paid back", async () => {
    const file = find("wave-account-transactions");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(amountsOf(run)).toEqual(wave.LEDGER_NET_OF_REFUNDS); // August 280.00, not 320.00
    const august = run.result!.months.find((m) => m.periodStart === "2026-08-01");
    expect(august?.refunds).toEqual({ rows: 1, cents: 4000 });
    // Positive first: the refund's row is counted, and so no longer listed as "no amount".
    expect(august?.rows).toBe(2);
    expect(reasonFor(run, 12)).toBeUndefined();
  });

  it("Wave: without a refunds column nothing is taken off, and the refund row is listed as no amount", async () => {
    const file = find("wave-account-transactions");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, {
      amountColumn: wave.LEDGER_CREDIT,
    });
    // The refunds column is never pre-filled, not even for a column called "Debit".
    expect(run.picks.refundColumn ?? null).toBeNull();
    const august = run.result!.months.find((m) => m.periodStart === "2026-08-01");
    expect(august).toEqual({
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      amountCents: 32000,
      rows: 1,
    });
    expect(reasonFor(run, 12)).toBe("no-amount");
    // No month says a refund was taken off.
    expect(run.result!.months.some((m) => m.refunds)).toBe(false);
  });
});

describe("Sage 50 Canadian's export route", () => {
  // Sage 50 offers .csv, .htm, .pdf, .xls and .txt. Its Excel choice is the old .xls format, which
  // DotAmi refuses with a sentence saying what to do; the practice files above prove the .csv route.
  it("refuses an old .xls export with a sentence saying to save it as .xlsx, and reads the .csv", async () => {
    // D0 CF 11 E0 A1 B1 1A E1: the first bytes of every old-format Excel file.
    const oldXls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    const refused = await readSpreadsheet("Customer Sales Detail.xls", oldXls);
    expect(refused.ok).toBe(false);
    expect(refused.ok ? "" : refused.error).toMatch(
      /older Excel file \(\.xls\).*save a copy as \.xlsx/,
    );
    const csvFile = find("sage50-customer-sales-detail");
    expect((await readSpreadsheet(csvFile.fileName, csvFile.bytes())).ok).toBe(true);
  });
});

/*
 * Gaps the Wave, FreshBooks, Sage and Xero Receivable Invoice Detail files found (2026-10-08). Each
 * is written as an `it.fails` test: it passes only while the gap is there, so the day a fix lands it
 * errors until it becomes a normal test. The fixes are follow-on slices, not this one:
 * docs/connectors/practice-files.md "Known gaps" lists each one. The void, draft and summary-block
 * gaps are fixed: their tests are in "void and draft invoices, and a summary above the table" above.
 * So is Wave's refund in the Debit column: "a refund in a ledger's Debit column" above.
 */
describe("gaps the newer practice files found, fails today", () => {
  // Wave's Income by Customer has no dates at all, and the screen should name the report that
  // does (Account Transactions). That gap is pinned in the browser, in e2e/app.spec.ts ("fails
  // today: Wave's Income by Customer..."), not here: the "no column names" sentence is written by
  // components/ventures/file-drop.tsx, and previewFile's `message` is null for every file with no
  // columns picked, so a check on it here would stay red whichever way the fix is built.

  // dd.mm.yy is one of FreshBooks' six date formats; a two-digit year is never read today.
  it.fails("FreshBooks: dates written dd.mm.yy are read once the century is known", async () => {
    const file = find("freshbooks-invoices-two-digit-year");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(amountsOf(run).map((m) => m.periodStart)).toEqual(
      freshbooks.ISSUED_NOT_DRAFT.map((m) => m.periodStart),
    );
  });

  it.fails("FreshBooks: Revenue by Client, months across the top, gives one total per month", async () => {
    const file = find("freshbooks-revenue-by-client");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(amountsOf(run)).toEqual(freshbooks.ISSUED_NOT_DRAFT);
  });

  // 12-03-05 is Sage 50's own example of a short date.
  it.fails("Sage 50: dates with a two-digit year are read once the century is known", async () => {
    const file = find("sage50-two-digit-year");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(amountsOf(run)).toEqual(sage50.TRUE_MONTHS);
  });

  // Four comma-decimal columns per line win the delimiter guess over the semicolons: every line
  // splits on its commas and no column names are found. One amount column reads fine.
  it.fails("Sage 50 French: a semicolon file with several comma-decimal columns is split on its semicolons", async () => {
    const file = find("sage50-french");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.detectedStyle).toBe("comma");
    expect(amountsOf(run)).toEqual(sage50.TRUE_MONTHS);
  });

  // The cell holds a formula Excel never worked out; "no amount" sends the person looking for an
  // empty cell. It should say the sum wasn't saved (open the file in Excel, let it calculate, save).
  it.fails("Xero Receivable Invoice Detail: a formula with no saved value is told apart from an empty cell", async () => {
    const file = find("xero-receivable-invoice-detail");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    // Positive first: the row is listed, not counted and not lost.
    expect(reasonFor(run, xero.DETAIL_UNSAVED_FORMULA_ROW)).toBeDefined();
    expect(reasonFor(run, xero.DETAIL_UNSAVED_FORMULA_ROW)).not.toBe("no-amount");
  });

  it("the true figures those tests pin add up from the fixtures' own line data", () => {
    /** Cents per month (YYYY-MM-01), September and before only: October is not over on TODAY. */
    const byMonth = (items: { day: string; cents: number }[]) => {
      const out: Record<string, number> = {};
      for (const { day, cents } of items) {
        if (day >= "2026-10") continue;
        const month = `${day.slice(0, 7)}-01`;
        out[month] = (out[month] ?? 0) + cents;
      }
      return Object.entries(out)
        .sort()
        .map(([periodStart, amountCents]) => ({ periodStart, amountCents }));
    };
    expect(sage50.TRUE_MONTHS).toEqual(
      byMonth(
        sage50.CUSTOMERS.flatMap((c) => c.sales.map((s) => ({ day: s.date, cents: s.revenueCents }))),
      ),
    );
    expect(freshbooks.ISSUED_NOT_DRAFT).toEqual(
      byMonth(
        freshbooks.INVOICES.filter((i) => i.status !== "Draft").map((i) => ({
          day: i.issued,
          cents: i.subtotalCents,
        })),
      ),
    );
    expect(sageAccounting.SALES_NOT_VOID).toEqual(
      byMonth(
        sageAccounting.SALES.filter((d) => d.status !== "Void").map((d) => ({
          day: d.date,
          cents: d.netCents,
        })),
      ),
    );
    expect(wave.LEDGER_NET_OF_REFUNDS).toEqual(
      byMonth(
        wave.SALES_LINES.map((l) => ({ day: l.date, cents: l.side === "credit" ? l.cents : -l.cents })),
      ),
    );
  });
});

describe("the practice files stay private and in step with the screen", () => {
  it("the screen takes its steps from lib/figures/file/preview.ts, the code these tests run", () => {
    const screen = readFileSync(
      new URL("../components/ventures/file-drop.tsx", import.meta.url),
      "utf8",
    );
    // If this fails, file-drop.tsx stopped using the shared steps and has its own again, which is
    // the copy that used to drift from what these tests check.
    for (const piece of ["previewSheet(", "guessPicks(", "firstSheetWithRows("]) {
      expect(screen, `file-drop.tsx no longer calls ${piece}`).toContain(piece);
    }
    // The steps themselves must not be repeated in the screen.
    for (const piece of [
      "monthlyTotals(",
      "guessColumns(",
      "detectDateOrder(",
      "detectDecimalStyle(",
    ]) {
      expect(screen, `file-drop.tsx calls ${piece} itself`).not.toContain(piece);
    }
  });

  it("nothing here writes to the console", () => {
    const names = [
      "../tests/figures-file-packages.spec.ts",
      "../tests/helpers/encode.ts",
      ...readdirSync(new URL("./fixtures/packages/", import.meta.url)).map(
        (name) => `../tests/fixtures/packages/${name}`,
      ),
    ];
    for (const name of names) {
      const source = readFileSync(new URL(name, import.meta.url), "utf8");
      expect(source, `${name} writes to the console`).not.toMatch(/console\s*\./);
    }
  });
});
