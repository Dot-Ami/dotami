import { describe, expect, it } from "vitest";
import {
  acrossTotals,
  guessMonthsRow,
  readMonthHeader,
  readMonthsRow,
  type AcrossChoice,
} from "@/lib/figures/file/across";
import {
  exportInsteadSentence,
  guessLayout,
  monthsReadSentence,
  NO_DATES_SENTENCE,
  previewAcross,
  previewFile,
  WAVE_INCOME_BY_CUSTOMER_SENTENCE,
} from "@/lib/figures/file/preview";
import type { Cell } from "@/lib/figures/file/types";
import { utf8 } from "./helpers/encode";

// [8c-3] Reports with the months across the top (FreshBooks' Revenue by Client): the month is in
// the column's name, not on each row. A name is read as a month only when it says the month and
// the year with certainty; one that only looks like a month stops the table, never guessed (a
// builder default: the maintainer's decision, 2026-10-07, is only that these tables are read). All
// figures are invented.

const TODAY = "2026-10-06";

/** Client in A, July to September in B to D, a Total column in E, the report's own Total row last. */
const REVENUE: Cell[][] = [
  ["Revenue by Client"],
  [],
  ["Client", "Jul 2026", "Aug 2026", "Sep 2026", "Total"],
  ["Client A", "400.00", "0.00", "300.00", "700.00"],
  ["Client B", "100.00", "", "0.00", "100.00"],
  ["Client C", "0.00", "476.19", "0.00", "476.19"],
  ["Total", "500.00", "476.19", "300.00", "1276.19"],
];
const REVENUE_MONTHS = [
  { column: 1, month: "2026-07" },
  { column: 2, month: "2026-08" },
  { column: 3, month: "2026-09" },
];
const EVERY_ROW: AcrossChoice = {
  monthsRow: 2,
  monthColumns: REVENUE_MONTHS,
  totalRow: null,
  decimalStyle: "point",
};

/** Month and amount, without the row count. */
const amounts = (months: { periodStart: string; amountCents: number }[]) =>
  months.map((m) => [m.periodStart, m.amountCents]);

describe("readMonthHeader", () => {
  it("reads a month and a four-digit year in English and French, by name or by number", () => {
    const july: Cell[] = [
      "Jul 2026",
      "July 2026",
      "JULY 2026",
      "  Jul   2026 ",
      "Jul-2026",
      "Jul. 2026",
      "juillet 2026",
      "Juil. 2026",
      "2026 Jul",
      "2026-07",
      "2026/7",
      "2026.07",
      "07/2026",
      "7-2026",
      new Date(Date.UTC(2026, 6, 1)),
    ];
    for (const cell of july) {
      expect(readMonthHeader(cell), String(cell)).toEqual({ kind: "month", month: "2026-07" });
    }
    expect(readMonthHeader("janv. 2026")).toEqual({ kind: "month", month: "2026-01" });
    expect(readMonthHeader("févr. 2026")).toEqual({ kind: "month", month: "2026-02" });
    expect(readMonthHeader("Août 2026")).toEqual({ kind: "month", month: "2026-08" });
    expect(readMonthHeader("Sept 2026")).toEqual({ kind: "month", month: "2026-09" });
    expect(readMonthHeader("déc. 2025")).toEqual({ kind: "month", month: "2025-12" });
  });

  it("calls a name unclear when it looks like a month but doesn't name exactly one", () => {
    const unclear: Cell[] = [
      "Jul", // no year
      "July",
      "Jul 26", // a two-digit year: never guessed
      "Jul-26",
      "07/26",
      "2026-07-15", // a whole day, not a month
      "15/07/2026",
      "Jul 2026 to Sep 2026",
      "13/2026", // no month 13
      "Jul 1850", // a year outside 1900 to 2099
      new Date(Date.UTC(2026, 6, 15)), // an Excel date on the 15th is a day
    ];
    for (const cell of unclear) {
      expect(readMonthHeader(cell), String(cell)).toEqual({ kind: "unclear" });
    }
  });

  it("leaves everything else alone: labels, totals, numbers, blanks", () => {
    const others: Cell[] = [
      "Client",
      "Total",
      "Customers",
      "All income",
      "Amount",
      "Marketing", // "mar" inside a word is not a month
      "Notes",
      "2026", // a year alone
      2026,
      46204,
      true,
      "",
      "   ",
      null,
    ];
    for (const cell of others) {
      expect(readMonthHeader(cell), String(cell)).toEqual({ kind: "not-a-month" });
    }
    expect(readMonthHeader(undefined)).toEqual({ kind: "not-a-month" });
  });
});

