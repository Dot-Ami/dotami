import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Cell } from "@/lib/figures/file/types";
import { splitAlreadyKnown } from "@/lib/figures/file/totals";
import {
  coverageChecker,
  coverageFromMonths,
  firstOverlap,
  monthsBetween,
  OVERLAPPING_FILES_MESSAGE,
  shiftDay,
  spanOfRows,
} from "@/lib/figures/bank/coverage";
import {
  bankRowsFromSheet,
  BANK_CSV_SKIP_TEXT,
  detectBankFormats,
  guessBankColumns,
  orderedMoneyColumns,
  type BankCsvChoice,
} from "@/lib/figures/bank/csv-columns";
import { bankMonthlyTotals, countLeftOut } from "@/lib/figures/bank/totals";
import {
  LEFT_OUT_REASONS,
  LEFT_OUT_REASON_TEXT,
  type BankRow,
  type CoverageRange,
} from "@/lib/figures/bank/types";

// [8g] The pure logic behind "add from a bank or card statement": ticked rows → complete calendar
// months, and the CSV column logic. Every statement here is invented — the payer, the account
// number and the card number are made up and appear nowhere real.

const PAYER = "Zelda Quill";
const ACCOUNT_NUMBER = "000123456789";
const TODAY = "2026-04-10";

function row(id: string, day: string, cents: number, extra: Partial<BankRow> = {}): BankRow {
  return { id, day, cents, currency: "CAD", description: "Deposit", ...extra };
}
const cover = (from: string, to: string, extra: Partial<CoverageRange> = {}): CoverageRange => ({
  from,
  to,
  ...extra,
});
const ticks = (...ids: string[]) => new Set(ids);
const CAD = { currency: "CAD" };
const idsLeftOut = (result: { leftOut: { id: string; reason: string }[] }, reason: string) =>
  result.leftOut.filter((l) => l.reason === reason).map((l) => l.id);

