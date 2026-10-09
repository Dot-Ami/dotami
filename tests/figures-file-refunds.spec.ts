import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bankMonthlyTotals } from "@/lib/figures/bank/totals";
import type { BankRow } from "@/lib/figures/bank/types";
import { guessPicks, previewFile, previewSheet } from "@/lib/figures/file/preview";
import type { Picks } from "@/lib/figures/file/preview";
import { monthlyTotals } from "@/lib/figures/file/totals";
import type { Cell, ColumnChoice } from "@/lib/figures/file/types";
import { refundPaidOut, revenueEffect } from "@/lib/figures/refunds";
import { utf8 } from "./helpers/encode";

// [8c-3] Refunds on "Add from a file": a ledger-style export (Wave's Account Transactions) keeps
// sales in one column (Credit) and refunds paid back in another (Debit). With the optional "Refunds
// / money out" column picked, each refund is taken off the month the money left, under the one rule
// the bank screen uses too (lib/figures/refunds.ts; the maintainer's decision, 2026-10-07). Every
// figure here is invented.

const TODAY = "2026-10-06";

/** Columns: A Date, B Description, C Debit (refunds), D Credit (sales). */
const HEADER: Cell[] = ["Date", "Description", "Debit", "Credit"];
const CHOICE: ColumnChoice = {
  headerRow: 0,
  dateColumn: 0,
  amountColumn: 3,
  refundColumn: 2,
  dateOrder: null,
  decimalStyle: "point",
};

/** A March sale of 100.00 and the 30.00 of it paid back in April. */
const MARCH_SALE_APRIL_REFUND: Cell[][] = [
  HEADER,
  ["2026-03-20", "Invoice 1 - Invented Client A", "", "100.00"],
  ["2026-04-02", "Refund - Invented Client A", "30.00", ""],
  ["2026-04-15", "Invoice 2 - Invented Client B", "", "50.00"],
];

describe("the shared refund rule", () => {
  it("money in counts as it is, whether or not refunds count", () => {
    expect(revenueEffect(12345, false)).toBe(12345);
    expect(revenueEffect(12345, true)).toBe(12345);
  });

  it("money out counts only when refunds count, and then lowers the month", () => {
    expect(revenueEffect(-3000, true)).toBe(-3000);
    expect(revenueEffect(-3000, false)).toBeNull();
  });

  it("zero never counts", () => {
    expect(revenueEffect(0, true)).toBeNull();
    expect(revenueEffect(0, false)).toBeNull();
    expect(revenueEffect(refundPaidOut(0), true)).toBeNull();
  });

  it("a refunds column's amount is money out whichever sign the file wrote", () => {
    expect(refundPaidOut(4000)).toBe(-4000);
    expect(refundPaidOut(-4000)).toBe(-4000);
  });

  it("both totals modules take the rule from lib/figures/refunds.ts rather than keeping a copy", () => {
    const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    const bank = read("lib/figures/bank/totals.ts");
    const file = read("lib/figures/file/totals.ts");
    expect(bank).toMatch(/import \{[^}]*\brevenueEffect\b[^}]*\} from "\.\.\/refunds"/);
    expect(file).toMatch(/import \{[^}]*\brevenueEffect\b[^}]*\} from "\.\.\/refunds"/);
    // The bank's old inline test of the sign is gone, so the two can't drift apart again.
    expect(bank).not.toMatch(/cents < 0 && !options\.allowRefunds/);
  });

  it("a bank statement and a ledger file give the same months for the same sale and refund", () => {
    const bankRow = (id: string, day: string, cents: number): BankRow => ({
      id,
      day,
      cents,
      currency: "CAD",
      description: "Deposit",
    });
    const bank = bankMonthlyTotals(
      [
        bankRow("sale", "2026-03-20", 10000),
        bankRow("refund", "2026-04-02", -3000),
        bankRow("sale2", "2026-04-15", 5000),
      ],
      new Set(["sale", "refund", "sale2"]),
      [{ from: "2026-03-01", to: "2026-04-30" }],
      TODAY,
      { currency: "CAD", allowRefunds: true },
    );
    const file = monthlyTotals(MARCH_SALE_APRIL_REFUND, CHOICE, TODAY);
    const amounts = (months: { periodStart: string; amountCents: number }[]) =>
      months.map((m) => [m.periodStart, m.amountCents]);
    expect(amounts(file.months)).toEqual([
      ["2026-03-01", 10000],
      ["2026-04-01", 2000],
    ]);
    expect(amounts(file.months)).toEqual(amounts(bank.months));
  });
});