describe("readMonthsRow", () => {
  it("lists the month columns left to right, and nothing unclear or repeated", () => {
    expect(readMonthsRow(REVENUE, 2)).toEqual({ months: REVENUE_MONTHS, unclear: [], repeated: null });
  });

  it("names the columns whose names are unclear, and a month named twice", () => {
    const rows: Cell[][] = [["Client", "Jul 2026", "Aug 26", "Jul 2026", "Sep"]];
    const reading = readMonthsRow(rows, 0);
    expect(reading.unclear).toEqual([2, 4]);
    expect(reading.repeated).toEqual({ month: "2026-07", columns: [1, 3] });
  });
});

describe("guessMonthsRow", () => {
  it("finds the row of month names above the amounts", () => {
    expect(guessMonthsRow(REVENUE)).toBe(2);
  });

  it("skips a title naming a month with no amounts under it, and a row with an unclear name", () => {
    const rows: Cell[][] = [
      ["Jul 2026"], // a title: nothing under its column reads as an amount
      ["Client", "Jul 2026", "Aug 26"], // one name unclear: not offered
      ["Client", "Jul 2026", "Aug 2026"],
      ["Client A", "Notes", "100.00"],
    ];
    expect(guessMonthsRow(rows)).toBe(2);
  });

  it("finds nothing in a file with no month names", () => {
    expect(guessMonthsRow([["Date", "Amount"], ["2026-07-14", "100.00"]])).toBeNull();
    expect(guessMonthsRow([])).toBeNull();
  });
});

