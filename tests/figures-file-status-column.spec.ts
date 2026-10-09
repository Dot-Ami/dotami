import { describe, expect, it } from "vitest";
import { guessPicks, previewFile, previewSheet } from "@/lib/figures/file/preview";
import { guessColumns } from "@/lib/figures/file/table";
import { isLeftOutStatus, monthlyTotals } from "@/lib/figures/file/totals";
import type { Cell, ColumnChoice } from "@/lib/figures/file/types";
import { utf8 } from "./helpers/encode";

// [8c-3] The optional "Status column": invoice lists (FreshBooks, Sage Accounting, Xero's Receivable
// Invoice Detail) can hold void, deleted and draft invoices, which were never sales. With a status
// column set, rows marked that way are left out and listed. And a FreshBooks file with a summary
// block above the table opens on its real column-names row. All figures are invented.

const TODAY = "2026-10-06";

/** Columns: A Date, B Status, C Amount. */
const HEADER: Cell[] = ["Date", "Status", "Amount"];
const CHOICE: ColumnChoice = {
  headerRow: 0,
  dateColumn: 0,
  amountColumn: 2,
  statusColumn: 1,
  dateOrder: null,
  decimalStyle: "point",
};

/** July: a paid invoice, a voided one, a draft, and an unpaid one. */
const JULY: Cell[][] = [
  HEADER,
  ["2026-07-03", "Paid", 600],
  ["2026-07-08", "Void", 200],
  ["2026-07-15", "Draft", 250],
  ["2026-07-28", "Unpaid", 150],
];

describe("isLeftOutStatus", () => {
  it("matches void, voided, deleted and draft on the whole cell, ignoring case and spaces around it", () => {
    for (const cell of [
      "Void",
      "void",
      "VOID",
      " Voided ",
      "Deleted",
      "deleted",
      "Draft",
      "  DRAFT",
    ]) {
      expect(isLeftOutStatus(cell), cell).toBe(true);
    }
  });

  it("matches the assumed French words, with or without accents (no French export has been seen)", () => {
    for (const cell of [
      "Annulé",
      "Annulée",
      "annule",
      "Supprimé",
      "Supprimée",
      "supprime",
      "Brouillon",
      "BROUILLON",
    ]) {
      expect(isLeftOutStatus(cell), cell).toBe(true);
    }
  });

  it("does not match a live invoice, a longer phrase, or anything that isn't text", () => {
    for (const cell of [
      "Paid",
      "Unpaid",
      "Sent",
      "Disputed",
      "Awaiting Payment",
      "Overdue",
      "Partially paid",
      "Payée",
      "Draft sent to client",
      "Void cheque reissued",
      "Not void",
      "Undeleted",
      "Drafted",
      "",
      "  ",
      null,
      undefined,
      0,
      true,
    ]) {
      expect(isLeftOutStatus(cell as Cell | undefined), String(cell)).toBe(false);
    }
  });
});

describe("monthlyTotals with a status column", () => {
  it("leaves the void and the draft out, so July is the invoices that were issued", () => {
    const result = monthlyTotals(JULY, CHOICE, TODAY);
    expect(result.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 75000, rows: 2 },
    ]);
    expect(result.rowsCounted).toBe(2);
    expect(result.skipped).toEqual([
      { row: 3, reason: "void-or-draft" },
      { row: 4, reason: "void-or-draft" },
    ]);
  });

  it("counts every row when no status column is set (the person cleared the select)", () => {
    for (const statusColumn of [null, undefined]) {
      const result = monthlyTotals(JULY, { ...CHOICE, statusColumn }, TODAY);
      expect(result.months[0].amountCents).toBe(120000);
      expect(result.months[0].rows).toBe(4);
      expect(result.skipped).toEqual([]);
    }
  });

  it("reads only the chosen column: 'Draft' in a memo column never hides a sale", () => {
    const rows: Cell[][] = [
      ["Date", "Status", "Memo", "Amount"],
      ["2026-07-02", "Paid", "Draft", 100],
      ["2026-07-09", "Paid", "Void", 50],
    ];
    const result = monthlyTotals(rows, { ...CHOICE, amountColumn: 3 }, TODAY);
    expect(result.months[0].amountCents).toBe(15000);
    expect(result.skipped).toEqual([]);
  });

  it("says void or draft for such a row even when its date or amount is unreadable or its month is not over", () => {
    const rows: Cell[][] = [
      HEADER,
      ["not a date", "Void", 10],
      ["2026-07-02", "Draft", null],
      ["2026-07-03", "Deleted", "abc"],
      ["2026-10-20", "Draft", 10],
      ["Total", "Void", 10],
    ];
    const result = monthlyTotals(rows, CHOICE, TODAY);
    expect(result.months).toEqual([]);
    expect(result.skipped.map((s) => s.reason)).toEqual([
      "void-or-draft",
      "void-or-draft",
      "void-or-draft",
      "void-or-draft",
      "void-or-draft",
    ]);
  });

  it("works beside a type column: each rule leaves out its own rows, and both are listed", () => {
    const rows: Cell[][] = [
      ["Date", "Transaction Type", "Status", "Amount"],
      ["2026-07-02", "Invoice", "Paid", 500],
      ["2026-07-05", "Payment", "Paid", 500],
      ["2026-07-09", "Invoice", "Voided", 300],
      ["2026-07-20", "Invoice", "Open", 40],
    ];
    const result = monthlyTotals(
      rows,
      { ...CHOICE, typeColumn: 1, statusColumn: 2, amountColumn: 3 },
      TODAY,
    );
    expect(result.months[0].amountCents).toBe(54000);
    expect(result.skipped).toEqual([
      { row: 3, reason: "payment" },
      { row: 4, reason: "void-or-draft" },
    ]);
  });

  it("accounts for every row: counted plus left out is everything below the column names", () => {
    const result = monthlyTotals(JULY, CHOICE, TODAY);
    expect(result.rowsCounted + result.skipped.length).toBe(JULY.length - 1);
  });
});

