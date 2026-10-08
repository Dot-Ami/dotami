/**
 * [8h] Books — the shared core: exact amounts and the monthly totals (lib/figures/books/amount,
 * totals). Every account, line and amount here is invented, and built in code.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { amountToCents, parseFraction } from "@/lib/figures/books/amount";
import { booksMonthlyTotals, splitKnownByCurrency } from "@/lib/figures/books/totals";
import type { BookAccount, BookData, BookLine } from "@/lib/figures/books/types";

/** A revenue account unless told otherwise: credit side, CAD, marked as income by the book. */
function account(id: string, over: Partial<BookAccount> = {}): BookAccount {
  return {
    id,
    fullName: `Income:${id}`,
    bookType: "INCOME",
    side: "credit",
    currency: "CAD",
    markedAsRevenue: true,
    ...over,
  };
}

/** A posted line of `cents` (negative = credit, how a book writes income) on a day. */
function line(
  accountId: string,
  day: string | null,
  cents: number,
  over: Partial<BookLine> = {},
): BookLine {
  return { accountId, day, amount: { num: BigInt(cents), den: 100n }, scheduled: false, ...over };
}

const book = (accounts: BookAccount[], lines: BookLine[]): BookData => ({
  format: "gnucash-xml",
  accounts,
  lines,
});

/** The totals of a successful run, failing the test if the run was refused. */
function totalsOf(data: BookData, ticked: string[], today = "2026-10-06") {
  const result = booksMonthlyTotals(data, ticked, today);
  if (!result.ok) throw new Error(`expected totals, got a refusal: ${result.error}`);
  return result;
}

describe("parseFraction", () => {
  it("reads a num/denom text exactly", () => {
    expect(parseFraction("12500/100")).toEqual({ num: 12500n, den: 100n });
    expect(parseFraction("-12500/100")).toEqual({ num: -12500n, den: 100n });
    expect(parseFraction("  7/1 ")).toEqual({ num: 7n, den: 1n });
    expect(parseFraction("0/100")).toEqual({ num: 0n, den: 100n });
  });

  it("keeps the sign on the numerator when the denominator carries it", () => {
    expect(parseFraction("100/-100")).toEqual({ num: -100n, den: 100n });
    expect(parseFraction("-100/-100")).toEqual({ num: 100n, den: 100n });
  });

  it("refuses anything that isn't a fraction, a zero denominator, or absurdly long digits", () => {
    for (const text of [
      "",
      "12.50",
      "12500",
      "1/0",
      "a/b",
      "1/2/3",
      "1/ 2",
      "+1/2",
      "1e3/100",
      "1,5/100",
    ]) {
      expect(parseFraction(text), text).toBeNull();
    }
    expect(parseFraction(`${"9".repeat(31)}/100`)).toBeNull();
    expect(parseFraction(`1/${"9".repeat(31)}`)).toBeNull();
  });
});

describe("amountToCents", () => {
  it("is exact for the denominators books use", () => {
    expect(amountToCents({ num: 12500n, den: 100n })).toBe(12500n); // 125.00
    expect(amountToCents({ num: 12500n, den: 1000n })).toBe(1250n); // 12.500
    expect(amountToCents({ num: 125n, den: 1n })).toBe(12500n); // whole dollars
    expect(amountToCents({ num: -1n, den: 100n })).toBe(-1n);
    expect(amountToCents({ num: 0n, den: 7n })).toBe(0n);
  });

  it("refuses an amount that isn't a whole number of cents instead of rounding it", () => {
    expect(amountToCents({ num: 12505n, den: 1000n })).toBeNull(); // 12.505
    expect(amountToCents({ num: 1n, den: 3n })).toBeNull();
    expect(amountToCents({ num: 5n, den: 1000n })).toBeNull(); // half a cent
    expect(amountToCents({ num: -12505n, den: 1000n })).toBeNull();
  });

  it("refuses a denominator that isn't above zero", () => {
    expect(amountToCents({ num: 1n, den: 0n })).toBeNull();
    expect(amountToCents({ num: 1n, den: -100n })).toBeNull();
  });
});