describe("acrossTotals", () => {
  it("adds each month's column down every row, leaving out the report's own Total row", () => {
    const result = acrossTotals(REVENUE, EVERY_ROW, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 50000, rows: 3 },
      // Client B's August cell is empty: listed, not counted as zero.
      { periodStart: "2026-08-01", periodEnd: "2026-08-31", amountCents: 47619, rows: 2 },
      { periodStart: "2026-09-01", periodEnd: "2026-09-30", amountCents: 30000, rows: 3 },
    ]);
    expect(result.rowsCounted).toBe(3);
    expect(result.skippedRows).toEqual([{ row: 7, reason: "total" }]);
    expect(result.skippedCells).toEqual([{ row: 5, column: 2, reason: "empty" }]);
    expect(result.notOver).toEqual([]);
    expect(result.monthsRead).toEqual({ first: "2026-07", last: "2026-09" });
  });

  it("counts a client whose name starts with Total, but still leaves out the file's own sum rows", () => {
    const months = [
      { column: 1, month: "2026-01" },
      { column: 2, month: "2026-02" },
    ];
    const rows: Cell[][] = [
      ["Client", "Jan 2026", "Feb 2026", "Total"],
      ["Total Wine & More", "1000.00", "2000.00", "3000.00"], // a client, not a sum: nothing above it
      ["Acme", "100.00", "200.00", "300.00"],
      // Starts with Total and holds exactly the rows above: the file's own sum, left out.
      ["Total for all clients", "1100.00", "2200.00", "3300.00"],
      ["TOTAL Fitness", "50.00", "", "50.00"], // starts with Total but is not the sum above: a client
      ["Total:", "1.00", "2.00", "3.00"], // the word alone is always the file's own sum
    ];
    const result = acrossTotals(rows, { monthsRow: 0, monthColumns: months, totalRow: null, decimalStyle: "point" }, TODAY);
    expect(amounts(result.months)).toEqual([
      ["2026-01-01", 115000],
      ["2026-02-01", 220000],
    ]);
    expect(result.rowsCounted).toBe(3);
    expect(result.skippedRows).toEqual([
      { row: 4, reason: "total" },
      { row: 6, reason: "total" },
    ]);
    expect(result.skippedCells).toEqual([{ row: 5, column: 2, reason: "empty" }]);
  });

  it("takes one chosen row as it is, even the Total row", () => {
    const result = acrossTotals(REVENUE, { ...EVERY_ROW, totalRow: 6 }, TODAY);
    expect(amounts(result.months)).toEqual([
      ["2026-07-01", 50000],
      ["2026-08-01", 47619],
      ["2026-09-01", 30000],
    ]);
    expect(result.months.every((m) => m.rows === 1)).toBe(true);
    expect(result.skippedRows).toEqual([]);
    // A single client's row works the same way.
    const clientA = acrossTotals(REVENUE, { ...EVERY_ROW, totalRow: 3 }, TODAY);
    expect(amounts(clientA.months)).toEqual([
      ["2026-07-01", 40000],
      ["2026-08-01", 0],
      ["2026-09-01", 30000],
    ]);
  });

  it("lists blank rows, rows with nothing under any month, and amounts it can't read", () => {
    const rows: Cell[][] = [
      ["Client", "Jul 2026", "Aug 2026"],
      ["Client A", "100.00", "12.345"], // three decimals: not read with certainty
      [],
      ["Group: retail"], // a heading with nothing under the months
      ["Client B", "(25.00)", "€5"], // a refund lowers July; a euro sign is never converted
    ];
    const result = acrossTotals(
      rows,
      {
        monthsRow: 0,
        monthColumns: [
          { column: 1, month: "2026-07" },
          { column: 2, month: "2026-08" },
        ],
        totalRow: null,
        decimalStyle: "point",
      },
      TODAY,
    );
    expect(amounts(result.months)).toEqual([["2026-07-01", 7500]]);
    expect(result.skippedRows).toEqual([
      { row: 3, reason: "blank" },
      { row: 4, reason: "no-amount" },
    ]);
    expect(result.skippedCells).toEqual([
      { row: 2, column: 2, reason: "bad-amount" },
      { row: 5, column: 2, reason: "bad-amount" },
    ]);
    // Every row under the month names is read or listed.
    expect(result.rowsCounted + result.skippedRows.length).toBe(4);
  });

  it("leaves a month that isn't over out whole, but still shows it among the months read", () => {
    const rows: Cell[][] = [
      ["Client", "Sep 2026", "Oct 2026"],
      ["Client A", "100.00", "999.00"],
    ];
    const result = acrossTotals(
      rows,
      {
        monthsRow: 0,
        monthColumns: [
          { column: 1, month: "2026-09" },
          { column: 2, month: "2026-10" },
        ],
        totalRow: null,
        decimalStyle: "point",
      },
      TODAY,
    );
    expect(amounts(result.months)).toEqual([["2026-09-01", 10000]]);
    expect(result.notOver).toEqual([{ column: 2, month: "2026-10" }]);
    expect(result.skippedCells).toEqual([]);
    expect(result.monthsRead).toEqual({ first: "2026-09", last: "2026-10" });
  });

  it("puts the months in calendar order whatever order the columns are in, and reads comma amounts", () => {
    const rows: Cell[][] = [
      ["Client", "sept. 2026", "juil. 2026"],
      ["Client A", "1 234,56", "0,50"],
    ];
    const result = acrossTotals(
      rows,
      {
        monthsRow: 0,
        monthColumns: [
          { column: 1, month: "2026-09" },
          { column: 2, month: "2026-07" },
        ],
        totalRow: null,
        decimalStyle: "comma",
      },
      TODAY,
    );
    expect(amounts(result.months)).toEqual([
      ["2026-07-01", 50],
      ["2026-09-01", 123456],
    ]);
  });

  it("refuses a month too large to hold exactly, with a sentence that carries no amount", () => {
    const rows: Cell[][] = [
      ["Client", "Jul 2026"],
      ["A", 80_000_000_000_000],
      ["B", 80_000_000_000_000],
    ];
    expect(() =>
      acrossTotals(
        rows,
        {
          monthsRow: 0,
          monthColumns: [{ column: 1, month: "2026-07" }],
          totalRow: null,
          decimalStyle: "point",
        },
        TODAY,
      ),
    ).toThrow("A month's total is too large to hold exactly.");
  });

  // An Excel export whose sums were left for Excel to work out: the reader gives those cells as
  // empty and says where they are. They are listed as such, never as empty and never as a number.
  it("lists a cell holding a formula saved with no value apart from an empty one", () => {
    const rows: Cell[][] = [
      ["Client", "Jul 2026", "Aug 2026"], // 1
      ["Client A", "100.00", null], // 2: August is a formula with no saved value
      ["Client B", null, "50.00"], // 3: July is truly empty
      ["Total", null, null], // 4: the file's own sum, formulas too
    ];
    const choice = {
      monthsRow: 0,
      monthColumns: [
        { column: 1, month: "2026-07" },
        { column: 2, month: "2026-08" },
      ],
      totalRow: null,
      decimalStyle: "point" as const,
    };
    const unsaved = [
      { row: 1, column: 2 },
      { row: 3, column: 1 },
      { row: 3, column: 2 },
    ];
    const result = acrossTotals(rows, choice, TODAY, unsaved);
    // Positive first: the readable cells are added.
    expect(amounts(result.months)).toEqual([
      ["2026-07-01", 10000],
      ["2026-08-01", 5000],
    ]);
    expect(result.skippedCells).toEqual([
      { row: 2, column: 2, reason: "unsaved-formula" },
      { row: 3, column: 1, reason: "empty" },
    ]);
    expect(result.skippedRows).toEqual([{ row: 4, reason: "total" }]);

    // Taking only the Total row, whose cells are all unsaved formulas: each cell is listed, and the
    // row is not called one with nothing under any month.
    const totalOnly = acrossTotals(rows, { ...choice, totalRow: 3 }, TODAY, unsaved);
    expect(totalOnly.skippedCells).toEqual([
      { row: 4, column: 1, reason: "unsaved-formula" },
      { row: 4, column: 2, reason: "unsaved-formula" },
    ]);
    expect(totalOnly.skippedRows).toEqual([]);
    expect(totalOnly.months).toEqual([]);
  });

  it("keeps a row whose only formula is in a month not yet over as one row with no amount", () => {
    // October isn't over on TODAY, so the whole column is listed as not over; an unsaved formula
    // there doesn't turn the row into three "empty" cells under the months that are.
    const rows: Cell[][] = [
      ["Client", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026"], // 1
      ["Client A", "100.00", "20.00", "30.00", null], // 2
      ["Client B", null, null, null, null], // 3: October is a formula with no saved value
    ];
    const choice = {
      monthsRow: 0,
      monthColumns: [
        { column: 1, month: "2026-07" },
        { column: 2, month: "2026-08" },
        { column: 3, month: "2026-09" },
        { column: 4, month: "2026-10" },
      ],
      totalRow: null,
      decimalStyle: "point" as const,
    };
    const result = acrossTotals(rows, choice, TODAY, [{ row: 2, column: 4 }]);
    // Positive first: Client A is added.
    expect(amounts(result.months)).toEqual([
      ["2026-07-01", 10000],
      ["2026-08-01", 2000],
      ["2026-09-01", 3000],
    ]);
    expect(result.skippedRows).toEqual([{ row: 3, reason: "no-amount" }]);
    expect(result.skippedCells).toEqual([]);
  });
});