describe("guessColumns pre-fills the status column only from an exact header", () => {
  /** A small table with the given header in column B, under the usual date and amount. */
  function guessWith(header: string, extra?: string): number | null {
    const head: Cell[] = ["Date", header, "Amount", ...(extra ? [extra] : [])];
    const rows: Cell[][] = [
      head,
      ["2026-07-02", "Paid", 100, ...(extra ? ["x"] : [])],
      ["2026-07-09", "Void", 100, ...(extra ? ["y"] : [])],
    ];
    return guessColumns(rows)?.statusColumn ?? null;
  }

  it("reads Status and Statut in any case and spacing", () => {
    for (const header of ["Status", "status", "STATUS", "  Status ", "Statut", "statut"]) {
      expect(guessWith(header), header).toBe(1);
    }
  });

  it("leaves other headers for the person to pick", () => {
    for (const header of [
      "Invoice Status",
      "Payment Status",
      "Status Date",
      "State",
      "Statuses",
      "Memo",
      "",
    ]) {
      expect(guessWith(header), header).toBeNull();
    }
  });

  it("pre-fills nothing when two columns have a status header", () => {
    expect(guessWith("Status", "Statut")).toBeNull();
  });
});

describe("guessColumns finds the column names under a summary block", () => {
  /** FreshBooks-shaped: a title, a short summary (two titles over two figures), then the table. */
  const SUMMARY_ON_TOP: Cell[][] = [
    ["Invoice Details"],
    ["Total Invoiced", "Total Paid"],
    ["1234.50", "800.00"],
    [],
    ["Client", "Invoice Number", "Issue Date", "Status", "Subtotal", "Tax"],
    ["Invented Client A", "0000001", "2026-07-06", "Paid", "400.00", "20.00"],
    ["Invented Client B", "0000002", "2026-07-21", "Draft", "100.00", "5.00"],
  ];

  it("takes the wider row of column names, not the summary's two titles above it", () => {
    const guess = guessColumns(SUMMARY_ON_TOP);
    expect(guess).not.toBeNull();
    expect(guess!.headerRow).toBe(4);
    expect(guess!.dateColumn).toBe(2);
    expect(guess!.amountColumn).toBe(4);
    expect(guess!.statusColumn).toBe(3);
  });

  it("keeps the first row of column names when a narrower row follows it", () => {
    const rows: Cell[][] = [
      ["Date", "Client", "Note", "Amount"],
      ["Opening", "balance"],
      ["2026-07-02", "Invented Client A", "", "100.00"],
    ];
    expect(guessColumns(rows)?.headerRow).toBe(0);
  });

  it("stops looking once the dates have started: a wider text row further down is just a row", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["2026-07-02", "100.00"],
      ["Note", "about", "the", "next", "rows"],
      ["2026-07-09", "50.00"],
    ];
    expect(guessColumns(rows)?.headerRow).toBe(0);
  });

  it("takes the wider row only when dates sit under it", () => {
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["Notes", "for", "the", "file"],
    ];
    // No date under either row: no column names are found at all, as before.
    expect(guessColumns(rows)).toBeNull();
    const withDates: Cell[][] = [
      ["Summary", "Figures"],
      ["Date", "Client", "Status", "Amount"],
      ["2026-07-02", "Invented Client A", "Paid", "100.00"],
    ];
    expect(guessColumns(withDates)?.headerRow).toBe(1);
  });

  it("keeps a row that already names the date column: a wider note under it is not the table's header", () => {
    // A simple two-column sheet with a note row under its column names. The first row says "Date",
    // so it is the table's own; the note is wider only because it is a sentence split into cells.
    const rows: Cell[][] = [
      ["Date", "Amount"],
      ["Opening note", "carried", "from", "last", "year"],
      ["2026-07-02", "100.00"],
      ["2026-07-09", "50.00"],
    ];
    const guess = guessColumns(rows);
    expect(guess?.headerRow).toBe(0);
    expect(guess?.dateColumn).toBe(0);
    expect(guess?.amountColumn).toBe(1);
    // And the screen opens ready, with July's two sales counted.
    const { picks } = guessPicks(rows);
    const months = previewSheet(rows, picks, {}, TODAY).result!.months;
    expect(months.map((m) => [m.periodStart, m.amountCents])).toEqual([["2026-07-01", 15000]]);
  });
});

