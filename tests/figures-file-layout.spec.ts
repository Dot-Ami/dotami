import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_LAYOUT_COLUMNS,
  MAX_LAYOUT_NAME_CHARS,
  REMEMBER_SEARCH_ROWS,
  findRememberedLayout,
  layoutFromChoice,
  normalizeHeaderRow,
  rememberableHeaderNames,
} from "@/lib/figures/file/layout";
import { readSpreadsheet } from "@/lib/figures/file/read-file";
import { columnsOf, guessColumns, looksLikeHeader } from "@/lib/figures/file/table";
import type { Cell, ColumnChoice, Sheet } from "@/lib/figures/file/types";
import { makeXlsx } from "./helpers/make-xlsx";

// [8c-2] Remembering a file's columns: the window-side helpers, with nothing stored. Every sheet
// here is invented; the "secret" cells exist to prove none of them ever comes back out.

const sheet = (rows: Cell[][], name = "Sheet1"): Sheet => ({ name, rows });
const text = (s: string) => new TextEncoder().encode(s);
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** A layout as a caller would hold it: the names plus the person's picks and an id of its own. */
const SALES = {
  id: "layout-1",
  headerNames: ["Invoice date", "Client", "Amount"],
  dateColumn: 0,
  amountColumn: 2,
};

/** What the screen would pass for "the person settled on row `headerRow`, dates in 0, amounts in 2". */
const choice = (headerRow: number, extra: Partial<ColumnChoice> = {}): ColumnChoice => ({
  headerRow,
  dateColumn: 0,
  amountColumn: 2,
  dateOrder: null,
  decimalStyle: "point",
  ...extra,
});

/** Read a real file through the app's own reader and hand back its sheets. */
async function readSheets(name: string, bytes: Uint8Array): Promise<Sheet[]> {
  const result = await readSpreadsheet(name, bytes);
  if (!result.ok) throw new Error(`test file would not read: ${result.error}`);
  return result.sheets;
}

describe("looksLikeHeader (exported from table.ts)", () => {
  it("accepts two or more text cells that are not dates or amounts", () => {
    expect(looksLikeHeader(["Invoice date", "Client", "Amount"])).toBe(true);
    expect(looksLikeHeader(["Date", "", "Montant"])).toBe(true);
  });

  it("refuses a lone label, a date, an amount, and an empty row", () => {
    expect(looksLikeHeader(["Sales report"])).toBe(false);
    expect(looksLikeHeader(["Date", "2026-03-01"])).toBe(false);
    expect(looksLikeHeader(["Client", "1 234,56"])).toBe(false);
    expect(looksLikeHeader(["", null])).toBe(false);
  });
});

describe("normalizeHeaderRow", () => {
  it("trims, collapses every run of whitespace to one space, and keeps the capital letters", () => {
    expect(
      normalizeHeaderRow(["  Invoice   date ", "Net  amount", "Amount\n(CAD)", "\tClient"]),
    ).toEqual(["Invoice date", "Net amount", "Amount (CAD)", "Client"]);
    // A different capital letter is a different layout: a wrong match is worse than a missed one.
    expect(normalizeHeaderRow(["Date"])).not.toEqual(normalizeHeaderRow(["date"]));
  });

  it("writes accented letters one way, whichever way the file wrote them", () => {
    expect(normalizeHeaderRow(["Reçu"])).toEqual(normalizeHeaderRow(["Reçu"]));
  });

  it("drops a byte-order mark stuck to the first name", () => {
    expect(normalizeHeaderRow(["﻿Date", "Amount"])).toEqual(["Date", "Amount"]);
  });

  it("drops trailing empty cells but keeps empty ones before a name, so positions never move", () => {
    expect(normalizeHeaderRow(["", "Date", "", "Amount", "", null, "   "])).toEqual([
      "",
      "Date",
      "",
      "Amount",
    ]);
    expect(normalizeHeaderRow(["", null, "  "])).toEqual([]);
    expect(normalizeHeaderRow([])).toEqual([]);
  });

  it("reads numbers and dates as the label the screen shows, and a boolean or a bad number as empty", () => {
    expect(
      normalizeHeaderRow([2026, day(2026, 3, 5), true, Number.NaN, new Date(Number.NaN), "x"]),
    ).toEqual(["2026", "2026-03-05", "", "", "", "x"]);
  });

  it("gives the same name as the column label the screen shows for plain headers", () => {
    // Guards drift between this and table.ts's own header text.
    const row: Cell[] = ["Invoice date", "Client", "Amount"];
    expect(normalizeHeaderRow(row)).toEqual(columnsOf([row], 0).map((c) => c.label));
  });

  it("does not change the row it is given", () => {
    const row: Cell[] = [" a ", "b", ""];
    normalizeHeaderRow(row);
    expect(row).toEqual([" a ", "b", ""]);
  });

  it("gives the same names for a CSV and an .xlsx holding the same column names", async () => {
    // The CSV reader hands back every cell as written, padding and a trailing comma included; the
    // .xlsx reader cuts empty cells off the end. Both go through the real readers here.
    const csv = await readSheets(
      "sales.csv",
      text(
        [
          "Acme Books,,,,",
          "Sales report,,,,",
          ",,,,",
          "Invoice date , Client,  Amount ,,",
          "2026-03-01,Alpha Ltd,100.00,,",
        ].join("\n"),
      ),
    );
    const xlsx = await readSheets(
      "sales.xlsx",
      makeXlsx([
        {
          name: "Sales",
          rows: [
            ["Acme Books"],
            ["Sales report"],
            [],
            ["Invoice date", "Client", "Amount"],
            [{ date: "2026-03-01" }, "Alpha Ltd", 100],
          ],
        },
      ]),
    );

    const fromCsv = normalizeHeaderRow(csv[0].rows[3]);
    const fromXlsx = normalizeHeaderRow(xlsx[0].rows[3]);
    expect(fromCsv).toEqual(["Invoice date", "Client", "Amount"]);
    expect(fromXlsx).toEqual(fromCsv);
  });
});