describe("booksMonthlyTotals", () => {
  it("adds up only the accounts the person ticked", () => {
    const data = book(
      [account("sales"), account("interest"), account("bank", { side: "debit", bookType: "BANK" })],
      [
        line("sales", "2026-01-15", -100000),
        line("interest", "2026-01-20", -1234),
        line("bank", "2026-01-15", 100000),
      ],
    );
    const only = totalsOf(data, ["sales"]);
    expect(only.currencies).toHaveLength(1);
    expect(only.currencies[0].months[0].amountCents).toBe(100000);
    expect(totalsOf(data, ["sales", "interest"]).currencies[0].months[0].amountCents).toBe(101234);
    // Nothing ticked means nothing counted, however many income accounts the book has.
    expect(totalsOf(data, []).currencies).toEqual([]);
  });

  it("flips a revenue (credit) account to read as positive income", () => {
    const data = book([account("sales")], [line("sales", "2026-01-15", -125000)]);
    expect(totalsOf(data, ["sales"]).currencies[0].months[0].amountCents).toBe(125000);
  });

  it("leaves a debit account as the book wrote it: money in is already positive", () => {
    const data = book(
      [account("bank", { side: "debit", bookType: "BANK" })],
      [line("bank", "2026-01-15", 125000), line("bank", "2026-01-16", -2500)],
    );
    expect(totalsOf(data, ["bank"]).currencies[0].months[0].amountCents).toBe(122500);
  });

  it("keeps a month where refunds outweigh sales negative, and shows it", () => {
    const data = book(
      [account("sales")],
      [line("sales", "2026-04-02", -10000), line("sales", "2026-04-20", 25000)],
    );
    const month = totalsOf(data, ["sales"]).currencies[0].months[0];
    expect(month.amountCents).toBe(-15000);
    expect(month.rows).toBe(2);
  });

  it("never counts a scheduled or template line, even on a ticked account", () => {
    const data = book(
      [account("sales")],
      [
        line("sales", "2026-02-10", -250000),
        // A planned monthly retainer pointing at the same ticked account: planned, not posted.
        line("sales", "2026-02-01", -50000, { scheduled: true }),
        line("sales", "2026-02-15", -50000, { scheduled: true }),
      ],
    );
    const result = totalsOf(data, ["sales"]);
    expect(result.currencies[0].months).toEqual([
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 250000, rows: 1 },
    ]);
    expect(result.scheduledLines).toBe(2);
    expect(result.skipped).toEqual([
      { reason: "scheduled", accountId: "sales", month: "2026-02", lines: 2 },
    ]);
  });

  it("counts scheduled lines in the book even when their account isn't ticked", () => {
    const data = book(
      [account("sales"), account("other")],
      [line("other", "2026-02-01", -50000, { scheduled: true })],
    );
    const result = totalsOf(data, ["sales"]);
    expect(result.scheduledLines).toBe(1);
    expect(result.skipped).toEqual([]);
  });

  it("keeps currencies apart and never converts one into another", () => {
    const data = book(
      [account("cad"), account("usd", { currency: "USD" })],
      [
        line("cad", "2026-03-10", -100000),
        line("usd", "2026-03-11", -50000),
        line("usd", "2026-04-01", -7000),
      ],
    );
    const { currencies } = totalsOf(data, ["cad", "usd"]);
    expect(currencies.map((c) => c.currency)).toEqual(["CAD", "USD"]);
    expect(currencies[0].months).toEqual([
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 100000, rows: 1 },
    ]);
    expect(currencies[1].months.map((m) => m.amountCents)).toEqual([50000, 7000]);
    expect(currencies[1].linesCounted).toBe(2);
  });

  it("skips a month that hasn't ended, and counts it once it has", () => {
    const data = book([account("sales")], [line("sales", "2026-03-10", -10000)]);
    // March 31st isn't over until it is over: on the 30th the month still has a day to run.
    const during = totalsOf(data, ["sales"], "2026-03-30");
    expect(during.currencies).toEqual([]);
    expect(during.skipped).toEqual([
      { reason: "not-over", accountId: "sales", month: "2026-03", lines: 1 },
    ]);
    expect(totalsOf(data, ["sales"], "2026-03-31").currencies[0].months).toHaveLength(1);
  });

  it("gets the last day of a leap-year February right", () => {
    const data = book([account("sales")], [line("sales", "2028-02-10", -100)]);
    expect(totalsOf(data, ["sales"], "2028-03-01").currencies[0].months[0].periodEnd).toBe(
      "2028-02-29",
    );
    expect(totalsOf(data, ["sales"], "2028-02-28").currencies).toEqual([]);
  });

  it("leaves out an amount that isn't whole cents, listed, and never rounds it", () => {
    const data = book(
      [account("sales")],
      [
        line("sales", "2026-05-01", -10000),
        {
          accountId: "sales",
          day: "2026-05-02",
          amount: { num: -12505n, den: 1000n },
          scheduled: false,
        },
        { accountId: "sales", day: "2026-05-03", amount: { num: -1n, den: 3n }, scheduled: false },
      ],
    );
    const result = totalsOf(data, ["sales"]);
    // The 12.505 and the third of a dollar are not in the total at all — not rounded in either.
    expect(result.currencies[0].months[0].amountCents).toBe(10000);
    expect(result.currencies[0].months[0].rows).toBe(1);
    expect(result.skipped).toEqual([
      { reason: "not-cents", accountId: "sales", month: "2026-05", lines: 2 },
    ]);
  });

  it("lists every other kind of left-out line with its reason", () => {
    const data = book(
      [account("sales"), account("shares", { currency: null, bookType: "STOCK", side: "debit" })],
      [
        line("sales", "2026-06-01", -10000),
        line("sales", null, -500), // a date nobody can read
        line("sales", "2026-02-30", -500), // not a real day
        { accountId: "sales", day: "2026-06-05", amount: null, scheduled: false }, // text that wasn't a fraction
        line("shares", "2026-06-06", 100),
      ],
    );
    const result = totalsOf(data, ["sales", "shares"]);
    expect(result.currencies[0].months[0].amountCents).toBe(10000);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { reason: "no-date", accountId: "sales", month: null, lines: 2 },
        { reason: "bad-amount", accountId: "sales", month: "2026-06", lines: 1 },
        { reason: "not-currency", accountId: "shares", month: "2026-06", lines: 1 },
      ]),
    );
    expect(result.skipped).toHaveLength(3);
  });

  it("adds exactly: ten thousand one-cent lines come to exactly a hundred dollars", () => {
    const lines = Array.from({ length: 10000 }, () => line("sales", "2026-07-04", -1));
    const month = totalsOf(book([account("sales")], lines), ["sales"]).currencies[0].months[0];
    expect(month.amountCents).toBe(10000);
    expect(month.rows).toBe(10000);
  });

  it("lists months oldest first and counts the lines in each", () => {
    const data = book(
      [account("sales")],
      [
        line("sales", "2026-09-01", -300),
        line("sales", "2026-01-31", -100),
        line("sales", "2026-01-01", -100),
        line("sales", "2025-12-31", -50),
      ],
    );
    const { currencies } = totalsOf(data, ["sales"]);
    expect(currencies[0].months.map((m) => [m.periodStart, m.amountCents, m.rows])).toEqual([
      ["2025-12-01", 50, 1],
      ["2026-01-01", 200, 2],
      ["2026-09-01", 300, 1],
    ]);
    expect(currencies[0].linesCounted).toBe(4);
  });

  it("refuses to run when a tick isn't an account in this book", () => {
    const data = book([account("sales")], []);
    const result = booksMonthlyTotals(data, ["sales", "gone"], "2026-10-06");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("isn't in this book");
  });

  it("refuses to run when a tick is an account whose direction DotAmi can't tell", () => {
    const data = book(
      [account("odd", { side: null, bookType: "TRADING" })],
      [line("odd", "2026-01-05", -100)],
    );
    const result = booksMonthlyTotals(data, ["odd"], "2026-10-06");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("can't tell which way");
  });

  it("treats the same tick twice as one", () => {
    const data = book([account("sales")], [line("sales", "2026-01-05", -100)]);
    expect(totalsOf(data, ["sales", "sales"]).currencies[0].months[0].amountCents).toBe(100);
  });

  it("refuses a month too large to hold exactly, rather than losing cents", () => {
    const data = book(
      [account("sales")],
      [
        {
          accountId: "sales",
          day: "2026-01-05",
          amount: { num: -(10n ** 20n), den: 1n },
          scheduled: false,
        },
      ],
    );
    const result = booksMonthlyTotals(data, ["sales"], "2026-10-06");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("too large");
  });

  it("refuses when today isn't a real date", () => {
    expect(booksMonthlyTotals(book([], []), [], "yesterday").ok).toBe(false);
  });

  it("puts no amount and no account name in its refusals", () => {
    const secret = account("private-id", { fullName: "Income:Acme Corp invoices", side: null });
    const data = book([secret], [line("private-id", "2026-01-05", -987654)]);
    for (const ticks of [["private-id"], ["missing-id"]]) {
      const result = booksMonthlyTotals(data, ticks, "2026-10-06");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).not.toContain("987654");
        expect(result.error).not.toContain("Acme");
      }
    }
  });
});