describe("a column-names row the person picks is never moved", () => {
  // Row 0 names no date column and row 1 is wider and does, so the automatic guess moves to row 1.
  // When the person says row 0 holds the column names, their row is kept and pre-filled from it.
  const TWO_HEADER_ROWS: Cell[][] = [
    ["When", "Amount"],
    ["Invoice Date", "Amount", "Client", "Status"],
    ["2026-07-02", "100.00", "Invented Client A", "Paid"],
    ["2026-07-09", "50.00", "Invented Client B", "Paid"],
  ];

  it("the automatic guess takes the wider row that names the date", () => {
    expect(guessPicks(TWO_HEADER_ROWS).picks.headerRow).toBe(1);
  });

  it("the person's own row is pre-filled from that row, not dropped", () => {
    const { picks, guessed } = guessPicks(TWO_HEADER_ROWS, 0);
    expect(guessed).toBe(true);
    expect(picks).toEqual({
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 1,
      typeColumn: null,
      statusColumn: null,
    });
  });

  it("a picked row with a wider row of names under it keeps its own columns", () => {
    const rows: Cell[][] = [
      ["Date", "Client", "Status", "Amount"],
      ["Invoice date", "Client name", "Status of invoice", "Amount in CAD", "Memo"],
      ["2026-07-02", "Invented Client A", "Paid", "100.00", ""],
      ["2026-07-09", "Invented Client B", "Void", "50.00", ""],
    ];
    const { picks } = guessPicks(rows, 0);
    expect(picks).toEqual({
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 3,
      typeColumn: null,
      statusColumn: 2,
    });
  });
});

describe("the preview with a status column", () => {
  const csv = (lines: string[]) => utf8(lines.join("\n") + "\n");
  const INVOICE_LIST = csv([
    "Date,Customer,Status,Amount",
    "2026-07-03,Invented Client A,Paid,600.00",
    "2026-07-08,Invented Client B,Void,200.00",
    "2026-07-15,Invented Client C,Draft,250.00",
  ]);

  it("pre-fills the Status column and totals July as $600.00, listing the void and the draft", async () => {
    const run = await previewFile("Sales.csv", INVOICE_LIST, TODAY);
    expect(run.picks).toEqual({
      headerRow: 0,
      dateColumn: 0,
      amountColumn: 3,
      typeColumn: null,
      statusColumn: 2,
    });
    expect(run.state).toBe("ready");
    expect(run.result!.months).toEqual([
      { periodStart: "2026-07-01", periodEnd: "2026-07-31", amountCents: 60000, rows: 1 },
    ]);
    expect(run.result!.skipped).toEqual([
      { row: 3, reason: "void-or-draft" },
      { row: 4, reason: "void-or-draft" },
    ]);
  });

  it("totals July as $1,050.00 once the person clears the Status column", async () => {
    const run = await previewFile("Sales.csv", INVOICE_LIST, TODAY, { statusColumn: null });
    expect(run.picks.statusColumn).toBeNull();
    expect(run.result!.months[0].amountCents).toBe(105000);
    expect(run.result!.skipped).toEqual([]);
  });

  it("follows the person's own choice of a status column the guess did not fill", async () => {
    const bytes = csv([
      "Date,State,Amount",
      "2026-07-14,Sent,500.00",
      "2026-07-20,Draft,300.00",
    ]);
    const guessed = await previewFile("list.csv", bytes, TODAY);
    expect(guessed.picks.statusColumn).toBeNull();
    expect(guessed.result!.months[0].amountCents).toBe(80000);

    const picked = await previewFile("list.csv", bytes, TODAY, { statusColumn: 1 });
    expect(picked.result!.months[0].amountCents).toBe(50000);
  });

  it("works from previewSheet directly, the way the screen calls it", () => {
    const picks = { headerRow: 0, dateColumn: 0, amountColumn: 2, typeColumn: null, statusColumn: 1 };
    expect(previewSheet(JULY, picks, {}, TODAY).result!.months[0].amountCents).toBe(75000);
    expect(
      previewSheet(JULY, { ...picks, statusColumn: null }, {}, TODAY).result!.months[0].amountCents,
    ).toBe(120000);
  });
});