describe("rememberableHeaderNames", () => {
  it("returns the names of a real column-names row", () => {
    expect(rememberableHeaderNames([" Invoice date", "Client", "Amount ", ""])).toEqual([
      "Invoice date",
      "Client",
      "Amount",
    ]);
  });

  it("gives nothing for a data row written as text (CSV)", () => {
    expect(rememberableHeaderNames(["2026-03-01", "Alpha Ltd", "100.00"])).toBeNull();
    expect(rememberableHeaderNames(["Invoice date", "Alpha Ltd", "1 234,56"])).toBeNull();
    expect(rememberableHeaderNames(["Invoice date", "Alpha Ltd", "2026-03-01"])).toBeNull();
  });

  it("gives nothing for a data row whose date and amount are real Date and number cells (.xlsx)", () => {
    // looksLikeHeader skips number and Date cells instead of refusing them, so on its own it would
    // let this row through and the amount would be kept as a "column name".
    const dataRow: Cell[] = [day(2026, 3, 1), "Alpha Ltd", "Consulting", 1234.5];
    expect(looksLikeHeader(dataRow)).toBe(true);
    expect(rememberableHeaderNames(dataRow)).toBeNull();
    expect(rememberableHeaderNames(["Client", "Project", true])).toBeNull();
  });

  it("gives nothing for a lone label, a blank row, or a title with one text cell", () => {
    expect(rememberableHeaderNames(["Sales report", "", ""])).toBeNull();
    expect(rememberableHeaderNames(["", null])).toBeNull();
    expect(rememberableHeaderNames([])).toBeNull();
  });

  it("gives nothing for a row too wide or with a name too long to be column names", () => {
    const labels = (n: number) => Array.from({ length: n }, (_, i) => `Column name ${i}`);
    expect(rememberableHeaderNames(labels(MAX_LAYOUT_COLUMNS))).toHaveLength(MAX_LAYOUT_COLUMNS);
    expect(rememberableHeaderNames(labels(MAX_LAYOUT_COLUMNS + 1))).toBeNull();
    // Trailing empty cells are not columns.
    expect(
      rememberableHeaderNames([...labels(MAX_LAYOUT_COLUMNS), ...Array(100).fill("")]),
    ).toHaveLength(MAX_LAYOUT_COLUMNS);

    const longName = "n".repeat(MAX_LAYOUT_NAME_CHARS);
    expect(rememberableHeaderNames([longName, "Amount"])).toEqual([longName, "Amount"]);
    expect(rememberableHeaderNames([longName + "n", "Amount"])).toBeNull();
  });
});