describe("monthlyTotals with a refunds column", () => {
  it("takes a refund off the month it was paid back, not the month of the sale", () => {
    const result = monthlyTotals(MARCH_SALE_APRIL_REFUND, CHOICE, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 10000, rows: 1 },
      {
        periodStart: "2026-04-01",
        periodEnd: "2026-04-30",
        amountCents: 2000,
        rows: 2,
        refunds: { rows: 1, cents: 3000 },
      },
    ]);
    expect(result.rowsCounted).toBe(3);
    expect(result.skipped).toEqual([]);
  });

  it("lets a month go below zero when its refunds outweigh its sales", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-05-04", "Invoice 3", "", "20.00"],
      ["2026-05-18", "Refund", "75.50", ""],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months).toEqual([
      {
        periodStart: "2026-05-01",
        periodEnd: "2026-05-31",
        amountCents: -5550,
        rows: 2,
        refunds: { rows: 1, cents: 7550 },
      },
    ]);
  });

  it("adds several refunds in a month and says how many there were", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-06-01", "Invoice", "", "500.00"],
      ["2026-06-10", "Refund", "40.00", ""],
      ["2026-06-11", "Refund", "10.25", ""],
    ];
    const june = monthlyTotals(rows, CHOICE, TODAY).months[0];
    expect(june.amountCents).toBe(44975);
    expect(june.refunds).toEqual({ rows: 2, cents: 5025 });
  });

  it("reads a refund written -40.00 or (40.00) as 40.00 paid back, never as a sale", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-06-01", "Invoice", "", "500.00"],
      ["2026-06-10", "Refund", "-40.00", ""],
      ["2026-06-11", "Refund", "(10.00)", ""],
      ["2026-06-12", "Refund", -5, ""], // a number cell from Excel
    ];
    const june = monthlyTotals(rows, CHOICE, TODAY).months[0];
    expect(june.amountCents).toBe(44500);
    expect(june.refunds).toEqual({ rows: 3, cents: 5500 });
  });

  it("ignores 0.00 in the unused one of the two columns, and nets a row with both", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", "0.00", "300.00"], // a sale, with 0.00 written in Debit
      ["2026-07-09", "Refund", "25.00", "0.00"], // a refund, with 0.00 written in Credit
      ["2026-07-16", "Sale less a refund", "5.00", "100.00"], // both on one row: 95.00
    ];
    const july = monthlyTotals(rows, CHOICE, TODAY).months[0];
    expect(july.amountCents).toBe(30000 - 2500 + 9500);
    expect(july.rows).toBe(3);
    // The 0.00 in Debit on the first row is not a refund; the other two are.
    expect(july.refunds).toEqual({ rows: 2, cents: 3000 });
  });

  it("lists a row with only 0.00 in the refunds column as no amount, and an unreadable refund as such", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", "", "300.00"],
      ["2026-07-09", "Nothing moved", "0.00", ""],
      ["2026-07-10", "Refund", "forty", ""],
      ["2026-07-11", "Sale", "forty", "10.00"], // the sale is readable but the refund isn't
      ["2026-07-12", "Neither", "", ""],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months[0].amountCents).toBe(30000);
    expect(result.months[0].refunds).toBeUndefined();
    expect(result.skipped).toEqual([
      { row: 3, reason: "no-amount" },
      { row: 4, reason: "bad-amount" },
      { row: 5, reason: "bad-amount" },
      { row: 6, reason: "no-amount" },
    ]);
  });

  it("leaves out a refund in a month that isn't over, and a refund the Status column marks void", () => {
    const rows: Cell[][] = [
      ["Date", "Status", "Debit", "Credit"],
      ["2026-09-03", "Paid", "", "200.00"],
      ["2026-09-10", "Void", "50.00", ""], // a voided refund never left the account
      ["2026-10-02", "Paid", "20.00", ""], // October isn't over on TODAY
    ];
    const result = monthlyTotals(rows, { ...CHOICE, statusColumn: 1 }, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 20000, rows: 1 },
    ]);
    expect(result.skipped).toEqual([
      { row: 3, reason: "void-or-draft" },
      { row: 4, reason: "not-over" },
    ]);
  });

  it("without a refunds column, nothing is taken off and a refund-only row has no amount, as before", () => {
    for (const refundColumn of [null, undefined]) {
      const result = monthlyTotals(MARCH_SALE_APRIL_REFUND, { ...CHOICE, refundColumn }, TODAY);
      expect(result.months).toEqual([
        { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 10000, rows: 1 },
        { periodStart: "2026-04-01", periodEnd: "2026-04-30", amountCents: 5000, rows: 1 },
      ]);
      expect(result.months.some((m) => "refunds" in m)).toBe(false);
      expect(result.skipped).toEqual([{ row: 3, reason: "no-amount" }]);
    }
  });

  it("a negative amount in the amount column still counts as written (a credit note), refunds column or not", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-08-01", "Invoice", "", "200.00"],
      ["2026-08-15", "Credit note", "", "-50.00"],
    ];
    for (const refundColumn of [2, null]) {
      const august = monthlyTotals(rows, { ...CHOICE, refundColumn }, TODAY).months[0];
      expect(august.amountCents).toBe(15000);
      expect(august.refunds).toBeUndefined();
    }
  });

  it("lists a formula saved with no value, in either column, as one and guesses nothing for it", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-08-01", "Invoice", "", "200.00"],
      ["2026-08-10", "Refund, formula", null, ""], // the refunds cell is a formula with no value
      ["2026-08-12", "Sale, formula", "", null], // the amount cell is a formula with no value
      ["2026-08-20", "Refund", "40.00", ""],
    ];
    const unsaved = [
      { row: 2, column: 2 },
      { row: 3, column: 3 },
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY, unsaved);
    // Positive first: the readable sale and refund are counted.
    expect(result.months).toEqual([
      {
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
        amountCents: 16000,
        rows: 2,
        refunds: { rows: 1, cents: 4000 },
      },
    ]);
    expect(result.skipped).toEqual([
      { row: 3, reason: "unsaved-formula" },
      { row: 4, reason: "unsaved-formula" },
    ]);
  });
});

