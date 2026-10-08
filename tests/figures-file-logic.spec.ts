import { describe, expect, it } from "vitest";
import { cellToCents, detectDecimalStyle } from "@/lib/figures/file/amounts";
import { cellToDay, detectDateOrder, excelSerialToDay } from "@/lib/figures/file/dates";
import { columnLetter, columnsOf, guessColumns, isBlankRow } from "@/lib/figures/file/table";
import { TOTAL_ROW_LABEL, monthlyTotals, splitAlreadyKnown } from "@/lib/figures/file/totals";
import type { Cell, ColumnChoice, MonthTotal } from "@/lib/figures/file/types";

// [8c] The pure logic behind "drop a file": dates, amounts, finding the table, monthly totals.
// All sheets here are invented; no real person's figures appear anywhere in this file.

describe("excelSerialToDay", () => {
  it("reads the known serials", () => {
    expect(excelSerialToDay(25569)).toBe("1970-01-01");
    expect(excelSerialToDay(45658)).toBe("2025-01-01");
    expect(excelSerialToDay(73050)).toBe("2099-12-31");
  });

  it("ignores the time of day", () => {
    expect(excelSerialToDay(45658.99)).toBe("2025-01-01");
  });

  it("refuses numbers outside 1970 to 2099", () => {
    expect(excelSerialToDay(25568)).toBeNull();
    expect(excelSerialToDay(73051)).toBeNull();
    expect(excelSerialToDay(2026)).toBeNull();
    expect(excelSerialToDay(Number.NaN)).toBeNull();
    expect(excelSerialToDay(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("cellToDay", () => {
  it("reads Date cells as their UTC day and refuses an invalid Date", () => {
    expect(cellToDay(new Date(Date.UTC(2026, 2, 5)), null)).toBe("2026-03-05");
    expect(cellToDay(new Date(Number.NaN), null)).toBeNull();
  });

  it("reads Excel serial numbers", () => {
    expect(cellToDay(45658, null)).toBe("2025-01-01");
    expect(cellToDay(12.5, null)).toBeNull();
  });

  it("returns null for booleans, null and empty text", () => {
    expect(cellToDay(true, null)).toBeNull();
    expect(cellToDay(null, null)).toBeNull();
    expect(cellToDay("", null)).toBeNull();
    expect(cellToDay("   ", null)).toBeNull();
  });

  it("reads year-first dates whatever the order", () => {
    for (const order of [null, "ymd", "mdy", "dmy"] as const) {
      expect(cellToDay("2026-03-05", order)).toBe("2026-03-05");
    }
    expect(cellToDay("2026/3/5", null)).toBe("2026-03-05");
    expect(cellToDay("2026.03.05", null)).toBe("2026-03-05");
  });

  it("uses the stated order for A/B/YYYY", () => {
    expect(cellToDay("03/04/2026", "mdy")).toBe("2026-03-04");
    expect(cellToDay("03/04/2026", "dmy")).toBe("2026-04-03");
    expect(cellToDay("3-4-2026", "dmy")).toBe("2026-04-03");
    expect(cellToDay("03.04.2026", "mdy")).toBe("2026-03-04");
  });

  it("with no order, reads only what a number above 12 (or two equal numbers) settles", () => {
    expect(cellToDay("25/03/2026", null)).toBe("2026-03-25"); // 25 can only be a day
    expect(cellToDay("03/25/2026", null)).toBe("2026-03-25");
    expect(cellToDay("05/05/2026", null)).toBe("2026-05-05");
    expect(cellToDay("03/04/2026", null)).toBeNull();
    expect(cellToDay("03/04/2026", "ymd")).toBeNull();
  });

  // The person's answer is the only way a two-digit year is read: tests/figures-file-two-digit-years.spec.ts.
  it("never guesses a century for a two-digit year", () => {
    expect(cellToDay("03/04/26", "mdy")).toBeNull();
    expect(cellToDay("25/03/26", null)).toBeNull();
  });

  it("drops a trailing time without shifting the written day", () => {
    expect(cellToDay("2026-03-31T23:30:00-07:00", null)).toBe("2026-03-31");
    expect(cellToDay("2026-03-31T23:30:00Z", null)).toBe("2026-03-31");
    expect(cellToDay("2026-03-31 23:30", null)).toBe("2026-03-31");
    expect(cellToDay("2026-03-31 11:30:15.250 PM", null)).toBe("2026-03-31");
    expect(cellToDay("2026-03-31T00:00:00+0100", null)).toBe("2026-03-31");
    expect(cellToDay("03/04/2026 10:30 AM", "mdy")).toBe("2026-03-04");
  });

  it("reads month names in English", () => {
    expect(cellToDay("5 Mar 2026", null)).toBe("2026-03-05");
    expect(cellToDay("5-Mar-2026", null)).toBe("2026-03-05");
    expect(cellToDay("Mar 5, 2026", null)).toBe("2026-03-05");
    expect(cellToDay("Mar 5 2026", null)).toBe("2026-03-05");
    expect(cellToDay("5 March 2026", null)).toBe("2026-03-05");
    expect(cellToDay("MARCH 5, 2026", null)).toBe("2026-03-05");
    expect(cellToDay("Sept. 9, 2026", null)).toBe("2026-09-09");
    expect(cellToDay("1 Sep 2026", null)).toBe("2026-09-01");
    expect(cellToDay("December 31, 2025", null)).toBe("2025-12-31");
  });

  it("reads month names in French, accents or not", () => {
    expect(cellToDay("5 mars 2026", null)).toBe("2026-03-05");
    expect(cellToDay("1er mars 2026", null)).toBe("2026-03-01");
    expect(cellToDay("14 février 2026", null)).toBe("2026-02-14");
    expect(cellToDay("14 fevr. 2026", null)).toBe("2026-02-14");
    expect(cellToDay("3 août 2026", null)).toBe("2026-08-03");
    expect(cellToDay("3 AOUT 2026", null)).toBe("2026-08-03");
    expect(cellToDay("20 déc. 2026", null)).toBe("2026-12-20");
    expect(cellToDay("2 juil 2026", null)).toBe("2026-07-02");
    expect(cellToDay("7 janvier 2026", null)).toBe("2026-01-07");
  });

  it("refuses days that do not exist and text that is not a date", () => {
    expect(cellToDay("2026-02-30", null)).toBeNull();
    expect(cellToDay("2026-13-01", null)).toBeNull();
    expect(cellToDay("31 Apr 2026", null)).toBeNull();
    expect(cellToDay("30/02/2026", null)).toBeNull();
    expect(cellToDay("32 Mar 2026", null)).toBeNull();
    expect(cellToDay("5 Foo 2026", null)).toBeNull();
    expect(cellToDay("Total", null)).toBeNull();
    expect(cellToDay("12345", null)).toBeNull();
  });

  it("knows leap days", () => {
    expect(cellToDay("2024-02-29", null)).toBe("2024-02-29");
    expect(cellToDay("2026-02-29", null)).toBeNull();
  });
});

describe("detectDateOrder", () => {
  it("finds day-first from a first number above 12", () => {
    expect(detectDateOrder(["03/04/2026", "25/03/2026"])).toEqual({
      order: "dmy",
      ambiguous: false,
      conflicting: false,
    });
  });

  it("finds month-first from a second number above 12", () => {
    expect(detectDateOrder(["03/04/2026", "03/25/2026"])).toEqual({
      order: "mdy",
      ambiguous: false,
      conflicting: false,
    });
  });

  it("reports a conflict when the column proves both orders", () => {
    expect(detectDateOrder(["25/03/2026", "03/25/2026"])).toEqual({
      order: null,
      ambiguous: false,
      conflicting: true,
    });
  });

  it("says to ask the person when nothing settles it", () => {
    expect(detectDateOrder(["03/04/2026", "05/06/2026"])).toEqual({
      order: null,
      ambiguous: true,
      conflicting: false,
    });
  });

  it("has nothing to ask when no cell is of that shape, or all read the same either way", () => {
    const none = { order: null, ambiguous: false, conflicting: false };
    expect(detectDateOrder(["2026-03-04", "5 Mar 2026", 45658, null, new Date()])).toEqual(none);
    expect(detectDateOrder([])).toEqual(none);
    expect(detectDateOrder(["05/05/2026", "06/06/2026"])).toEqual(none);
  });

  it("looks through a trailing time", () => {
    expect(detectDateOrder(["25/03/2026 10:30"]).order).toBe("dmy");
  });
});

describe("cellToCents", () => {
  it("reads point-style text", () => {
    expect(cellToCents("$1,234.56", "point")).toBe(123456);
    expect(cellToCents("1234.5", "point")).toBe(123450);
    expect(cellToCents("1234", "point")).toBe(123400);
    expect(cellToCents("(1,234.56)", "point")).toBe(-123456);
    expect(cellToCents("1234.5-", "point")).toBe(-123450);
    expect(cellToCents("-$5.00", "point")).toBe(-500);
    expect(cellToCents("$-5.00", "point")).toBe(-500);
    expect(cellToCents("($5.00)", "point")).toBe(-500);
    expect(cellToCents("5.00 $", "point")).toBe(500);
    expect(cellToCents("5.00$", "point")).toBe(500);
    expect(cellToCents("$ 5.00", "point")).toBe(500);
  });

  it("reads comma-style text", () => {
    expect(cellToCents("1 234,56", "comma")).toBe(123456);
    expect(cellToCents("1.234,56", "comma")).toBe(123456);
    expect(cellToCents("1 234,56 $", "comma")).toBe(123456);
    expect(cellToCents("1\u00a0234,56", "comma")).toBe(123456);
    expect(cellToCents("1\u202f234,56", "comma")).toBe(123456);
    expect(cellToCents("1 234,56", "comma")).toBe(123456);
    expect(cellToCents("99,1", "comma")).toBe(9910);
    expect(cellToCents("-5,00", "comma")).toBe(-500);
    expect(cellToCents("(5,00)", "comma")).toBe(-500);
    expect(cellToCents("5,00-", "comma")).toBe(-500);
    expect(cellToCents("$5,00", "comma")).toBe(500);
    expect(cellToCents("1234", "comma")).toBe(123400);
  });

  it("refuses other currencies instead of converting or ignoring them", () => {
    expect(cellToCents("US$5.00", "point")).toBeNull();
    expect(cellToCents("USD 5.00", "point")).toBeNull();
    expect(cellToCents("5.00 CAD", "point")).toBeNull();
    expect(cellToCents("€5,00", "comma")).toBeNull();
    expect(cellToCents("5,00 €", "comma")).toBeNull();
    expect(cellToCents("£5.00", "point")).toBeNull();
    expect(cellToCents("$5.00 USD", "point")).toBeNull();
  });

  it("refuses text it cannot read with certainty", () => {
    expect(cellToCents("1,234", "comma")).toBeNull(); // three decimals
    expect(cellToCents("1.234,567", "comma")).toBeNull();
    expect(cellToCents("1,234.56", "comma")).toBeNull(); // the wrong style for this text
    expect(cellToCents("1 234,56", "point")).toBeNull();
    expect(cellToCents("1.2.3,45", "comma")).toBeNull();
    expect(cellToCents("1 234.567,89", "comma")).toBeNull(); // mixed separators
    expect(cellToCents("$$5.00", "point")).toBeNull();
    expect(cellToCents("5$.00", "point")).toBeNull();
    expect(cellToCents("(5,00)-", "comma")).toBeNull(); // two signs
    expect(cellToCents("n/a", "point")).toBeNull();
    expect(cellToCents("", "point")).toBeNull();
    expect(cellToCents("  \u00a0 ", "comma")).toBeNull();
  });

  it("reads numbers, and refuses more than two decimals instead of rounding", () => {
    expect(cellToCents(1234.5, "point")).toBe(123450);
    expect(cellToCents(0.1 + 0.2, "point")).toBe(30);
    expect(cellToCents(-5, "comma")).toBe(-500);
    expect(cellToCents(12.345, "point")).toBeNull();
    expect(cellToCents(Number.NaN, "point")).toBeNull();
    expect(cellToCents(Number.POSITIVE_INFINITY, "point")).toBeNull();
    expect(cellToCents(1e15, "point")).toBeNull(); // too big to hold exactly
  });

  it("never returns negative zero", () => {
    expect(Object.is(cellToCents(-0, "point"), 0)).toBe(true);
    expect(Object.is(cellToCents("(0.00)", "point"), 0)).toBe(true);
    expect(Object.is(cellToCents("-0,00", "comma"), 0)).toBe(true);
  });

  it("returns null for booleans, dates and empty cells", () => {
    expect(cellToCents(true, "point")).toBeNull();
    expect(cellToCents(new Date(), "point")).toBeNull();
    expect(cellToCents(null, "point")).toBeNull();
  });

  it("refuses an amount too big to hold exactly", () => {
    expect(cellToCents("90,071,992,547,409.92", "point")).toBeNull();
    expect(cellToCents("90,071,992,547,409.91", "point")).toBe(9007199254740991);
    expect(cellToCents("90.071.992.547.409,92", "comma")).toBeNull();
  });
});

describe("detectDecimalStyle", () => {
  it("picks comma when more of the column reads that way", () => {
    expect(detectDecimalStyle(["1 234,56", "99,10", "-5,00"])).toBe("comma");
  });

  it("picks point for point-style, whole numbers and ties", () => {
    expect(detectDecimalStyle(["1,234.56", "12.00"])).toBe("point");
    expect(detectDecimalStyle(["100", "200"])).toBe("point");
    expect(detectDecimalStyle([])).toBe("point");
  });

  it("does not count number cells", () => {
    expect(detectDecimalStyle([1.5, 2.5, "3,00"])).toBe("comma");
  });
});

describe("columnLetter / isBlankRow / columnsOf", () => {
  it("names columns the way Excel does", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(columnLetter(51)).toBe("AZ");
    expect(columnLetter(701)).toBe("ZZ");
    expect(columnLetter(702)).toBe("AAA");
  });

  it("calls a row blank only when every cell is empty", () => {
    expect(isBlankRow(undefined)).toBe(true);
    expect(isBlankRow([])).toBe(true);
    expect(isBlankRow([null, "", "   "])).toBe(true);
    expect(isBlankRow([null, 0])).toBe(false);
    expect(isBlankRow(["", false])).toBe(false);
    expect(isBlankRow([null, new Date(Date.UTC(2026, 0, 1))])).toBe(false);
    expect(isBlankRow(["x"])).toBe(false);
  });

  it("lists every column of the widest row from the header down, naming empty headers", () => {
    const rows: Cell[][] = [["title"], ["Date", "Amount"], ["2026-01-01", 5, "note", null]];
    const columns = columnsOf(rows, 1);
    expect(columns.map((c) => c.label)).toEqual(["Date", "Amount", "Column C", "Column D"]);
    expect(columns.map((c) => c.letter)).toEqual(["A", "B", "C", "D"]);
    expect(columns.map((c) => c.index)).toEqual([0, 1, 2, 3]);
  });

  it("caps the width at 200 columns", () => {
    const wide: Cell[] = Array.from({ length: 500 }, (_, i) => `h${i}`);
    expect(columnsOf([wide], 0)).toHaveLength(200);
  });
});

describe("guessColumns", () => {
  const reportSheet: Cell[][] = [
    ["Sales report"],
    ["Prepared for the shop"],
    ["Date", "Description", "Amount"],
    ["2026-07-03", "Order A", "$1,000.00"],
    ["2026-07-15", "Order B", "250.50"],
    ["2026-07-20", "Refund", "-100.00"],
  ];

  it("finds the header row below the title rows and pre-fills date and amount", () => {
    const guess = guessColumns(reportSheet);
    expect(guess).not.toBeNull();
    expect(guess?.headerRow).toBe(2);
    expect(guess?.dateColumn).toBe(0);
    expect(guess?.amountColumn).toBe(2);
    expect(guess?.columns.map((c) => c.label)).toEqual(["Date", "Description", "Amount"]);
  });

  it("returns null when no header sits above a date", () => {
    expect(
      guessColumns([
        ["2026-07-03", "$5.00"],
        ["2026-07-04", "$6.00"],
      ]),
    ).toBeNull();
    expect(
      guessColumns([
        ["Name", "Notes"],
        ["Ann", "hello"],
      ]),
    ).toBeNull();
    expect(guessColumns([])).toBeNull();
  });

  it("does not take a row that reads as a date or an amount for the header", () => {
    expect(
      guessColumns([
        ["2026-07-03", "$5.00", "x"],
        ["2026-07-04", "$6.00", "y"],
      ]),
    ).toBeNull();
  });

  it("pre-fills the date column when it is the only mostly-date column, even without a date header", () => {
    const guess = guessColumns([
      ["When", "Sales"],
      ["2026-01-05", "10.00"],
      ["2026-01-06", "20.00"],
    ]);
    expect(guess?.dateColumn).toBe(0);
    expect(guess?.amountColumn).toBe(1);
  });

  it("leaves the date column empty when two columns look like dates and neither says 'date'", () => {
    const guess = guessColumns([
      ["Start", "End", "Amount"],
      ["2026-01-05", "2026-01-06", "10.00"],
      ["2026-01-07", "2026-01-08", "20.00"],
    ]);
    expect(guess?.dateColumn).toBeNull();
    expect(guess?.amountColumn).toBe(2);
  });

  it("prefers the header that says 'date' when two columns look like dates", () => {
    const guess = guessColumns([
      ["Created", "Posted date", "Amount"],
      ["2026-01-05", "2026-01-06", "10.00"],
      ["2026-01-07", "2026-01-08", "20.00"],
    ]);
    expect(guess?.dateColumn).toBe(1);
  });

  it("leaves the amount empty when no header names one", () => {
    const guess = guessColumns([
      ["Date", "Price"],
      ["2026-01-05", "10.00"],
      ["2026-01-06", "20.00"],
    ]);
    expect(guess?.dateColumn).toBe(0);
    expect(guess?.amountColumn).toBeNull();
  });

  it("never pre-fills tax, balance, quantity or id columns", () => {
    const guess = guessColumns([
      ["Date", "Sales tax", "Balance", "Total qty", "Order id", "Amount"],
      ["2026-01-05", "0.50", "10.00", "3", "7", "10.00"],
      ["2026-01-06", "1.00", "20.00", "4", "8", "20.00"],
    ]);
    expect(guess?.amountColumn).toBe(5);

    const onlyBad = guessColumns([
      ["Date", "Total GST", "Running balance"],
      ["2026-01-05", "0.50", "10.00"],
      ["2026-01-06", "1.00", "20.00"],
    ]);
    expect(onlyBad?.amountColumn).toBeNull();
  });

  it("ranks 'amount / subtotal / montant' first, broader names second, and 'Total' last", () => {
    const guess = guessColumns([
      ["Date", "Net sales", "Amount"],
      ["2026-01-05", "9.00", "10.00"],
      ["2026-01-06", "19.00", "20.00"],
    ]);
    expect(guess?.amountColumn).toBe(2);

    // "Sales" beats "Total": in many invoice exports the total includes the tax collected.
    const salesOverTotal = guessColumns([
      ["Date", "Total", "Net sales"],
      ["2026-01-05", "10.00", "9.00"],
      ["2026-01-06", "20.00", "19.00"],
    ]);
    expect(salesOverTotal?.amountColumn).toBe(2);

    // A lone "Total" column is guessed only when nothing in the file is a tax column…
    const onlyTotal = guessColumns([
      ["Date", "Customer", "Total"],
      ["2026-01-05", "A", "10.00"],
      ["2026-01-06", "B", "20.00"],
    ]);
    expect(onlyTotal?.amountColumn).toBe(2);
    // …and left for the person to pick when there is one, since that total likely includes the tax.
    const totalBesideTax = guessColumns([
      ["Date", "GST", "Total"],
      ["2026-01-05", "0.50", "10.50"],
      ["2026-01-06", "1.00", "21.00"],
    ]);
    expect(totalBesideTax?.amountColumn).toBeNull();

    const french = guessColumns([
      ["Jour", "Revenu net", "Montant"],
      ["2026-01-05", "9,00", "10,00"],
      ["2026-01-06", "19,00", "20,00"],
    ]);
    expect(french?.dateColumn).toBe(0);
    expect(french?.amountColumn).toBe(2);
  });

  it("does not pre-fill an amount column that is mostly not amounts", () => {
    const guess = guessColumns([
      ["Date", "Amount"],
      ["2026-01-05", "see invoice"],
      ["2026-01-06", "pending"],
      ["2026-01-07", "10.00"],
    ]);
    expect(guess?.amountColumn).toBeNull();
  });

  it("reads Excel-style cells (Date objects and numbers)", () => {
    const guess = guessColumns([
      ["Date", "Amount"],
      [new Date(Date.UTC(2026, 0, 15)), 1234.5],
      [46054, 99.99],
    ]);
    expect(guess?.dateColumn).toBe(0);
    expect(guess?.amountColumn).toBe(1);
  });

  describe("price-per-item columns", () => {
    const sheet = (header: string): Cell[][] => [
      ["Date", header],
      ["2026-01-05", "10.00"],
      ["2026-01-06", "20.00"],
    ];

    it("never pre-fills a price per item as the amount", () => {
      for (const header of [
        "UnitAmount",
        "Unit Amount",
        "unit_amount",
        "Unit Price",
        "UnitPrice",
        "Unit Cost",
        "Sales Price",
        "Price each",
        "Amount each",
        "Amount per item",
        "Prix unitaire",
        "Montant unitaire",
        "Rate",
        "Amount (each)",
        "Amount/unit",
        "Price (per unit)",
        "Montant (par unité)",
      ]) {
        expect(guessColumns(sheet(header))?.amountColumn, header).toBeNull();
      }
    });

    it("still pre-fills a real line amount", () => {
      for (const header of ["LineAmount", "Line Amount", "Amount", "Montant", "Net sales"]) {
        expect(guessColumns(sheet(header))?.amountColumn, header).toBe(1);
      }
    });

    it("pre-fills the line amount and not the price beside it", () => {
      const guess = guessColumns([
        ["InvoiceDate", "Quantity", "UnitAmount", "LineAmount"],
        ["2026-01-05", "3", "10.00", "30.00"],
        ["2026-01-06", "1", "20.00", "20.00"],
      ]);
      expect(guess?.amountColumn).toBe(3);
    });

    it("does not mistake a word that only contains 'unit' for a price per item", () => {
      expect(guessColumns(sheet("Community sales"))?.amountColumn).toBe(1);
    });

    it("does not treat 'price', 'unit' or 'each' on their own as a price per item", () => {
      for (const header of [
        "Business Unit Revenue",
        "Revenue by unit",
        "Amount (Unit currency)",
        "Sales each month",
        "Montant (prix total)",
      ]) {
        expect(guessColumns(sheet(header))?.amountColumn, header).toBe(1);
      }
    });

    it("pre-fills 'Total Price' on an invoice template and not the 'Unit Price' beside it", () => {
      const guess = guessColumns([
        ["Date", "Description", "Qty", "Unit Price", "Total Price"],
        ["2026-01-05", "Invented widget", "3", "10.00", "30.00"],
        ["2026-01-06", "Invented gadget", "1", "20.00", "20.00"],
      ]);
      expect(guess?.amountColumn).toBe(4);
    });
  });

  describe("date headers written without spaces", () => {
    it("reads InvoiceDate, Invoice_Date and Invoice.Date as a date header", () => {
      for (const header of ["InvoiceDate", "Invoice_Date", "Invoice.Date", "Date"]) {
        // "Start" is mostly dates too, so the "only column of dates" fallback cannot make this
        // guess: only the header can.
        const guess = guessColumns([
          [header, "Start", "Amount"],
          ["2026-01-05", "2026-01-01", "10.00"],
          ["2026-01-06", "2026-01-02", "20.00"],
          ["2026-01-07", "2026-01-03", "5.00"],
        ]);
        expect(guess?.dateColumn, header).toBe(0);
      }
    });

    it("prefers the invoice date to the due date, whichever comes first", () => {
      const dueFirst = guessColumns([
        ["DueDate", "InvoiceDate", "Amount"],
        ["2026-02-04", "2026-01-05", "10.00"],
        ["2026-02-05", "2026-01-06", "20.00"],
      ]);
      expect(dueFirst?.dateColumn).toBe(1);
      const issueDate = guessColumns([
        ["Due date", "Issue date", "Amount"],
        ["2026-02-04", "2026-01-05", "10.00"],
        ["2026-02-05", "2026-01-06", "20.00"],
      ]);
      expect(issueDate?.dateColumn).toBe(1);
      // French: "Date d'échéance" is the due date; the accented word must be seen as a word.
      for (const dueHeader of ["Date d'échéance", "Échéance", "Date échéance", "Date d'echeance"]) {
        const french = guessColumns([
          [dueHeader, "Date de facture", "Montant"],
          ["2026-02-04", "2026-01-05", "10.00"],
          ["2026-02-05", "2026-01-06", "20.00"],
        ]);
        expect(french?.dateColumn, dueHeader).toBe(1);
      }
    });

    it("still pre-fills a due date when it is the only date column", () => {
      // No other column is dates, so the "only column that is mostly dates" fallback takes it.
      const guess = guessColumns([
        ["Name", "DueDate", "Amount"],
        ["Invented A", "2026-02-04", "10.00"],
        ["Invented B", "2026-02-05", "20.00"],
      ]);
      expect(guess?.dateColumn).toBe(1);
    });

    it("leaves Date empty when a due date competes with another date column we cannot name", () => {
      // "Created" is the sale date, but its name says nothing; guessing the due date would file a
      // July sale under August, so the person picks.
      const guess = guessColumns([
        ["Created", "DueDate", "Amount"],
        ["2026-07-30", "2026-08-29", "10.00"],
        ["2026-07-31", "2026-08-30", "20.00"],
      ]);
      expect(guess?.dateColumn).toBeNull();
    });
  });

  describe("group names and total rows beside the dates", () => {
    // One line per customer: a name row and a "Total for" row around every date, as in a grouped report.
    const grouped = (): Cell[][] => [
      ["Date", "Name", "Amount"],
      ["Invented Client A"],
      [new Date(Date.UTC(2026, 6, 14)), "Invented Client A", 375],
      ["Total for Invented Client A", null, 375],
      ["Invented Client B"],
      [new Date(Date.UTC(2026, 7, 2)), "Invented Client B", 54.55],
      ["Total for Invented Client B", null, 54.55],
      ["TOTAL", null, 429.55],
      [],
      ["Accrual basis Tuesday, October 6, 2026"],
    ];

    it("pre-fills Date even though names and totals outnumber the dates", () => {
      expect(guessColumns(grouped())?.dateColumn).toBe(0);
    });

    it("still refuses a text column whose cells sit beside other cells", () => {
      const guess = guessColumns([
        ["Date", "Amount"],
        ["one", "10.00"],
        ["two", "20.00"],
        ["2026-01-05", "30.00"],
      ]);
      expect(guess?.dateColumn).toBeNull();
    });
  });
});

describe("TOTAL_ROW_LABEL", () => {
  it("matches a report's own sum rows", () => {
    for (const label of [
      "Total",
      "TOTAL",
      "  total",
      "Total for Customer A",
      "Grand total",
      "Grand-Total",
      "Sous-total",
      "Subtotal",
      "Sub total",
      "Total général",
      "Totaux",
      "Totals",
    ]) {
      expect(TOTAL_ROW_LABEL.test(label), label).toBe(true);
    }
  });

  it("does not match ordinary text that merely contains or starts like it", () => {
    for (const label of ["Totally new client", "Order total", "Notes", "", "Subtotalled"]) {
      expect(TOTAL_ROW_LABEL.test(label), label).toBe(false);
    }
  });
});

describe("monthlyTotals", () => {
  const choice: ColumnChoice = {
    headerRow: 2,
    dateColumn: 0,
    amountColumn: 2,
    dateOrder: null,
    decimalStyle: "point",
  };
  const TODAY = "2026-10-06";

  // An invented report-style export. Row numbers in the comments are what the person sees in Excel.
  const report: Cell[][] = [
    ["Sales report"], // 1
    ["Prepared for the shop"], // 2
    ["Date", "Description", "Amount"], // 3 header
    ["2026-07-03", "Order A", "$1,000.00"], // 4
    ["2026-07-15", "Order B", "250.50"], // 5
    ["2026-07-20", "Refund", "-100.00"], // 6
    ["", null, ""], // 7 blank
    ["2026-08-02", "Order C", "$500.00"], // 8
    ["", "Total for July", "$1,150.50"], // 9 the report's own sum row
    ["Note: paid late", "", ""], // 10
    ["2026-08-10", "Order D", ""], // 11 date, no amount
    ["2026-08-11", "Order E", "n/a"], // 12 date, unreadable amount
    ["2026-08-31", "Order F", "99.99"], // 13
    ["2026-09-01", "Order G", "10.00"], // 14
    ["2026-09-30", "Order H", "(40.00)"], // 15
    ["2026-10-02", "Order I", "$300.00"], // 16 this month isn't over
    [null, "", "  "], // 17 trailing blank: not reported
    [], // 18 trailing blank: not reported
  ];

  it("adds a report-style sheet up by month and accounts for every skipped row", () => {
    const result = monthlyTotals(report, choice, TODAY);

    expect(result.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 115050, rows: 3 },
      { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 59999, rows: 2 },
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: -3000, rows: 2 },
    ]);
    expect(result.rowsCounted).toBe(7);
    expect(result.skipped).toEqual([
      { row: 7, reason: "blank" },
      { row: 9, reason: "total" },
      { row: 10, reason: "no-date" },
      { row: 11, reason: "no-amount" },
      { row: 12, reason: "bad-amount" },
      { row: 16, reason: "not-over" },
    ]);
    // Every row below the header is either counted or listed: 13 rows, from row 4 to row 16.
    expect(result.rowsCounted + result.skipped.length).toBe(13);
  });

  it("counts a month only once it has ended", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-09-15", "10.00"],
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 1 };
    expect(monthlyTotals(rows, c, "2026-09-29").months).toEqual([]);
    expect(monthlyTotals(rows, c, "2026-09-29").skipped).toEqual([{ row: 2, reason: "not-over" }]);
    expect(monthlyTotals(rows, c, "2026-09-30").months).toHaveLength(1);
  });

  it("reads day-first dates when told, and files them under the right month", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["03/02/2026", "10.00"], // 3 February
      ["28/02/2026", "5.00"],
      ["01/03/2026", "7.00"],
    ];
    const c: ColumnChoice = {
      ...choice,
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 1,
      dateOrder: "dmy",
    };
    const result = monthlyTotals(rows, c, TODAY);
    expect(result.months.map((m) => [m.periodStart, m.amountCents])).toEqual([
      ["2026-02-01", 1500],
      ["2026-03-01", 700],
    ]);

    // Without the order, 03/02/2026 and 01/03/2026 are not guessed at (28/02/2026 can only be day-first).
    const unknown = monthlyTotals(rows, { ...c, dateOrder: null }, TODAY);
    expect(unknown.skipped.filter((s) => s.reason === "no-date").map((s) => s.row)).toEqual([2, 4]);
  });

  it("reads a comma-style sheet", () => {
    const rows: Cell[][] = [
      ["Date", "Montant"],
      ["2026-01-05", "1 234,56"],
      ["2026-01-20", "99,10"],
      ["2026-01-31", "-5,00"],
    ];
    const c: ColumnChoice = {
      ...choice,
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 1,
      decimalStyle: "comma",
    };
    expect(monthlyTotals(rows, c, TODAY).months).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 132866, rows: 3 },
    ]);
  });

  it("reads Excel-style cells: Date objects and numbers", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      [new Date(Date.UTC(2026, 0, 15)), 1234.5],
      [46054, 99.99], // 2026-02-01
      [46080.75, 0.1 + 0.2], // 2026-02-27, evening
      [new Date(Date.UTC(2026, 1, 28)), 12.345], // more than two decimals: refused, not rounded
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 1 };
    const result = monthlyTotals(rows, c, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 123450, rows: 1 },
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 10029, rows: 2 },
    ]);
    expect(result.skipped).toEqual([{ row: 5, reason: "bad-amount" }]);
  });

  it("ends a leap-year February on the 29th", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2024-02-10", "1.00"],
      ["2025-02-10", "2.00"],
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 1 };
    const result = monthlyTotals(rows, c, TODAY);
    expect(result.months.map((m) => m.periodEnd)).toEqual(["2024-02-29", "2025-02-28"]);
  });

  it("keeps zero and negative months as they are, oldest first whatever the row order", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-03-10", "5.00"],
      ["2026-03-11", "-5.00"],
      ["2026-01-10", "(20.00)"],
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 1 };
    const result = monthlyTotals(rows, c, TODAY);
    expect(result.months.map((m) => [m.periodStart, m.amountCents, m.rows])).toEqual([
      ["2026-01-01", -2000, 1],
      ["2026-03-01", 0, 2],
    ]);
    expect(Object.is(result.months[1].amountCents, 0)).toBe(true);
  });

  it("calls a dated row with a 'Total' in another cell a dated row, not a sum row", () => {
    // The sum-row test only applies when there is no date to read.
    const rows: Cell[][] = [
      ["Date", "Note", "Amount"],
      ["2026-03-10", "Total refund", "5.00"],
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 2 };
    expect(monthlyTotals(rows, c, TODAY).rowsCounted).toBe(1);
  });

  it("returns nothing for a sheet with no rows below the header", () => {
    expect(
      monthlyTotals([["Date", "Amount"]], { ...choice, headerRow: 0, amountColumn: 1 }, TODAY),
    ).toEqual({
      months: [],
      rowsCounted: 0,
      skipped: [],
      datesRead: null,
    });
    expect(monthlyTotals([], choice, TODAY)).toEqual({
      months: [],
      rowsCounted: 0,
      skipped: [],
      datesRead: null,
    });
  });

  it("throws, without putting an amount in the message, when a month is too big to hold exactly", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-01-01", "90,000,000,000,000.00"],
      ["2026-01-02", "90,000,000,000,000.00"],
    ];
    const c: ColumnChoice = { ...choice, headerRow: 0, dateColumn: 0, amountColumn: 1 };
    let message = "";
    try {
      monthlyTotals(rows, c, TODAY);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe("A month's total is too large to hold exactly.");
    expect(message).not.toMatch(/\d/);
  });
});