describe("bankMonthlyTotals — what becomes a month total", () => {
  const rows = [
    row("a", "2026-02-03", 10000),
    row("b", "2026-02-20", 5025),
    row("c", "2026-02-21", 7777),
    row("d", "2026-03-02", 20000),
    row("e", "2026-03-31", 1),
  ];
  const feb2mar = [cover("2026-02-01", "2026-03-31")];

  it("adds the ticked money in for each complete month, with how many rows made it", () => {
    const result = bankMonthlyTotals(rows, ticks("a", "b", "d", "e"), feb2mar, TODAY, CAD);
    expect(result.months).toEqual([
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 15025, rows: 2 },
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 20001, rows: 2 },
    ]);
    expect(result.rowsCounted).toBe(4);
    expect(result.currency).toBe("CAD");
    expect(result.leftOut).toEqual([{ id: "c", reason: "not-ticked" }]);
    expect(result.heldBack).toEqual([]);
  });

  it("ends February on the 29th in a leap year", () => {
    const result = bankMonthlyTotals(
      [row("x", "2028-02-10", 100)],
      ticks("x"),
      [cover("2028-02-01", "2028-02-29")],
      "2028-03-05",
      CAD,
    );
    expect(result.months.map((m) => m.periodEnd)).toEqual(["2028-02-29"]);
  });

  it("never proposes a month the download only partly covers", () => {
    // The file starts on January 15th: half of January is missing, so January has no total even
    // though the person ticked a January deposit. The rest of the file is fine.
    const jan = [row("j1", "2026-01-16", 90000), row("j2", "2026-01-30", 1000)];
    const result = bankMonthlyTotals(
      [...jan, ...rows],
      ticks("j1", "j2", "a", "b"),
      [cover("2026-01-15", "2026-03-31")],
      TODAY,
      CAD,
    );
    expect(result.months.map((m) => m.periodStart)).toEqual(["2026-02-01"]);
    expect(idsLeftOut(result, "partial-month").sort()).toEqual(["j1", "j2"]);
    expect(result.heldBack).toEqual([{ month: "2026-01", reason: "partial-month", rows: 2 }]);
  });

  it("holds back a month the download stops inside, too", () => {
    const result = bankMonthlyTotals(
      [row("m", "2026-03-03", 500), row("ap", "2026-04-02", 700)],
      ticks("m", "ap"),
      [cover("2026-03-01", "2026-04-10")],
      "2026-05-01",
      CAD,
    );
    expect(result.months.map((m) => m.periodStart)).toEqual(["2026-03-01"]);
    expect(result.heldBack).toEqual([{ month: "2026-04", reason: "partial-month", rows: 1 }]);
  });

  it("joins downloads that meet or overlap, and gives a month with a gap no total", () => {
    const rowsAcross = [row("p", "2026-02-05", 100), row("q", "2026-02-25", 200)];
    const joined = bankMonthlyTotals(
      rowsAcross,
      ticks("p", "q"),
      [cover("2026-02-01", "2026-02-14"), cover("2026-02-15", "2026-02-28")],
      TODAY,
      CAD,
    );
    expect(joined.months).toHaveLength(1);
    const gap = bankMonthlyTotals(
      rowsAcross,
      ticks("p", "q"),
      [cover("2026-02-01", "2026-02-14"), cover("2026-02-16", "2026-02-28")],
      TODAY,
      CAD,
    );
    expect(gap.months).toEqual([]);
    expect(idsLeftOut(gap, "partial-month").sort()).toEqual(["p", "q"]);
  });

  it("never counts a deposit the person didn't tick", () => {
    const result = bankMonthlyTotals(rows, ticks(), feb2mar, TODAY, CAD);
    expect(result.months).toEqual([]);
    expect(result.rowsCounted).toBe(0);
    expect(idsLeftOut(result, "not-ticked")).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("ignores a tick that matches no row", () => {
    const result = bankMonthlyTotals(rows, ticks("a", "nope"), feb2mar, TODAY, CAD);
    expect(result.months.map((m) => m.amountCents)).toEqual([10000]);
  });

  it("doesn't propose a complete month nothing was ticked in, and doesn't call it held back", () => {
    const result = bankMonthlyTotals(rows, ticks("d"), feb2mar, TODAY, CAD);
    expect(result.months.map((m) => m.periodStart)).toEqual(["2026-03-01"]);
    expect(result.heldBack).toEqual([]);
  });

  it("leaves out a row in another currency instead of adding or converting it", () => {
    const mixed = [
      row("cad", "2026-02-03", 10000),
      row("usd", "2026-02-04", 99900, { currency: "USD" }),
    ];
    const cadStatement = bankMonthlyTotals(mixed, ticks("cad", "usd"), feb2mar, TODAY, CAD);
    expect(cadStatement.months.map((m) => m.amountCents)).toEqual([10000]);
    expect(idsLeftOut(cadStatement, "other-currency")).toEqual(["usd"]);

    // The same rows in a US-dollar statement: now the Canadian-dollar row is the odd one out.
    const usdStatement = bankMonthlyTotals(mixed, ticks("cad", "usd"), feb2mar, TODAY, {
      currency: "USD",
    });
    expect(usdStatement.months.map((m) => m.amountCents)).toEqual([99900]);
    expect(usdStatement.currency).toBe("USD");
    expect(idsLeftOut(usdStatement, "other-currency")).toEqual(["cad"]);
  });

  it("proposes only months that are over", () => {
    const march = [row("m", "2026-03-10", 500)];
    const cov = [cover("2026-03-01", "2026-03-31")];
    // On March 31st itself the month isn't done: a statement can't hold what posts that evening.
    const onTheLastDay = bankMonthlyTotals(march, ticks("m"), cov, "2026-03-31", CAD);
    expect(onTheLastDay.months).toEqual([]);
    expect(onTheLastDay.heldBack).toEqual([{ month: "2026-03", reason: "not-over", rows: 1 }]);
    expect(idsLeftOut(onTheLastDay, "not-over")).toEqual(["m"]);
    expect(bankMonthlyTotals(march, ticks("m"), cov, "2026-04-01", CAD).months).toHaveLength(1);
  });

  it("treats a today that isn't a real day as 'nothing is over yet'", () => {
    const result = bankMonthlyTotals(rows, ticks("a"), feb2mar, "soon", CAD);
    expect(result.months).toEqual([]);
    expect(idsLeftOut(result, "not-over")).toEqual(["a"]);
  });

  it("gives a month that isn't over the 'not over' reason before any coverage reason", () => {
    // Downloaded from the 20th of the current month: both true, but 'not over' is the real cause.
    const result = bankMonthlyTotals(
      [row("n", "2026-04-02", 5)],
      ticks("n"),
      [cover("2026-04-01", "2026-04-05")],
      TODAY,
      CAD,
    );
    expect(result.heldBack).toEqual([{ month: "2026-04", reason: "not-over", rows: 1 }]);
  });

  it("adds exactly, even where a floating-point sum would drift", () => {
    const big = [
      row("b1", "2026-02-01", 4_000_000_000_000_000),
      row("b2", "2026-02-02", 4_000_000_000_000_000),
      row("b3", "2026-02-03", 1),
    ];
    const result = bankMonthlyTotals(big, ticks("b1", "b2", "b3"), feb2mar, TODAY, CAD);
    expect(result.months[0].amountCents).toBe(8_000_000_000_000_001);
  });

  it("refuses a month too large to hold exactly, in words that carry no amount", () => {
    const huge = [
      row("h1", "2026-02-01", 9_000_000_000_000_000),
      row("h2", "2026-02-02", 9_000_000_000_000_000),
    ];
    let message = "";
    try {
      bankMonthlyTotals(huge, ticks("h1", "h2"), feb2mar, TODAY, CAD);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).toMatch(/too large/);
    expect(message).not.toMatch(/\d/);
  });

  it("hands over months the [8c] 'already in DotAmi' check can use as they are", () => {
    const result = bankMonthlyTotals(rows, ticks("a", "b"), feb2mar, TODAY, CAD);
    const existing = [
      {
        kind: "gross-revenue" as const,
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
        amountCents: 15025,
        currency: "CAD",
        status: "confirmed" as const,
      },
    ];
    const split = splitAlreadyKnown(result.months, existing, "CAD");
    expect(split.known).toHaveLength(1);
    expect(split.fresh).toEqual([]);
  });
});