describe("the preview with a refunds column", () => {
  const PICKS: Picks = {
    headerRow: 0,
    dateColumn: 0,
    amountColumn: 3,
    typeColumn: null,
    statusColumn: null,
    refundColumn: 2,
  };

  it("shows the refund taken off, and waits when the refunds column is the date or amount column", () => {
    const ready = previewSheet(MARCH_SALE_APRIL_REFUND, PICKS, {}, TODAY);
    expect(ready.state).toBe("ready");
    expect(ready.result!.months[1].refunds).toEqual({ rows: 1, cents: 3000 });

    for (const refundColumn of [0, 3]) {
      const waiting = previewSheet(MARCH_SALE_APRIL_REFUND, { ...PICKS, refundColumn }, {}, TODAY);
      expect(waiting.state).toBe("waiting");
      expect(waiting.waitingFor).toBe("different-columns");
      expect(waiting.message).toBe("The refunds column can't be the date or the amount column.");
      expect(waiting.result).toBeNull();
    }
  });

  it("never pre-fills the refunds column, even for a column headed Refunds or Debit", async () => {
    const bytes = utf8(
      [
        "Date,Sales,Refunds,Debit",
        "2026-07-02,100.00,10.00,10.00",
        "2026-07-09,50.00,,",
      ].join("\n") + "\n",
    );
    const run = await previewFile("own-sheet.csv", bytes, TODAY);
    // Positive first: the sheet was read and July totalled from the Sales column alone.
    expect(run.state).toBe("ready");
    expect(run.picks.amountColumn).toBe(1);
    expect(run.result!.months[0].amountCents).toBe(15000);
    expect(run.picks.refundColumn ?? null).toBeNull();
    expect(guessPicks(run.rows).picks.refundColumn ?? null).toBeNull();
    expect(guessPicks(run.rows, 0).picks.refundColumn ?? null).toBeNull();

    // Picking it takes the refund off.
    const picked = await previewFile("own-sheet.csv", bytes, TODAY, { refundColumn: 2 });
    expect(picked.result!.months[0].amountCents).toBe(14000);
    // And clearing it (the select's None) takes nothing off.
    const cleared = await previewFile("own-sheet.csv", bytes, TODAY, { refundColumn: null });
    expect(cleared.result!.months[0].amountCents).toBe(15000);
  });

  it("reads how amounts are written from the refunds column too", () => {
    // Whole numbers in the amount column read either way; only the refund shows the comma decimal.
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", "", "500"],
      ["2026-07-09", "Invoice", "", "250"],
      ["2026-07-10", "Refund", "40,50", ""],
      ["2026-07-11", "Refund", "9,50", ""],
      ["2026-07-12", "Refund", "1,25", ""],
    ];
    const without = previewSheet(rows, { ...PICKS, refundColumn: null }, {}, TODAY);
    expect(without.detectedStyle).toBe("point");
    const withRefunds = previewSheet(rows, PICKS, {}, TODAY);
    expect(withRefunds.detectedStyle).toBe("comma");
    expect(withRefunds.result!.months[0].amountCents).toBe(75000 - 5125);
  });
});