describe("previewAcross", () => {
  it("is ready with totals once a row of month names is chosen", () => {
    const preview = previewAcross(REVENUE, { monthsRow: 2, addUp: "every-row" }, {}, TODAY);
    expect(preview.state).toBe("ready");
    expect(preview.monthColumns).toEqual(REVENUE_MONTHS);
    expect(preview.detectedStyle).toBe("point");
    expect(amounts(preview.result!.months)).toEqual([
      ["2026-07-01", 50000],
      ["2026-08-01", 47619],
      ["2026-09-01", 30000],
    ]);
  });

  it("waits, saying which columns, when a month name is unclear, and adds nothing up", () => {
    const rows: Cell[][] = [
      ["Atelier Nord", "Jul 2026", "Aug 26", "Sep"],
      ["Client A", "1.00", "2.00", "3.00"],
    ];
    const preview = previewAcross(rows, { monthsRow: 0, addUp: "every-row" }, {}, TODAY);
    // Positive first: the clear month is still read, and the message names the unclear columns.
    expect(preview.monthColumns).toEqual([{ column: 1, month: "2026-07" }]);
    expect(preview.waitingFor).toBe("unclear-month");
    expect(preview.message).toBe(
      "The names of columns C and D look like months, but DotAmi can't be sure which month and year they are, so nothing is added up. It reads names like Jul 2026, juillet 2026, 2026-07 or 07/2026.",
    );
    expect(preview.result).toBeNull();
    // The sentence names columns by letter, never by what a cell says.
    expect(preview.message).not.toContain("Atelier");
    expect(preview.message).not.toContain("Aug 26");

    const one = previewAcross([["Client", "Jul 26"], ["A", "1.00"]], { monthsRow: 0, addUp: "every-row" }, {}, TODAY);
    expect(one.message).toBe(
      "The name of column B looks like a month, but DotAmi can't be sure which month and year it is, so nothing is added up. It reads names like Jul 2026, juillet 2026, 2026-07 or 07/2026.",
    );
  });

  it("waits when the chosen row names no month, or names one twice", () => {
    const none = previewAcross(REVENUE, { monthsRow: 0, addUp: "every-row" }, {}, TODAY);
    expect(none.waitingFor).toBe("no-months");
    expect(none.message).toBe(
      "No column in row 1 is named like a month and year (Jul 2026, juillet 2026, 2026-07 or 07/2026). Pick the row with the month names.",
    );
    const twice = previewAcross(
      [["Client", "Jul 2026", "2026-07"], ["A", "1.00", "2.00"]],
      { monthsRow: 0, addUp: "every-row" },
      {},
      TODAY,
    );
    expect(twice.waitingFor).toBe("repeated-month");
    expect(twice.message).toBe(
      "Columns B and C both name July 2026, so nothing is added up. Check the row of month names.",
    );
    expect(twice.result).toBeNull();
  });

  it("waits with nothing to say until a row is chosen, or when the chosen totals row isn't under the months", () => {
    const unchosen = previewAcross(REVENUE, { monthsRow: null, addUp: "every-row" }, {}, TODAY);
    expect(unchosen.waitingFor).toBe("a-row");
    expect(unchosen.message).toBeNull();
    expect(previewAcross(REVENUE, { monthsRow: 2, addUp: 1 }, {}, TODAY).waitingFor).toBe("a-row");
    expect(previewAcross(REVENUE, { monthsRow: 2, addUp: 99 }, {}, TODAY).waitingFor).toBe("a-row");
  });

  it("holds the totals back when the screen asks, and follows the person's answer on amounts", () => {
    expect(previewAcross(REVENUE, { monthsRow: 2, addUp: "every-row" }, {}, TODAY, true).waitingFor).toBe(
      "held",
    );
    const comma = previewAcross(
      REVENUE,
      { monthsRow: 2, addUp: "every-row" },
      { decimalStyle: "comma" },
      TODAY,
    );
    expect(comma.detectedStyle).toBe("point");
    expect(comma.decimalStyle).toBe("comma");
  });
});

