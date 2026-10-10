import { describe, expect, it } from "vitest";
import { previewFile, previewSheet } from "@/lib/figures/file/preview";
import { guessColumns } from "@/lib/figures/file/table";
import { isPaymentType, monthlyTotals } from "@/lib/figures/file/totals";
import type { Cell, ColumnChoice } from "@/lib/figures/file/types";
import { utf8 } from "./helpers/encode";

// [8c-3] The optional "Type column": a QuickBooks transaction list holds a sale AND the payment
// received for it, so adding every row counts the sale twice. With a type column set, rows typed
// Payment or Deposit are left out and listed. All figures are invented.

const TODAY = "2026-10-06";

/** Columns: A Date, B Transaction Type, C Amount. */
const HEADER: Cell[] = ["Date", "Transaction Type", "Amount"];
const CHOICE: ColumnChoice = {
  headerRow: 0,
  dateColumn: 0,
  amountColumn: 2,
  typeColumn: 1,
  dateOrder: null,
  decimalStyle: "point",
};

/** July: an invoice, the payment received for it, and a sales receipt. */
const JULY: Cell[][] = [
  HEADER,
  ["2026-07-14", "Invoice", 500],
  ["2026-07-20", "Payment", 500],
  ["2026-07-28", "Sales Receipt", 200],
];

describe("isPaymentType", () => {
  it("matches Payment and Deposit on the whole cell, ignoring case and spaces around it", () => {
    for (const cell of ["Payment", "payment", "PAYMENT", "  Payment ", "Deposit", " Deposit "]) {
      expect(isPaymentType(cell), cell).toBe(true);
    }
  });

  it("matches the assumed French words too (no French export has been seen)", () => {
    expect(isPaymentType("Paiement")).toBe(true);
    expect(isPaymentType("Dépôt")).toBe(true);
  });

  it("does not match a sale, a refund, a longer phrase, or anything that isn't text", () => {
    for (const cell of [
      "Invoice",
      "Sales Receipt",
      "Credit Memo",
      "Refund Receipt",
      "Payment received",
      "Prepayment",
      "Deposit slip",
      "Bill Payment (Cheque)",
      "",
      "  ",
      null,
      undefined,
      0,
      true,
    ]) {
      expect(isPaymentType(cell as Cell | undefined), String(cell)).toBe(false);
    }
  });
});

describe("monthlyTotals with a type column", () => {
  it("leaves the Payment row out, so July is the sales and not the sales plus the money arriving", () => {
    const result = monthlyTotals(JULY, CHOICE, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 70000, rows: 2 },
    ]);
    expect(result.rowsCounted).toBe(2);
    expect(result.skipped).toEqual([{ row: 3, reason: "payment" }]);
  });

  it("leaves a Deposit row out the same way, and counts every other type as today", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", 1000],
      ["2026-07-03", "Sales Receipt", 250],
      ["2026-07-04", "Deposit", 1250],
      ["2026-07-05", "Estimate", 40],
      ["2026-07-06", "Something Else", 10],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    // 1000.00 + 250.00 + 40.00 + 10.00; the 1250.00 deposit is not added.
    expect(result.months[0].amountCents).toBe(130000);
    expect(result.skipped).toEqual([{ row: 4, reason: "payment" }]);
    expect(result.rowsCounted).toBe(4);
  });

  it("still counts a Credit Memo, which is negative, against the month", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", 100],
      ["2026-07-09", "Payment", 100],
      ["2026-07-15", "Credit Memo", -30],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months[0].amountCents).toBe(7000);
    expect(result.months[0].rows).toBe(2);
  });

  it("counts every row when no type column is set (the person cleared the select)", () => {
    for (const typeColumn of [null, undefined]) {
      const result = monthlyTotals(JULY, { ...CHOICE, typeColumn }, TODAY);
      expect(result.months[0].amountCents).toBe(120000);
      expect(result.months[0].rows).toBe(3);
      expect(result.skipped).toEqual([]);
    }
  });

  it("says Payment for a payment row even when its date or amount is unreadable or its month is not over", () => {
    const rows: Cell[][] = [
      HEADER,
      ["not a date", "Payment", 10],
      ["2026-07-02", "Payment", null],
      ["2026-07-03", "Payment", "abc"],
      ["2026-10-20", "Payment", 10],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months).toEqual([]);
    expect(result.skipped).toEqual([
      { row: 2, reason: "payment" },
      { row: 3, reason: "payment" },
      { row: 4, reason: "payment" },
      { row: 5, reason: "payment" },
    ]);
  });

  it("accounts for every row: counted plus left out is everything below the column names", () => {
    const result = monthlyTotals(JULY, CHOICE, TODAY);
    expect(result.rowsCounted + result.skipped.length).toBe(JULY.length - 1);
  });

  it("does nothing when the type column holds other words (a non-QuickBooks file)", () => {
    const rows: Cell[][] = [
      ["Date", "Type", "Amount"],
      ["2026-07-02", "Retail", 100],
      ["2026-07-09", "Wholesale", 250],
      ["2026-07-15", "", 5],
    ];
    const withType = monthlyTotals(rows, CHOICE, TODAY);
    const without = monthlyTotals(rows, { ...CHOICE, typeColumn: null }, TODAY);
    expect(withType).toEqual(without);
    expect(withType.months[0].amountCents).toBe(35500);
  });
});