describe("layoutFromChoice", () => {
  const rows: Cell[][] = [
    ["Acme Books"],
    ["Invoice date", "Client", "Amount"],
    ["2026-03-01", "Secret Client Ltd", "9876.54"],
  ];

  it("remembers the names and the picks, and nothing from the rows below", () => {
    const memory = layoutFromChoice(rows, choice(1, { dateOrder: "dmy", decimalStyle: "comma" }));
    expect(memory).toEqual({
      headerNames: ["Invoice date", "Client", "Amount"],
      dateColumn: 0,
      amountColumn: 2,
      dateOrder: "dmy",
      decimalStyle: "comma",
    });
    const kept = JSON.stringify(memory);
    expect(kept).not.toContain("Secret Client Ltd");
    expect(kept).not.toContain("9876.54");
    expect(kept).not.toContain("Acme Books");
  });

  it("keeps a date order of null as null (the file's own dates settled it)", () => {
    expect(layoutFromChoice(rows, choice(1))?.dateOrder).toBeNull();
  });

  it("gives nothing when the person picked a data row as the column names", () => {
    expect(layoutFromChoice(rows, choice(2))).toBeNull();
    expect(layoutFromChoice(rows, choice(0))).toBeNull(); // the title line has one text cell
  });

  it("gives nothing for a data row picked in a real .xlsx, where the amount is a number", async () => {
    const sheets = await readSheets(
      "sales.xlsx",
      makeXlsx([
        {
          name: "Sales",
          rows: [
            ["Invoice date", "Client", "Amount"],
            [{ date: "2026-03-01" }, "Secret Client Ltd", "Consulting", 9876.54],
          ],
        },
      ]),
    );
    expect(layoutFromChoice(sheets[0].rows, choice(0))).not.toBeNull();
    expect(layoutFromChoice(sheets[0].rows, choice(1))).toBeNull();
  });

  it("gives nothing for a row that doesn't exist or one below where a later file would be searched", () => {
    expect(layoutFromChoice(rows, choice(3))).toBeNull();
    expect(layoutFromChoice(rows, choice(-1))).toBeNull();

    const filler: Cell[][] = Array.from({ length: REMEMBER_SEARCH_ROWS }, () => ["Note"]);
    const deep = [...filler, ["Invoice date", "Client", "Amount"]];
    expect(layoutFromChoice(deep, choice(REMEMBER_SEARCH_ROWS))).toBeNull();
    expect(layoutFromChoice(deep, choice(REMEMBER_SEARCH_ROWS - 1))).toBeNull(); // a note row
    const justInside = [...filler.slice(1), ["Invoice date", "Client", "Amount"]];
    expect(layoutFromChoice(justInside, choice(REMEMBER_SEARCH_ROWS - 1))).not.toBeNull();
  });

  it("gives nothing unless the date and the amount are two different, sensible columns", () => {
    expect(layoutFromChoice(rows, choice(1, { dateColumn: 2, amountColumn: 2 }))).toBeNull();
    expect(layoutFromChoice(rows, choice(1, { dateColumn: -1 }))).toBeNull();
    expect(layoutFromChoice(rows, choice(1, { amountColumn: 1.5 }))).toBeNull();
    expect(layoutFromChoice(rows, choice(1, { amountColumn: MAX_LAYOUT_COLUMNS }))).toBeNull();
    expect(layoutFromChoice(rows, choice(1, { dateColumn: Number.NaN }))).toBeNull();
  });

  it("stores the position picked when two columns share a name", () => {
    const twin: Cell[][] = [["Invoice date", "Client", "Amount", "Amount"]];
    expect(layoutFromChoice(twin, choice(0, { amountColumn: 3 }))?.amountColumn).toBe(3);
  });
});