describe("splitAlreadyKnown", () => {
  const march: MonthTotal = {
    periodStart: "2026-03-01",
    periodEnd: "2026-03-31",
    amountCents: 50000,
    rows: 4,
  };
  const april: MonthTotal = {
    periodStart: "2026-04-01",
    periodEnd: "2026-04-30",
    amountCents: 70000,
    rows: 2,
  };
  const may: MonthTotal = {
    periodStart: "2026-05-01",
    periodEnd: "2026-05-31",
    amountCents: 90000,
    rows: 1,
  };

  const figure = (
    month: MonthTotal,
    overrides: Partial<{
      status: "proposed" | "confirmed" | "retracted" | "discarded";
      currency: string;
      amountCents: number;
    }> = {},
  ) => ({
    kind: "gross-revenue" as const,
    periodStart: month.periodStart,
    periodEnd: month.periodEnd,
    amountCents: overrides.amountCents ?? month.amountCents,
    currency: overrides.currency ?? "CAD",
    status: overrides.status ?? ("confirmed" as const),
  });

  it("separates months the store already holds from fresh ones, keeping order", () => {
    const { fresh, known } = splitAlreadyKnown(
      [march, april, may],
      [figure(march, { status: "confirmed" }), figure(may, { status: "proposed" })],
      "CAD",
    );
    expect(known).toEqual([march, may]);
    expect(fresh).toEqual([april]);
  });

  it("does not count discarded or retracted figures as known", () => {
    const { fresh, known } = splitAlreadyKnown(
      [march, april],
      [figure(march, { status: "discarded" }), figure(april, { status: "retracted" })],
      "CAD",
    );
    expect(known).toEqual([]);
    expect(fresh).toEqual([march, april]);
  });

  it("does not count another currency, another amount or another period as known", () => {
    const { fresh, known } = splitAlreadyKnown(
      [march, april],
      [
        figure(march, { currency: "USD" }),
        figure(april, { amountCents: 70001 }),
        { ...figure(march), periodEnd: "2026-03-30" },
      ],
      "CAD",
    );
    expect(known).toEqual([]);
    expect(fresh).toEqual([march, april]);
  });

  it("matches in the currency it is asked about", () => {
    const { known } = splitAlreadyKnown([march], [figure(march, { currency: "USD" })], "USD");
    expect(known).toEqual([march]);
  });
});