describe("splitKnownByCurrency", () => {
  const data = book(
    [account("cad"), account("usd", { currency: "USD" })],
    [
      line("cad", "2026-01-10", -100000),
      line("cad", "2026-02-10", -200000),
      line("usd", "2026-01-10", -100000),
    ],
  );
  const { currencies } = totalsOf(data, ["cad", "usd"]);

  const figure = (over: object) => ({
    kind: "gross-revenue" as const,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    amountCents: 100000,
    currency: "CAD",
    status: "confirmed" as const,
    ...over,
  });

  it("recognises a month already in DotAmi with the same amount and currency", () => {
    const split = splitKnownByCurrency(currencies, [figure({})]);
    expect(split[0].currency).toBe("CAD");
    expect(split[0].known.map((m) => m.periodStart)).toEqual(["2026-01-01"]);
    expect(split[0].fresh.map((m) => m.periodStart)).toEqual(["2026-02-01"]);
    // The US-dollar January has the same amount but a different currency: still fresh.
    expect(split[1].known).toEqual([]);
    expect(split[1].fresh).toHaveLength(1);
  });

  it("treats a different amount for the same month as new, and a retracted figure as unknown", () => {
    const different = splitKnownByCurrency(currencies, [figure({ amountCents: 100001 })]);
    expect(different[0].known).toEqual([]);
    const retracted = splitKnownByCurrency(currencies, [figure({ status: "retracted" })]);
    expect(retracted[0].known).toEqual([]);
  });
});

describe("books code keeps to its privacy rules", () => {
  /** Every .ts file under lib/figures/books. */
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? sources(full) : full.endsWith(".ts") ? [full] : [];
    });
  }
  const files = sources(path.join(process.cwd(), "lib", "figures", "books"));

  /** The code without its comments, so a comment can talk about what the code mustn't do. */
  const code = (file: string) =>
    readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

  it("finds the files it is meant to scan", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it("never logs, never calls the network, never stores anything, never builds a URL", () => {
    for (const file of files) {
      const source = code(file);
      for (const forbidden of [
        /\bconsole\s*\./,
        /\bfetch\s*\(/,
        /XMLHttpRequest/,
        /sendBeacon/,
        /\bWebSocket\b/,
        /localStorage|sessionStorage|indexedDB/,
        /document\s*\.\s*cookie/,
        /\bURLSearchParams\b|\bnew\s+URL\s*\(|\blocation\s*\./,
        /from\s+["'](node:)?(fs|child_process|net|http|https|dgram|dns)["']/,
        /\bprocess\s*\.\s*env\b/,
      ]) {
        expect(source, `${path.basename(file)} matches ${forbidden}`).not.toMatch(forbidden);
      }
    }
  });
});