describe("findRememberedLayout", () => {
  const header: Cell[] = ["Invoice date", "Client", "Amount"];

  it("finds the column names under a title block, and says which sheet and row", () => {
    const rows: Cell[][] = [
      ["Acme Books"],
      ["Sales report, March"],
      [],
      header,
      ["2026-03-01", "x", "1"],
    ];
    expect(findRememberedLayout([sheet(rows)], [SALES])).toEqual({
      sheetIndex: 0,
      headerRow: 3,
      layout: SALES,
    });
  });

  it("hands back the caller's own layout record, not a copy", () => {
    const hit = findRememberedLayout([sheet([header])], [SALES]);
    expect(hit?.layout).toBe(SALES);
    expect(hit?.layout.dateColumn).toBe(0);
  });

  it("is not thrown by a different title block, or by padding and trailing empties on the names", () => {
    const first = findRememberedLayout([sheet([["Acme", "Jan"], header])], [SALES]);
    const second = findRememberedLayout(
      [sheet([["Other Co"], ["Q2 export"], [" Invoice  date ", "Client ", "Amount", "", null]])],
      [SALES],
    );
    expect(first?.headerRow).toBe(1);
    expect(second?.headerRow).toBe(2);
  });

  it("matches a layout that was kept with stale spacing in its names", () => {
    const stale = { ...SALES, headerNames: ["Invoice  date ", "Client", "Amount", ""] };
    expect(findRememberedLayout([sheet([header])], [stale])?.layout).toBe(stale);
  });

  it("looks through rows 1 to 30 only, the same window the column guess uses", () => {
    const filler = (n: number): Cell[][] => Array.from({ length: n }, () => ["Note"]);
    const data: Cell[][] = [
      ["2026-03-01", "x", "1"],
      ["2026-03-02", "y", "2"],
    ];

    const onRow30 = [...filler(29), header, ...data];
    const onRow31 = [...filler(30), header, ...data];
    expect(findRememberedLayout([sheet(onRow30)], [SALES])?.headerRow).toBe(29);
    expect(findRememberedLayout([sheet(onRow31)], [SALES])).toBeNull();
    // Tied to guessColumns, so the two windows can't drift apart.
    expect(guessColumns(onRow30)?.headerRow).toBe(29);
    expect(guessColumns(onRow31)).toBeNull();
  });

  it("takes the first sheet, in order, that matches", () => {
    const other = [["Invoice date", "Client", "Amount"]];
    const hit = findRememberedLayout(
      [
        sheet([["nothing here"]], "Notes"),
        sheet([], "Empty"),
        sheet(other, "Q1"),
        sheet(other, "Q2"),
      ],
      [SALES],
    );
    expect(hit?.sheetIndex).toBe(2);
  });

  it("finds a remembered layout among several", () => {
    const wide = {
      id: "layout-2",
      headerNames: ["Date", "Description", "Debit", "Credit"],
      dateColumn: 0,
      amountColumn: 3,
    };
    const hit = findRememberedLayout(
      [sheet([["Date", "Description", "Debit", "Credit"]])],
      [SALES, wide],
    );
    expect(hit?.layout).toBe(wide);
  });

  it("finds nothing when the names changed: a column moved, added, removed or renamed", () => {
    const layouts = [SALES];
    for (const changed of [
      ["Client", "Invoice date", "Amount"],
      ["Invoice date", "Client", "Amount", "Tax"],
      ["Invoice date", "Amount"],
      ["Invoice date", "Customer", "Amount"],
      ["invoice date", "Client", "Amount"],
      ["", "Invoice date", "Client", "Amount"],
    ]) {
      expect(findRememberedLayout([sheet([changed])], layouts)).toBeNull();
    }
  });

  it("finds nothing with no layouts, no sheets, or empty sheets", () => {
    expect(findRememberedLayout([sheet([header])], [])).toBeNull();
    expect(findRememberedLayout([], [SALES])).toBeNull();
    expect(findRememberedLayout([sheet([])], [SALES])).toBeNull();
  });

  it("never matches a data row, even when a remembered layout is made of the same text", () => {
    // A layout that holds a data row (it should never be stored, but suppose it were) can't match,
    // because the file's row has to pass the same guard.
    const bad = { headerNames: ["2026-03-01", "Alpha Ltd", "100.00"] };
    expect(
      findRememberedLayout([sheet([["2026-03-01", "Alpha Ltd", "100.00"]])], [bad]),
    ).toBeNull();

    const badMixed = { headerNames: ["2026-03-01", "Alpha Ltd", "Consulting", "1234.5"] };
    expect(
      findRememberedLayout(
        [sheet([[day(2026, 3, 1), "Alpha Ltd", "Consulting", 1234.5]])],
        [badMixed],
      ),
    ).toBeNull();
  });

  it("remembers from one real file and recognises another with the same columns under a new title", async () => {
    // File A is a CSV the person picked columns for; file B is an .xlsx export of the same report
    // with different title lines and different rows — the story this slice exists for.
    const fileA = await readSheets(
      "march.csv",
      text(
        [
          "Acme Books,,",
          "Sales report,,",
          "Invoice date,Client,Amount",
          "2026-03-01,Secret Client Ltd,9876.54",
        ].join("\n"),
      ),
    );
    const memory = layoutFromChoice(fileA[0].rows, choice(2));
    expect(memory).not.toBeNull();
    const layout = { id: "remembered", ...memory! };

    const fileB = await readSheets(
      "april.xlsx",
      makeXlsx([
        {
          name: "Notes",
          rows: [["Read me"]],
        },
        {
          name: "Sales",
          rows: [
            ["Other Co"],
            ["Sales report"],
            ["April 2026"],
            [],
            ["Invoice date", "Client", "Amount"],
            [{ date: "2026-04-02" }, "Another Client", 55.5],
          ],
        },
      ]),
    );
    const hit = findRememberedLayout(fileB, [layout]);
    expect(hit).toEqual({ sheetIndex: 1, headerRow: 4, layout });
    expect(JSON.stringify(layout)).not.toContain("Secret Client Ltd");
  });
});

describe("the layout helpers' source", () => {
  it("never logs, in line with the figures privacy review", () => {
    // A source scan: a console call on a path no test happens to take would slip past the others.
    const source = readFileSync(
      path.join(process.cwd(), "lib", "figures", "file", "layout.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/console\./);
  });
});
