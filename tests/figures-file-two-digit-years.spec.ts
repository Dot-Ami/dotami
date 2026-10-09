import { describe, expect, it } from "vitest";
import {
  cellToDay,
  dayInWords,
  detectDateOrder,
  firstTwoDigitYear,
} from "@/lib/figures/file/dates";
import { datesReadSentence, previewFile, previewSheet } from "@/lib/figures/file/preview";
import type { Picks } from "@/lib/figures/file/preview";
import { monthlyTotals } from "@/lib/figures/file/totals";
import type { Cell, ColumnChoice } from "@/lib/figures/file/types";
import { utf8 } from "./helpers/encode";

// [8c-3] Two-digit years. A date like 12-03-05 doesn't say which century 05 is in, so DotAmi asks
// the person once per file ("Is 05 the year 2005?") instead of refusing the file, and never picks
// the century itself (the maintainer's decision, 2026-10-07). Every preview, for every file, then
// shows the earliest and latest date it read, in words, for the person to check.
// All rows here are invented.

const TODAY = "2026-10-06";

describe("cellToDay with the person's answer about the century", () => {
  it("still reads no two-digit year until the person has answered", () => {
    expect(cellToDay("12-03-05", "mdy", null)).toBeNull();
    expect(cellToDay("21.07.26", null)).toBeNull();
    expect(cellToDay("Nov 12, 05", null)).toBeNull();
  });

  it("reads A/B/YY in the century the person chose, in the stated order", () => {
    // Sage 50's own short example, month first.
    expect(cellToDay("12-03-05", "mdy", 2000)).toBe("2005-12-03");
    expect(cellToDay("12-03-05", "mdy", 1900)).toBe("1905-12-03");
    // FreshBooks' dd.mm.yy.
    expect(cellToDay("06.07.26", "dmy", 2000)).toBe("2026-07-06");
    expect(cellToDay("6/7/26", "mdy", 2000)).toBe("2026-06-07");
  });

  it("with no order, still reads only what a number above 12 settles", () => {
    expect(cellToDay("21.07.26", null, 2000)).toBe("2026-07-21");
    expect(cellToDay("07-14-26", null, 2000)).toBe("2026-07-14");
    expect(cellToDay("03.04.26", null, 2000)).toBeNull();
  });

  it("reads month names with a two-digit year (Sage's long date, Excel's 5-Mar-05)", () => {
    expect(cellToDay("Nov 12, 05", null, 2000)).toBe("2005-11-12");
    expect(cellToDay("5-Mar-05", null, 2000)).toBe("2005-03-05");
    expect(cellToDay("5 mars 26", null, 1900)).toBe("1926-03-05");
  });

  it("leaves four-digit years alone whatever the answer", () => {
    expect(cellToDay("03/04/2026", "mdy", 1900)).toBe("2026-03-04");
    expect(cellToDay("2026-03-05", null, 1900)).toBe("2026-03-05");
    expect(cellToDay("Mar 5, 2026", null, 1900)).toBe("2026-03-05");
  });

  it("knows 1900 was not a leap year and 2000 was", () => {
    expect(cellToDay("29.02.00", "dmy", 2000)).toBe("2000-02-29");
    expect(cellToDay("29.02.00", "dmy", 1900)).toBeNull();
  });

  it("never reads a three-digit or one-digit year", () => {
    expect(cellToDay("12-03-005", "mdy", 2000)).toBeNull();
    expect(cellToDay("12-03-5", "mdy", 2000)).toBeNull();
  });
});

describe("firstTwoDigitYear", () => {
  it("gives the first two-digit year in the column, as written", () => {
    expect(firstTwoDigitYear(["Customer A", null, "12-03-05", "01-04-06"])).toBe("05");
    expect(firstTwoDigitYear(["21.07.26"])).toBe("26");
    expect(firstTwoDigitYear(["Nov 12, 05"])).toBe("05");
    expect(firstTwoDigitYear(["2026-07-01", "07-14-26"])).toBe("26");
  });

  it("finds none in a column of four-digit years, Excel dates or text", () => {
    expect(firstTwoDigitYear(["2026-07-01", "07/14/2026", "Mar 5, 2026"])).toBeNull();
    expect(firstTwoDigitYear([new Date(Date.UTC(2026, 6, 1)), 45658, null, true])).toBeNull();
    expect(firstTwoDigitYear(["Total", "12345", ""])).toBeNull();
  });

  it("ignores something shaped like a date that can't be one in any order", () => {
    expect(firstTwoDigitYear(["99-99-26", "13-13-26"])).toBeNull();
  });
});