describe("monthsReadSentence", () => {
  it("says the earliest and latest month read, in words", () => {
    expect(monthsReadSentence({ first: "2026-07", last: "2026-09" })).toBe(
      "Months read from the column names: July 2026 to September 2026. Check these against the file.",
    );
    expect(monthsReadSentence({ first: "2026-07", last: "2026-07" })).toBe(
      "Months read from the column names: July 2026, the only month. Check it against the file.",
    );
    expect(monthsReadSentence(null)).toBeNull();
  });
});

describe("guessLayout", () => {
  it("starts on months across only when no row of column names sits above a date", () => {
    expect(guessLayout(REVENUE)).toEqual({ layout: "across", monthsRow: 2 });
    // A file with a date on each row keeps its usual reading, even with a month in a title above.
    const rows: Cell[][] = [
      ["Sales for Jul 2026"],
      ["Date", "Client", "Amount"],
      ["2026-07-14", "Client A", "100.00"],
    ];
    expect(guessLayout(rows)).toEqual({ layout: "rows", monthsRow: null });
    expect(guessLayout([["Customers", "All income"], ["A", "1.00"]])).toEqual({
      layout: "rows",
      monthsRow: null,
    });
  });
});

describe("exportInsteadSentence", () => {
  const wave: Cell[][] = [
    ["Invented Shop Ltd."],
    ["Income by Customer"],
    ["Date Range: Jul 1, 2026 to Sep 30, 2026"],
    [],
    ["Customers", "All income", "Paid income"],
    ["Client A", "680.00", "680.00"],
    ["Total", "680.00", "680.00"],
  ];

  it("names Wave's Account Transactions for Wave's Income by Customer", () => {
    expect(exportInsteadSentence(wave)).toBe(WAVE_INCOME_BY_CUSTOMER_SENTENCE);
    expect(WAVE_INCOME_BY_CUSTOMER_SENTENCE).toContain("Account Transactions");
  });

  it("gives the general sentence for any other file with no date and no month", () => {
    const rows: Cell[][] = [
      ["Client", "Revenue"],
      ["Client A", "100.00"],
    ];
    expect(exportInsteadSentence(rows)).toBe(NO_DATES_SENTENCE);
    // A title naming the date range, alone on its row, doesn't change that.
    expect(
      exportInsteadSentence([["Date Range: Jul 1, 2026 to Sep 30, 2026"], ...rows]),
    ).toBe(NO_DATES_SENTENCE);
  });

  it("says nothing when a row of names holds a month, even one it can't be sure of", () => {
    // "Aug 26" stops the table when picked, but this may still be a months-across file to pick.
    expect(exportInsteadSentence([["Client", "Jul 2026", "Aug 26"], ["A", "1.00", "2.00"]])).toBeNull();
    expect(exportInsteadSentence([["Client", "Aug 26"], ["A", "1.00"]])).toBeNull();
  });

  it("says nothing when the file has dates or months somewhere, for the person to pick", () => {
    expect(exportInsteadSentence(REVENUE)).toBeNull();
    expect(exportInsteadSentence([["Client", "Amount"], ["14/07/2026", "100.00"]])).toBeNull();
    // A date anywhere at all, even with no row of column names DotAmi can find.
    expect(exportInsteadSentence([["Notes"], ["Client A", "2026-07-14", "100.00"]])).toBeNull();
    // A date inside a cell: the file was split in the wrong places, not a report without dates.
    expect(exportInsteadSentence([["Client"], ["14-07-2026;1001;Design;1 000"]])).toBeNull();
  });
});