describe("bankMonthlyTotals — an end date with no time", () => {
  const rows = [row("f", "2026-02-10", 100), row("m", "2026-03-10", 200)];
  const marked = ticks("f", "m");

  it("asks about the last month rather than assuming its last day is in the file", () => {
    const result = bankMonthlyTotals(
      rows,
      marked,
      [cover("2026-01-01", "2026-03-31", { toIsUnsure: true })],
      TODAY,
      CAD,
    );
    expect(result.months.map((m) => m.periodStart)).toEqual(["2026-02-01"]);
    expect(result.heldBack).toEqual([{ month: "2026-03", reason: "end-day-unsure", rows: 1 }]);
    expect(idsLeftOut(result, "end-day-unsure")).toEqual(["m"]);
  });

  it("counts the month once the person says the last day is in", () => {
    const answered = bankMonthlyTotals(
      rows,
      marked,
      [cover("2026-01-01", "2026-03-31")],
      TODAY,
      CAD,
    );
    expect(answered.months.map((m) => m.periodStart)).toEqual(["2026-02-01", "2026-03-01"]);
  });

  it("isn't settled by a neighbouring download that starts the next day", () => {
    const result = bankMonthlyTotals(
      rows,
      marked,
      [cover("2026-01-01", "2026-03-31", { toIsUnsure: true }), cover("2026-04-01", "2026-04-30")],
      "2026-05-01",
      CAD,
    );
    expect(result.heldBack.map((h) => h.reason)).toEqual(["end-day-unsure"]);
  });

  it("is settled by a download that covers that last day itself", () => {
    const result = bankMonthlyTotals(
      rows,
      marked,
      [cover("2026-01-01", "2026-03-31", { toIsUnsure: true }), cover("2026-03-31", "2026-04-30")],
      "2026-05-01",
      CAD,
    );
    expect(result.months.map((m) => m.periodStart)).toEqual(["2026-02-01", "2026-03-01"]);
  });
});

describe("bankMonthlyTotals — repeats, corrections and pending rows", () => {
  const cov = [cover("2026-02-01", "2026-02-28")];
  const same = { fitid: "T-1001" };

  it("counts a transaction listed twice once", () => {
    const twice = [row("one", "2026-02-03", 10000, same), row("two", "2026-02-03", 10000, same)];
    const result = bankMonthlyTotals(twice, ticks("one", "two"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 10000, rows: 1 });
    expect(result.leftOut).toEqual([{ id: "two", reason: "duplicate" }]);
  });

  it("keeps the person's tick when only the second copy was ticked", () => {
    const twice = [row("one", "2026-02-03", 10000, same), row("two", "2026-02-03", 10000, same)];
    const result = bankMonthlyTotals(twice, ticks("two"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 10000, rows: 1 });
  });

  it("treats the same bank id with a different amount or day as a different transaction", () => {
    // Some banks reuse short ids, so the id alone isn't proof of a repeat.
    const reused = [
      row("one", "2026-02-03", 10000, same),
      row("two", "2026-02-04", 10000, same),
      row("three", "2026-02-03", 2500, same),
    ];
    const result = bankMonthlyTotals(reused, ticks("one", "two", "three"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 22500, rows: 3 });
  });

  it("never merges rows that have no bank id, even if they look identical (two real sales)", () => {
    const sales = [row("s1", "2026-02-03", 4000), row("s2", "2026-02-03", 4000)];
    const result = bankMonthlyTotals(sales, ticks("s1", "s2"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 8000, rows: 2 });
  });

  it("applies a 'replace' correction: the new row counts, the old one doesn't", () => {
    const rows = [
      row("old", "2026-02-03", 10000, { fitid: "A1" }),
      row("new", "2026-02-03", 12000, {
        fitid: "A2",
        corrects: { fitid: "A1", action: "replace" },
      }),
    ];
    const result = bankMonthlyTotals(rows, ticks("old", "new"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 12000, rows: 1 });
    expect(result.leftOut).toEqual([{ id: "old", reason: "corrected" }]);
  });

  it("applies a 'delete' correction: neither the cancelled row nor the notice counts", () => {
    const rows = [
      row("old", "2026-02-03", 10000, { fitid: "A1" }),
      row("note", "2026-02-04", 10000, {
        fitid: "A2",
        corrects: { fitid: "A1", action: "delete" },
      }),
      row("other", "2026-02-05", 300),
    ];
    const result = bankMonthlyTotals(rows, ticks("old", "note", "other"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 300, rows: 1 });
    expect(idsLeftOut(result, "corrected").sort()).toEqual(["note", "old"]);
  });

  it("follows a chain of corrections to the last one", () => {
    const rows = [
      row("v1", "2026-02-03", 100, { fitid: "A1" }),
      row("v2", "2026-02-03", 200, { fitid: "A2", corrects: { fitid: "A1", action: "replace" } }),
      row("v3", "2026-02-03", 300, { fitid: "A3", corrects: { fitid: "A2", action: "replace" } }),
    ];
    const result = bankMonthlyTotals(rows, ticks("v1", "v2", "v3"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 300, rows: 1 });
  });

  it("counts a replacement whose original isn't in these files, and drops a delete notice that has nothing to delete", () => {
    const rows = [
      row("r", "2026-02-03", 500, { fitid: "B2", corrects: { fitid: "GONE", action: "replace" } }),
      row("d", "2026-02-04", 900, { fitid: "B3", corrects: { fitid: "GONE", action: "delete" } }),
    ];
    const result = bankMonthlyTotals(rows, ticks("r", "d"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 500, rows: 1 });
    expect(result.leftOut).toEqual([{ id: "d", reason: "corrected" }]);
  });

  it("still cancels the old row when the replacement itself can't be read", () => {
    const rows = [
      row("old", "2026-02-03", 10000, { fitid: "A1" }),
      row("bad", "2026-02-30", 12000, {
        fitid: "A2",
        corrects: { fitid: "A1", action: "replace" },
      }),
    ];
    const result = bankMonthlyTotals(rows, ticks("old", "bad"), cov, TODAY, CAD);
    expect(result.months).toEqual([]);
    expect(result.leftOut).toEqual([
      { id: "old", reason: "corrected" },
      { id: "bad", reason: "unreadable" },
    ]);
  });

  it("never counts a pending row, even a ticked one", () => {
    const rows = [row("p", "2026-02-03", 10000, { pending: true }), row("ok", "2026-02-04", 200)];
    const result = bankMonthlyTotals(rows, ticks("p", "ok"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 200, rows: 1 });
    expect(result.leftOut).toEqual([{ id: "p", reason: "pending" }]);
  });

  it("doesn't let a pending row make its posted version look like a repeat", () => {
    const rows = [
      row("pend", "2026-02-03", 10000, { fitid: "P1", pending: true }),
      row("posted", "2026-02-03", 10000, { fitid: "P1" }),
    ];
    const result = bankMonthlyTotals(rows, ticks("pend", "posted"), cov, TODAY, CAD);
    expect(result.months[0]).toMatchObject({ amountCents: 10000, rows: 1 });
    expect(result.leftOut).toEqual([{ id: "pend", reason: "pending" }]);
  });
});