describe("detectDateOrder with two-digit years", () => {
  it("takes the same proof from A/B/YY as from A/B/YYYY", () => {
    expect(detectDateOrder(["06.07.26", "21.07.26"]).order).toBe("dmy");
    expect(detectDateOrder(["07-14-26", "08-02-26"]).order).toBe("mdy");
    expect(detectDateOrder(["03.04.26", "05.06.26"])).toEqual({
      order: null,
      ambiguous: true,
      conflicting: false,
    });
  });
});

describe("dayInWords", () => {
  it("writes a day the way a person says it", () => {
    expect(dayInWords("2005-12-03")).toBe("3 December 2005");
    expect(dayInWords("2006-02-28")).toBe("28 February 2006");
    expect(dayInWords("1926-07-01")).toBe("1 July 1926");
  });

  it("gives back anything that isn't a real day unchanged", () => {
    expect(dayInWords("2026-02-30")).toBe("2026-02-30");
    expect(dayInWords("soon")).toBe("soon");
  });
});

/** Columns: A Date, B Customer, C Amount. Dates written mm-dd-yy, as Sage 50's short date. */
const SAGE_SHORT: Cell[][] = [
  ["Date", "Customer", "Amount"], // 1
  ["12-03-05", "Customer A", "100.00"], // 2
  ["12-19-05", "Customer B", "50.00"], // 3
  ["Customer C", "", ""], // 4 a name row: no date
  ["01-04-06", "Customer C", "25.00"], // 5
  ["02-28-06", "Customer C", ""], // 6 a date, no amount
];
const SAGE_PICKS: Picks = {
  headerRow: 0,
  dateColumn: 0,
  amountColumn: 2,
  typeColumn: null,
  statusColumn: null,
};

describe("monthlyTotals: the dates it read", () => {
  const choice: ColumnChoice = {
    headerRow: 0,
    dateColumn: 0,
    amountColumn: 2,
    dateOrder: "mdy",
    century: 2000,
    decimalStyle: "point",
  };

  it("gives the earliest and latest day read, counted or not", () => {
    const result = monthlyTotals(SAGE_SHORT, choice, TODAY);
    expect(result.months.map((m) => [m.periodStart, m.amountCents])).toEqual([
      ["2005-12-01", 15000],
      ["2006-01-01", 2500],
    ]);
    // 28 February 2006 has no amount, so it adds nothing, but its date was read and it is shown.
    expect(result.datesRead).toEqual({ first: "2005-12-03", last: "2006-02-28" });
  });

  it("includes a day in a month that isn't over, so a year read wrong can't hide there", () => {
    // Read in the 2000s, 31.12.99 is 2099: a month far in the future, left out as "not over".
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["15.07.26", "10.00"],
      ["31.12.99", "20.00"],
    ];
    const result = monthlyTotals(
      rows,
      { ...choice, amountColumn: 1, dateOrder: "dmy", century: 2000 },
      TODAY,
    );
    expect(result.skipped).toEqual([{ row: 3, reason: "not-over" }]);
    expect(result.datesRead).toEqual({ first: "2026-07-15", last: "2099-12-31" });
  });

  it("orders by the day, not by the row", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-09-01", "1.00"],
      ["2026-07-05", "1.00"],
      ["2026-08-20", "1.00"],
    ];
    const result = monthlyTotals(rows, { ...choice, amountColumn: 1, dateOrder: null }, TODAY);
    expect(result.datesRead).toEqual({ first: "2026-07-05", last: "2026-09-01" });
  });

  it("is null when no row had a date DotAmi could read", () => {
    const result = monthlyTotals(SAGE_SHORT, { ...choice, century: null }, TODAY);
    expect(result.rowsCounted).toBe(0);
    expect(result.datesRead).toBeNull();
  });
});