describe("guessColumns pre-fills the type column only from an exact header", () => {
  /** A small table with the given header in column B, under the usual date and amount. */
  function guessWith(header: string, extra?: string): number | null {
    const head: Cell[] = ["Date", header, "Amount", ...(extra ? [extra] : [])];
    const rows: Cell[][] = [
      head,
      ["2026-07-02", "Invoice", 100, ...(extra ? ["x"] : [])],
      ["2026-07-09", "Payment", 100, ...(extra ? ["y"] : [])],
    ];
    return guessColumns(rows)?.typeColumn ?? null;
  }

  it("reads Transaction Type in any case and spacing", () => {
    for (const header of [
      "Transaction Type",
      "transaction type",
      "TRANSACTION TYPE",
      " Transaction  Type ",
      "TransactionType",
    ]) {
      expect(guessWith(header), header).toBe(1);
    }
  });

  it("leaves other headers for the person to pick, a bare Type included", () => {
    for (const header of [
      "Type",
      "type",
      "  TYPE ",
      "Account Type",
      "Type of work",
      "Types",
      "Kind",
      "Transaction",
      "Category",
      "Doc Type",
      "",
    ]) {
      expect(guessWith(header), header).toBeNull();
    }
  });

  it("never guesses from the cells: a column full of Payment under another name stays empty", () => {
    expect(guessWith("Kind")).toBeNull();
    expect(guessWith("Memo")).toBeNull();
  });

  it("pre-fills nothing when two columns have a type header", () => {
    expect(guessWith("Transaction Type", "TransactionType")).toBeNull();
  });
});

describe("the preview with a type column", () => {
  const csv = (lines: string[]) => utf8(lines.join("\n") + "\n");
  const QUICKBOOKS_SHAPED = csv([
    "Date,Transaction Type,Num,Amount",
    "2026-07-14,Invoice,1,500.00",
    "2026-07-20,Payment,2,500.00",
    "2026-07-28,Sales Receipt,3,200.00",
  ]);

  it("pre-fills the Transaction Type column and totals July as $700.00, listing the payment", async () => {
    const run = await previewFile("Transaction List.csv", QUICKBOOKS_SHAPED, TODAY);
    expect(run.picks).toEqual({
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 3,
      typeColumn: 1,
      statusColumn: null,
    });
    expect(run.state).toBe("ready");
    expect(run.result!.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 70000, rows: 2 },
    ]);
    expect(run.result!.skipped).toEqual([{ row: 3, reason: "payment" }]);
  });

  it("totals July as $1,200.00 once the person clears the Type column", async () => {
    const run = await previewFile("Transaction List.csv", QUICKBOOKS_SHAPED, TODAY, {
      typeColumn: null,
    });
    expect(run.picks.typeColumn).toBeNull();
    expect(run.result!.months[0].amountCents).toBe(120000);
    expect(run.result!.skipped).toEqual([]);
  });

  it("follows the person's own choice of a type column the guess did not fill", async () => {
    const bytes = csv([
      "Date,Kind,Amount",
      "2026-07-14,Invoice,500.00",
      "2026-07-20,Payment,500.00",
    ]);
    const guessed = await previewFile("list.csv", bytes, TODAY);
    expect(guessed.picks.typeColumn).toBeNull();
    expect(guessed.result!.months[0].amountCents).toBe(100000);

    const picked = await previewFile("list.csv", bytes, TODAY, { typeColumn: 1 });
    expect(picked.result!.months[0].amountCents).toBe(50000);
  });

  it("a Type header over other words changes nothing, pre-filled or picked", async () => {
    const bytes = csv([
      "Date,Type,Amount",
      "2026-07-14,Retail,100.00",
      "2026-07-20,Wholesale,250.00",
    ]);
    const run = await previewFile("sales.csv", bytes, TODAY);
    expect(run.picks.typeColumn).toBeNull();
    expect(run.result!.months[0].amountCents).toBe(35000);
    const picked = await previewFile("sales.csv", bytes, TODAY, { typeColumn: 1 });
    expect(picked.result!.months[0].amountCents).toBe(35000);
    expect(picked.result!.skipped).toEqual([]);
  });

  it("a bare Type header on a person's own sheet is not pre-filled, so sales they typed Payment still count", async () => {
    const bytes = csv([
      "Date,Type,Client,Amount",
      "2026-07-03,Payment,Invented Client A,1500.00",
      "2026-07-10,Payment,Invented Client B,800.00",
      "2026-07-18,Cash sale,Invented Client C,120.00",
    ]);
    const run = await previewFile("my-income.csv", bytes, TODAY);
    expect(run.picks.typeColumn).toBeNull();
    expect(run.result!.months[0].amountCents).toBe(242000);
    expect(run.result!.skipped).toEqual([]);
    // Picked by hand, the rule applies like on a QuickBooks file, and the left-out list shows it.
    const picked = await previewFile("my-income.csv", bytes, TODAY, { typeColumn: 1 });
    expect(picked.result!.months[0].amountCents).toBe(12000);
    expect(picked.result!.skipped.map((r) => r.reason)).toEqual(["payment", "payment"]);
  });

  // The limit below is known and told to the person (the hint under the select and the left-out line
  // say so); it is pinned here so changing it is a decision, not a drift.

  it("limit: a Deposit made straight to an income account is left out like any other Deposit", () => {
    const rows: Cell[][] = [
      HEADER,
      ["2026-07-02", "Invoice", 500],
      ["2026-07-05", "Deposit", 2000],
      ["2026-07-20", "Payment", 500],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months[0].amountCents).toBe(50000);
    expect(result.skipped).toEqual([
      { row: 3, reason: "payment" },
      { row: 4, reason: "payment" },
    ]);
  });

  it("works from previewSheet directly, the way the screen calls it", () => {
    const picks = { headerRow: 0, dateColumn: 0, amountColumn: 2, typeColumn: 1, statusColumn: null };
    expect(previewSheet(JULY, picks, {}, TODAY).result!.months[0].amountCents).toBe(70000);
    expect(
      previewSheet(JULY, { ...picks, typeColumn: null }, {}, TODAY).result!.months[0].amountCents,
    ).toBe(120000);
  });
});