describe("bankMonthlyTotals — money out and rows it can't read", () => {
  const cov = [cover("2026-03-01", "2026-04-30")];
  const rows = [
    row("sale", "2026-03-28", 10000),
    row("refund", "2026-04-02", -3000),
    row("zero", "2026-04-03", 0),
  ];

  it("counts only money in, so a ticked refund is listed but doesn't lower anything", () => {
    const result = bankMonthlyTotals(rows, ticks("sale", "refund", "zero"), cov, "2026-05-01", CAD);
    expect(result.months.map((m) => m.amountCents)).toEqual([10000]);
    expect(idsLeftOut(result, "not-money-in")).toEqual(["refund", "zero"]);
  });

  it("subtracts a ticked refund from the month the money left, when refunds are allowed", () => {
    const result = bankMonthlyTotals(rows, ticks("sale", "refund", "zero"), cov, "2026-05-01", {
      ...CAD,
      allowRefunds: true,
    });
    expect(result.months).toEqual([
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 10000, rows: 1 },
      { periodStart: "2026-04-01", periodEnd: "2026-04-30", amountCents: -3000, rows: 1 },
    ]);
    // A zero row is never money in, with refunds allowed or not.
    expect(idsLeftOut(result, "not-money-in")).toEqual(["zero"]);
  });

  it("proposes a month whose ticked rows add up to zero, because they were ticked", () => {
    const rowsNet = [row("in", "2026-03-05", 5000), row("out", "2026-03-06", -5000)];
    const result = bankMonthlyTotals(rowsNet, ticks("in", "out"), cov, "2026-05-01", {
      ...CAD,
      allowRefunds: true,
    });
    expect(result.months[0]).toMatchObject({ amountCents: 0, rows: 2 });
  });

  it("lists a row with an impossible date, amount or currency as unreadable, and keeps it out of every month", () => {
    const bad = [
      row("day", "2026-02-30", 100),
      row("cents", "2026-03-05", 10.5),
      row("code", "2026-03-05", 100, { currency: "cad" }),
      row("good", "2026-03-06", 700),
    ];
    const result = bankMonthlyTotals(
      bad,
      ticks("day", "cents", "code", "good"),
      cov,
      "2026-05-01",
      CAD,
    );
    expect(idsLeftOut(result, "unreadable")).toEqual(["day", "cents", "code"]);
    expect(result.months).toEqual([
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 700, rows: 1 },
    ]);
    expect(result.heldBack).toEqual([]);
  });
});

describe("bankMonthlyTotals — every row is accounted for, and nothing from the file travels", () => {
  const messy = [
    row("r1", "2026-01-20", 100), // January: not fully downloaded
    row("r2", "2026-02-03", 10000, { fitid: "F-1" }),
    row("r3", "2026-02-03", 10000, { fitid: "F-1" }), // repeat of r2
    row("r4", "2026-02-09", 250),
    row("r5", "2026-02-10", 999, { pending: true }),
    row("r6", "2026-02-11", 400, { currency: "USD" }),
    row("r7", "2026-02-12", -800),
    row("r8", "2026-02-13", 0),
    row("r9", "2026-02-14", 70, { fitid: "G-1" }),
    row("r10", "2026-02-15", 70, { fitid: "G-2", corrects: { fitid: "G-1", action: "replace" } }),
    row("r11", "2026-02-30", 5),
    row("r12", "2026-04-05", 40), // April: not over
    row("r13", "2026-02-20", 5555),
  ];
  const ticked = ticks("r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12");
  const covering = [cover("2026-01-15", "2026-04-30")];

  it("puts every row in a total or in the left-out list exactly once, in the order given", () => {
    const result = bankMonthlyTotals(messy, ticked, covering, TODAY, CAD);
    expect(result.rowsCounted + result.leftOut.length).toBe(messy.length);
    const ids = result.leftOut.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const order = messy.map((r) => r.id);
    expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    // And each row got the reason the rules give it.
    expect(Object.fromEntries(result.leftOut.map((l) => [l.id, l.reason]))).toEqual({
      r1: "partial-month",
      r3: "duplicate",
      r5: "pending",
      r6: "other-currency",
      r7: "not-money-in",
      r8: "not-money-in",
      r9: "corrected",
      r11: "unreadable",
      r12: "not-over",
      r13: "not-ticked",
    });
  });

  it("counts left-out rows by every reason, zero included", () => {
    const counts = countLeftOut(bankMonthlyTotals(messy, ticked, covering, TODAY, CAD).leftOut);
    expect(Object.keys(counts).sort()).toEqual([...LEFT_OUT_REASONS].sort());
    expect(counts["not-ticked"]).toBe(1);
    expect(counts["end-day-unsure"]).toBe(0);
  });

  it("carries no description, name, bank id or account number in what it hands back", () => {
    const withNames = messy.map((r) => ({
      ...r,
      description: `E-TRANSFER FROM ${PAYER} ${ACCOUNT_NUMBER}`,
      fitid: r.fitid ? `${r.fitid}-${ACCOUNT_NUMBER}` : undefined,
      corrects: r.corrects
        ? { ...r.corrects, fitid: `${r.corrects.fitid}-${ACCOUNT_NUMBER}` }
        : undefined,
    }));
    const result = bankMonthlyTotals(withNames, ticked, covering, TODAY, CAD);
    const text = JSON.stringify(result);
    expect(text).not.toContain(PAYER);
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain("E-TRANSFER");
    // A real result, not an empty one: the corrections and repeats above were applied.
    expect(result.months.length).toBeGreaterThan(0);
  });

  it("has a plain sentence for every reason", () => {
    for (const reason of LEFT_OUT_REASONS) {
      const text = LEFT_OUT_REASON_TEXT[reason];
      expect(text.length, reason).toBeGreaterThan(10);
      expect(text, reason).toMatch(/[.]$/);
      expect(text, reason).not.toMatch(/FITID|OFX|CSV|STMT|DTEND|TRNAMT/);
    }
  });
});