describe("previewSheet: one question about the century", () => {
  it("asks, and adds nothing up until the person answers", () => {
    const preview = previewSheet(SAGE_SHORT, SAGE_PICKS, {}, TODAY);
    // Positive first: it found the two-digit year and the order the dates prove.
    expect(preview.twoDigitYear).toBe("05");
    expect(preview.detectedOrder.order).toBe("mdy");
    expect(preview.state).toBe("waiting");
    expect(preview.waitingFor).toBe("century-answer");
    expect(preview.message).toBe("Say which year 05 is to see the totals.");
    expect(preview.result).toBeNull();
  });

  it("reads the year as the person said", () => {
    const yes = previewSheet(SAGE_SHORT, SAGE_PICKS, { century: 2000 }, TODAY);
    expect(yes.state).toBe("ready");
    expect(yes.century).toBe(2000);
    expect(yes.result!.months.map((m) => m.periodStart)).toEqual(["2005-12-01", "2006-01-01"]);

    const no = previewSheet(SAGE_SHORT, SAGE_PICKS, { century: 1900 }, TODAY);
    expect(no.result!.months.map((m) => m.periodStart)).toEqual(["1905-12-01", "1906-01-01"]);
  });

  it("an empty answer is no answer", () => {
    expect(previewSheet(SAGE_SHORT, SAGE_PICKS, { century: "" }, TODAY).waitingFor).toBe(
      "century-answer",
    );
  });

  it("asks nothing when every year has four digits, and ignores a stray answer", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-07-15", "10.00"],
    ];
    const picks: Picks = {
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 1,
      typeColumn: null,
      statusColumn: null,
    };
    const preview = previewSheet(rows, picks, { century: 1900 }, TODAY);
    expect(preview.state).toBe("ready");
    expect(preview.twoDigitYear).toBeNull();
    expect(preview.century).toBeNull();
    expect(preview.result!.months[0].periodStart).toBe("2026-07-01");
  });

  it("asks how the dates are written first when the dates can't prove it", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["03.04.26", "10.00"],
      ["05.06.26", "10.00"],
    ];
    const picks: Picks = {
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 1,
      typeColumn: null,
      statusColumn: null,
    };
    expect(previewSheet(rows, picks, {}, TODAY).waitingFor).toBe("date-order-answer");
    expect(previewSheet(rows, picks, { dateOrder: "dmy" }, TODAY).waitingFor).toBe(
      "century-answer",
    );
    const both = previewSheet(rows, picks, { dateOrder: "dmy", century: 2000 }, TODAY);
    expect(both.result!.months.map((m) => m.periodStart)).toEqual(["2026-04-01", "2026-06-01"]);
  });
});

describe("previewFile: a file of two-digit years is read, not refused", () => {
  it("finds the column names above dd.mm.yy dates and pre-fills the columns", async () => {
    const text = "Invoice Date,Client,Amount\n21.07.26,Client A,100.00\n06.08.26,Client B,50.00\n";
    const asked = await previewFile("short.csv", utf8(text), TODAY);
    expect(asked.guess).toMatchObject({ headerRow: 0, dateColumn: 0, amountColumn: 2 });
    expect(asked.waitingFor).toBe("century-answer");

    const answered = await previewFile("short.csv", utf8(text), TODAY, { century: 2000 });
    expect(answered.result!.months.map((m) => [m.periodStart, m.amountCents])).toEqual([
      ["2026-07-01", 10000],
      ["2026-08-01", 5000],
    ]);
    expect(datesReadSentence(answered.result!.datesRead)).toBe(
      "Dates read: 21 July 2026 to 6 August 2026. Check these against the file's earliest and latest dates.",
    );
  });
});

describe("datesReadSentence", () => {
  it("says the earliest and latest date in words", () => {
    expect(datesReadSentence({ first: "2005-12-03", last: "2006-02-28" })).toBe(
      "Dates read: 3 December 2005 to 28 February 2006. Check these against the file's earliest and latest dates.",
    );
  });

  it("says one date once", () => {
    expect(datesReadSentence({ first: "2026-07-15", last: "2026-07-15" })).toBe(
      "Dates read: 15 July 2026, the only date. Check it against the file.",
    );
  });

  it("says nothing when no date was read", () => {
    expect(datesReadSentence(null)).toBeNull();
  });
});