describe("previewFile, months across", () => {
  const csv = (rows: string[][]) => utf8(rows.map((r) => r.join(",")).join("\r\n") + "\r\n");

  it("reads a CSV with the months across the top the way the screen does", async () => {
    const bytes = csv([
      ["Client", "2026-07", "2026-08", "Total"],
      ["Client A", "100.00", "200.00", "300.00"],
      ["Client B", "50.00", "", "50.00"],
    ]);
    const run = await previewFile("revenue.csv", bytes, TODAY);
    expect(run.layout).toBe("across");
    expect(run.acrossPicks).toEqual({ monthsRow: 0, addUp: "every-row" });
    expect(amounts(run.across!.result!.months)).toEqual([
      ["2026-07-01", 15000],
      ["2026-08-01", 20000],
    ]);
    expect(run.across!.result!.skippedCells).toEqual([{ row: 3, column: 2, reason: "empty" }]);
    expect(run.exportInstead).toBeNull();
  });

  it("can be switched to months across on a file that starts on rows, and back", async () => {
    const bytes = csv([
      ["Date", "Amount"],
      ["2026-07-14", "100.00"],
    ]);
    const rowsRun = await previewFile("sales.csv", bytes, TODAY);
    expect(rowsRun.layout).toBe("rows");
    expect(rowsRun.across).toBeNull();
    const acrossRun = await previewFile("sales.csv", bytes, TODAY, { layout: "across", monthsRow: 0 });
    expect(acrossRun.across!.waitingFor).toBe("no-months");
  });
});