describe("coverage helpers", () => {
  it("lists the months from the first date found to the last", () => {
    expect(monthsBetween("2026-01-15", "2026-03-02")).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(monthsBetween("2025-11-30", "2026-02-01")).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(monthsBetween("2026-05-05", "2026-05-31")).toEqual(["2026-05"]);
    expect(monthsBetween("2026-03-02", "2026-01-15")).toEqual([]);
    expect(monthsBetween("2026-02-30", "2026-03-02")).toEqual([]);
  });

  it("turns the months the person ticked into coverage, ignoring anything that isn't a month", () => {
    expect(
      coverageFromMonths(["2026-03", "2026-02", "2026-02", "2026-13", "26-01", "2024-02", "soon"]),
    ).toEqual([
      { from: "2024-02-01", to: "2024-02-29" },
      { from: "2026-02-01", to: "2026-02-28" },
      { from: "2026-03-01", to: "2026-03-31" },
    ]);
  });

  it("finds the first and last day with a row, whatever order they come in", () => {
    expect(
      spanOfRows([row("a", "2026-03-05", 1), row("b", "2026-01-02", 1), row("c", "2026-02-09", 1)]),
    ).toEqual({
      first: "2026-01-02",
      last: "2026-03-05",
    });
    expect(spanOfRows([])).toBeNull();
    expect(spanOfRows([row("x", "2026-02-30", 1)])).toBeNull();
  });

  it("moves a day by whole days across month and year ends", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("covers nothing with a range that isn't two real days in order", () => {
    const check = coverageChecker([
      cover("2026-02-30", "2026-03-31"),
      cover("2026-03-31", "2026-03-01"),
      cover("soon", "later"),
    ]);
    expect(check("2026-03")).toBe("partial");
  });

  it("calls two files overlapping when they share even a single day", () => {
    const jan = { first: "2026-01-01", last: "2026-01-31" };
    expect(firstOverlap([jan, { first: "2026-01-31", last: "2026-02-28" }])).toEqual([0, 1]);
    expect(firstOverlap([jan, { first: "2026-02-01", last: "2026-02-28" }])).toBeNull();
    expect(firstOverlap([{ first: "2026-02-01", last: "2026-02-28" }, jan])).toBeNull();
    // A short file inside a long one, and the pair is named by position, not by date order.
    expect(
      firstOverlap([
        { first: "2026-06-01", last: "2026-06-30" },
        { first: "2026-01-01", last: "2026-12-31" },
        { first: "2026-03-10", last: "2026-03-12" },
      ]),
    ).toEqual([1, 2]);
    expect(firstOverlap([])).toBeNull();
    expect(OVERLAPPING_FILES_MESSAGE).not.toMatch(/\d/);
  });
});

// ── CSV column logic ────────────────────────────────────────────────────────────────────────────

/** A deposit-account download with lines above the column names, one of them an account number. */
const accountSheet: Cell[][] = [
  ["Account:", ACCOUNT_NUMBER],
  [`Statement for ${PAYER}`],
  [],
  ["Date", "Description", "Withdrawals", "Deposits", "Balance"],
  ["2026-01-05", "RENT", "900.00", "", "4,100.00"],
  ["2026-01-06", "CLIENT PAYMENT", "", "1,200.00", "5,300.00"],
  ["2026-01-20", "SUPPLIES", "(45.50)", "", "5,254.50"],
  ["2026-02-02", "CLIENT PAYMENT", "", "800.00", "6,054.50"],
];

const accountChoice: BankCsvChoice = {
  headerRow: 3,
  dateColumn: 0,
  descriptionColumn: 1,
  layout: { kind: "in-out", moneyInColumn: 3, moneyOutColumn: 2 },
  dateOrder: null,
  decimalStyle: "point",
};

describe("guessBankColumns", () => {
  it("finds the column names below the lines above them and pre-fills what it is sure of", () => {
    const guess = guessBankColumns(accountSheet);
    expect(guess).toMatchObject({
      headerRow: 3,
      dateColumn: 0,
      descriptionColumn: 1,
      moneyOutColumn: 2,
      moneyInColumn: 3,
      amountColumn: null,
      balanceColumns: [4],
    });
  });

  it("holds only the column names, never a line from above them or a cell from below", () => {
    const text = JSON.stringify(guessBankColumns(accountSheet));
    expect(text).not.toContain(ACCOUNT_NUMBER);
    expect(text).not.toContain(PAYER);
    expect(text).not.toContain("CLIENT PAYMENT");
  });

  it("reads French column names, accents and all", () => {
    const guess = guessBankColumns([
      ["Date", "Libellé", "Retraits", "Dépôts", "Solde"],
      ["2026-01-05", "LOYER", "900,00", "", "4 100,00"],
      ["2026-01-06", "CLIENT", "", "1 200,00", "5 300,00"],
    ]);
    expect(guess).toMatchObject({
      dateColumn: 0,
      descriptionColumn: 1,
      moneyOutColumn: 2,
      moneyInColumn: 3,
      balanceColumns: [4],
    });
  });

  it("pre-fills one signed amount column when there is no money-in column, and never says what the sign means", () => {
    const guess = guessBankColumns([
      ["Date", "Details", "Amount", "Balance"],
      ["2026-01-05", "RENT", "-900.00", "4,100.00"],
      ["2026-01-06", "CLIENT", "1200.00", "5,300.00"],
    ]);
    expect(guess).toMatchObject({
      amountColumn: 2,
      moneyInColumn: null,
      moneyOutColumn: null,
      descriptionColumn: 1,
    });
    expect(guess).not.toHaveProperty("positiveMeans");
  });

  it("never pre-fills a balance column as the money", () => {
    // Named like an amount but it is the running balance: better an empty picker than a wrong income.
    const onlyBalance = guessBankColumns([
      ["Date", "Description", "Amount balance"],
      ["2026-01-05", "RENT", "4,100.00"],
      ["2026-01-06", "CLIENT", "5,300.00"],
    ]);
    expect(onlyBalance?.amountColumn).toBeNull();
    expect(onlyBalance?.balanceColumns).toEqual([2]);

    // Two "credit" columns, one of them the balance: the balance doesn't make the deposits column ambiguous.
    const beside = guessBankColumns([
      ["Date", "Description", "Deposits", "Credit balance"],
      ["2026-01-05", "RENT", "100.00", "4,100.00"],
      ["2026-01-06", "CLIENT", "1200.00", "5,300.00"],
    ]);
    expect(beside?.moneyInColumn).toBe(2);
  });

  it("never pre-fills an account number, card number or id column as the description or the money", () => {
    const guess = guessBankColumns([
      ["Date", "Account number", "Card #", "Description", "Amount"],
      ["2026-01-05", ACCOUNT_NUMBER, "4510000000001234", "RENT", "-900.00"],
      ["2026-01-06", ACCOUNT_NUMBER, "4510000000001234", "CLIENT", "1200.00"],
    ]);
    expect(guess).toMatchObject({ dateColumn: 0, descriptionColumn: 3, amountColumn: 4 });

    const onlyAccountName = guessBankColumns([
      ["Date", "Account name", "Amount"],
      ["2026-01-05", "Business chequing", "-900.00"],
      ["2026-01-06", "Business chequing", "1200.00"],
    ]);
    expect(onlyAccountName?.descriptionColumn).toBeNull();
  });

  it("leaves a choice empty when two columns could be it", () => {
    const twoDeposits = guessBankColumns([
      ["Date", "Description", "Deposit", "Credit", "Withdrawal"],
      ["2026-01-05", "A", "100.00", "", ""],
      ["2026-01-06", "B", "", "200.00", ""],
      ["2026-01-07", "C", "", "", "50.00"],
    ]);
    expect(twoDeposits).toMatchObject({ moneyInColumn: null, moneyOutColumn: 4 });

    const twoDates = guessBankColumns([
      ["Date", "Value date", "Description", "Amount"],
      ["2026-01-05", "2026-01-06", "A", "100.00"],
      ["2026-01-07", "2026-01-08", "B", "200.00"],
    ]);
    expect(twoDates?.dateColumn).toBeNull();
  });

  it("takes the posting date when a file has a transaction date and a posting date", () => {
    const guess = guessBankColumns([
      ["Transaction date", "Posting date", "Description", "Amount"],
      ["2026-01-05", "2026-01-06", "A", "100.00"],
      ["2026-01-07", "2026-01-08", "B", "200.00"],
    ]);
    expect(guess?.dateColumn).toBe(1);
  });

  it("returns null when no row of names sits above a date", () => {
    expect(guessBankColumns([["2026-01-05", "100.00"]])).toBeNull();
    expect(guessBankColumns([])).toBeNull();
  });

  it("lists balance, account and tax columns last in a picker, but keeps them pickable", () => {
    const columns = guessBankColumns([
      ["Balance", "Date", "Account number", "Description", "GST", "Amount"],
      ["4,100.00", "2026-01-05", ACCOUNT_NUMBER, "RENT", "0.00", "-900.00"],
      ["5,300.00", "2026-01-06", ACCOUNT_NUMBER, "CLIENT", "0.00", "1200.00"],
    ])!.columns;
    const labels = orderedMoneyColumns(columns).map((c) => c.label);
    expect(labels).toEqual(["Date", "Description", "Amount", "Balance", "Account number", "GST"]);
    expect(labels[0]).not.toBe("Balance");
  });
});

describe("bankRowsFromSheet", () => {
  it("reads money in and money out columns into positive and negative cents", () => {
    const result = bankRowsFromSheet(accountSheet, accountChoice, "CAD");
    expect(result).toEqual({
      ok: true,
      rows: [
        { id: "5", day: "2026-01-05", cents: -90000, currency: "CAD", description: "RENT" },
        {
          id: "6",
          day: "2026-01-06",
          cents: 120000,
          currency: "CAD",
          description: "CLIENT PAYMENT",
        },
        { id: "7", day: "2026-01-20", cents: -4550, currency: "CAD", description: "SUPPLIES" },
        {
          id: "8",
          day: "2026-02-02",
          cents: 80000,
          currency: "CAD",
          description: "CLIENT PAYMENT",
        },
      ],
      skipped: [],
      span: { first: "2026-01-05", last: "2026-02-02" },
    });
  });

  it("reads nothing but the picked columns: an account number elsewhere never gets into a row", () => {
    const sheet: Cell[][] = [
      ["Account:", ACCOUNT_NUMBER],
      ["Date", "Account number", "Description", "Amount"],
      ["2026-01-05", ACCOUNT_NUMBER, "RENT", "-900.00"],
      ["2026-01-06", ACCOUNT_NUMBER, "CLIENT", "1200.00"],
    ];
    const result = bankRowsFromSheet(
      sheet,
      {
        headerRow: 1,
        dateColumn: 0,
        descriptionColumn: 2,
        layout: { kind: "signed", amountColumn: 3, positiveMeans: "money-in" },
        dateOrder: null,
        decimalStyle: "point",
      },
      "CAD",
    );
    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain(ACCOUNT_NUMBER);
    // The row has exactly the fields BankRow names, nothing extra from the file.
    if (result.ok)
      expect(Object.keys(result.rows[0]).sort()).toEqual([
        "cents",
        "currency",
        "day",
        "description",
        "id",
      ]);
  });

  it("reads one signed column whichever way the person says a positive number points", () => {
    const sheet: Cell[][] = [
      ["Date", "Details", "Amount"],
      ["2026-03-01", "COFFEE", "4.50"], // a card purchase: positive means money out
      ["2026-03-02", "PAYMENT THANK YOU", "-300.00"],
    ];
    const choice = (positiveMeans: "money-in" | "money-out"): BankCsvChoice => ({
      headerRow: 0,
      dateColumn: 0,
      descriptionColumn: 1,
      layout: { kind: "signed", amountColumn: 2, positiveMeans },
      dateOrder: null,
      decimalStyle: "point",
    });
    const cents = (positiveMeans: "money-in" | "money-out") => {
      const result = bankRowsFromSheet(sheet, choice(positiveMeans), "CAD");
      return result.ok ? result.rows.map((r) => r.cents) : null;
    };
    expect(cents("money-in")).toEqual([450, -30000]);
    expect(cents("money-out")).toEqual([-450, 30000]);
  });

  it("lists every row it can't turn into a transaction, with the reason", () => {
    const sheet: Cell[][] = [
      ["Date", "Description", "Withdrawals", "Deposits"],
      ["2026-01-05", "OPENING BALANCE", "", ""],
      ["2026-01-06", "OK", "", "10.00"],
      [],
      ["2026-01-07", "BAD", "", "US$5.00"],
      ["2026-01-08", "REVERSED", "", "-20.00"],
      ["2026-01-09", "BOTH", "5.00", "6.00"],
      ["2026-01-10", "ZEROS", "0.00", "30.00"],
      ["2026-01-11", "MINUS OUT", "-12.00", ""],
      ["not a date", "NOTE", "", ""],
      ["Total", "", "5.00", "46.00"],
      [],
      [],
    ];
    const result = bankRowsFromSheet(
      sheet,
      {
        headerRow: 0,
        dateColumn: 0,
        descriptionColumn: 1,
        layout: { kind: "in-out", moneyInColumn: 3, moneyOutColumn: 2 },
        dateOrder: null,
        decimalStyle: "point",
      },
      "CAD",
    );
    if (!result.ok) throw new Error("expected rows");
    expect(result.rows.map((r) => [r.id, r.cents])).toEqual([
      ["3", 1000],
      ["8", 3000],
      ["9", -1200],
    ]);
    expect(result.skipped).toEqual([
      { row: 2, reason: "no-amount" },
      { row: 4, reason: "blank" },
      { row: 5, reason: "bad-amount" },
      { row: 6, reason: "unexpected-sign" },
      { row: 7, reason: "both-columns" },
      { row: 10, reason: "no-date" },
      { row: 11, reason: "total" },
    ]);
    // The trailing blank rows are the sheet's own space, not rows to account for.
    for (const reason of new Set(result.skipped.map((s) => s.reason))) {
      expect(BANK_CSV_SKIP_TEXT[reason]).toMatch(/[.]$/);
    }
  });

  it("reads comma-decimal amounts and asks about a date it can't be sure of", () => {
    const sheet: Cell[][] = [
      ["Date", "Description", "Montant"],
      ["03/04/2026", "A", "1 234,56"],
      ["25/04/2026", "B", "10,00"],
    ];
    const choice: BankCsvChoice = {
      headerRow: 0,
      dateColumn: 0,
      descriptionColumn: 1,
      layout: { kind: "signed", amountColumn: 2, positiveMeans: "money-in" },
      dateOrder: null,
      decimalStyle: "comma",
    };
    const unsure = bankRowsFromSheet(sheet, choice, "CAD");
    // 03/04/2026 could be March 4th or April 3rd, so without an answer it isn't read.
    expect(unsure.ok && unsure.skipped).toEqual([{ row: 2, reason: "no-date" }]);
    const formats = detectBankFormats(sheet, 0, 0, [2]);
    expect(formats.dateOrder).toEqual({ order: "dmy", ambiguous: false, conflicting: false });
    expect(formats.decimalStyle).toBe("comma");
    const answered = bankRowsFromSheet(sheet, { ...choice, dateOrder: "dmy" }, "CAD");
    expect(answered.ok && answered.rows.map((r) => [r.day, r.cents])).toEqual([
      ["2026-04-03", 123456],
      ["2026-04-25", 1000],
    ]);
  });

  it("keeps ids apart between files with a prefix, and numbers rows as the person sees them", () => {
    const result = bankRowsFromSheet(accountSheet, accountChoice, "CAD", "jan-");
    expect(result.ok && result.rows.map((r) => r.id)).toEqual(["jan-5", "jan-6", "jan-7", "jan-8"]);
  });

  it("refuses a choice it can't use, in plain words", () => {
    const error = (choice: BankCsvChoice, currency = "CAD") => {
      const result = bankRowsFromSheet(accountSheet, choice, currency);
      return result.ok ? null : result.error;
    };
    expect(error({ ...accountChoice, dateColumn: 2 })).toBe(
      "Each column can only be used for one thing.",
    );
    expect(error({ ...accountChoice, dateColumn: -1 })).toBe("Pick a column for each of these.");
    expect(error({ ...accountChoice, headerRow: 99 })).toBe(
      "Pick the row that holds the column names.",
    );
    expect(error(accountChoice, "cad")).toBe(
      "The currency has to be a three-letter code such as CAD.",
    );
    expect(error(accountChoice)).toBeNull();
  });
});

describe("a CSV statement, start to finish", () => {
  const choice = accountChoice;

  it("turns ticked rows into the months the person said they downloaded in full", () => {
    const read = bankRowsFromSheet(accountSheet, choice, "CAD");
    if (!read.ok) throw new Error("expected rows");
    // The person says January was downloaded in full, but not February (the file just stops).
    const result = bankMonthlyTotals(
      read.rows,
      ticks("6", "8"),
      coverageFromMonths(["2026-01"]),
      TODAY,
      CAD,
    );
    expect(result.months).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 120000, rows: 1 },
    ]);
    expect(result.leftOut).toEqual([
      { id: "5", reason: "not-ticked" },
      { id: "7", reason: "not-ticked" },
      { id: "8", reason: "partial-month" },
    ]);
    expect(result.heldBack).toEqual([{ month: "2026-02", reason: "partial-month", rows: 1 }]);
  });

  it("refuses two files that overlap, because a repeated CSV row could be two real sales", () => {
    const second: Cell[][] = [
      ["Date", "Description", "Withdrawals", "Deposits", "Balance"],
      ["2026-01-20", "SUPPLIES", "(45.50)", "", "5,254.50"],
      ["2026-03-01", "CLIENT PAYMENT", "", "500.00", "5,754.50"],
    ];
    const a = bankRowsFromSheet(accountSheet, choice, "CAD", "a-");
    const b = bankRowsFromSheet(second, { ...choice, headerRow: 0 }, "CAD", "b-");
    if (!a.ok || !b.ok || !a.span || !b.span) throw new Error("expected rows");
    expect(firstOverlap([a.span, b.span])).toEqual([0, 1]);
  });
});

// ── Privacy by type ─────────────────────────────────────────────────────────────────────────────

describe("privacy by type", () => {
  it("gives a row nowhere to put an account or card number (the compiler checks this line)", () => {
    const withAccount: BankRow = {
      id: "1",
      day: "2026-01-01",
      cents: 1,
      currency: "CAD",
      description: "",
      // @ts-expect-error — BankRow has no field for an account number; adding one makes this line stop failing
      accountNumber: ACCOUNT_NUMBER,
    };
    const withCard: BankRow = {
      id: "1",
      day: "2026-01-01",
      cents: 1,
      currency: "CAD",
      description: "",
      // @ts-expect-error — nor for a card number
      cardNumber: "4510000000001234",
    };
    expect([withAccount, withCard]).toHaveLength(2);
  });

  const folder = path.join(process.cwd(), "lib", "figures", "bank");
  const files = readdirSync(folder).filter((f) => f.endsWith(".ts"));
  /** A file's code with its comments taken out, so a sentence about "console" can't trip the scan. */
  const code = (file: string) =>
    readFileSync(path.join(folder, file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("has no field anywhere in lib/figures/bank named for an account, a card, a branch or an institution", () => {
    expect(files).toContain("types.ts");
    const banned = /(acct|account|card|iban|routing|transit|institution|branch|bankid|swift)/i;
    for (const file of files) {
      // Field names: an identifier at the start of a line, then ":" or "?:".
      for (const [, name] of code(file).matchAll(/^\s+(?:readonly\s+)?([A-Za-z_]\w*)\??:/gm)) {
        expect(name, `${file} has a field called "${name}"`).not.toMatch(banned);
      }
    }
  });

  it("never logs, sends or stores anything", () => {
    for (const file of files) {
      const source = code(file);
      expect(source, `${file} logs`).not.toMatch(/\bconsole\s*\./);
      expect(source, `${file} sends or stores`).not.toMatch(
        /\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie)\b/,
      );
      expect(source, `${file} reaches the disk or the database`).not.toMatch(
        /from\s+["'](node:)?fs|@prisma|\/store["']|\/http["']/,
      );
    }
  });
});
