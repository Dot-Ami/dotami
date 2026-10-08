/**
 * [8h] DotAmi's own reader for hledger / Ledger journals (lib/figures/books/journal.ts and
 * journal-amount.ts): a journal's bytes in, accounts and posted lines out, monthly totals through
 * the shared books core — and a named refusal, with its line number and never the line's text,
 * for everything it doesn't fully understand. Every journal here is invented: two written by hand
 * (tests/fixtures/journals) and the rest built in code.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { readAmount, readNumber } from "@/lib/figures/books/journal-amount";
import {
  MAX_ACCOUNT_DEPTH,
  readJournal,
  type JournalReadOptions,
  type JournalReadResult,
  type JournalRefusal,
} from "@/lib/figures/books/journal";
import { booksMonthlyTotals } from "@/lib/figures/books/totals";
import type { BookData } from "@/lib/figures/books/types";
import { MAX_FILE_BYTES } from "@/lib/figures/file/types";

const TODAY = "2026-10-08";
const bytes = (s: string) => new TextEncoder().encode(s);
const fixture = (name: string) =>
  readFileSync(path.join(__dirname, "fixtures", "journals", name), "utf8");

/** The book and commodities of a successful read, failing the test if it was refused. */
function read(text: string | Uint8Array, options?: JournalReadOptions) {
  const result = readJournal(typeof text === "string" ? bytes(text) : text, options);
  if (!result.ok) throw new Error(`expected a journal, got: ${result.refusal} on line ${result.line}`);
  return result;
}

/** The refusal of a read, failing the test if the read succeeded. */
function refusal(text: string | Uint8Array, options?: JournalReadOptions) {
  const result = readJournal(typeof text === "string" ? bytes(text) : text, options);
  if (result.ok) throw new Error("expected the journal to be refused");
  return result as Extract<JournalReadResult, { ok: false }>;
}

/** The id of the book account for a journal account in a commodity. */
function idOf(book: BookData, name: string, currency: string | null) {
  const account = book.accounts.find((a) => a.fullName === name && a.currency === currency);
  if (!account) throw new Error(`no account ${name} in ${currency}`);
  return account.id;
}

/** Monthly totals of the ticked accounts, as [currency, periodStart, cents, lines]. */
function monthly(book: BookData, ticked: string[]) {
  const result = booksMonthlyTotals(book, ticked, TODAY);
  if (!result.ok) throw new Error(result.error);
  return {
    months: result.currencies.flatMap((c) =>
      c.months.map((m) => [c.currency, m.periodStart, m.amountCents, m.rows]),
    ),
    skipped: result.skipped.map((s) => [s.reason, s.month, s.lines]),
  };
}

/** A transaction with a revenue line and its bank line, both written out. */
const sale = (day: string, amount: string, other = `-${amount}`) =>
  `${day} sale\n    income:sales  ${other}\n    assets:bank  ${amount}\n`;

describe("the design studio journal (written by hand)", () => {
  let result: ReturnType<typeof read>;
  let book: BookData;
  beforeAll(() => {
    result = read(fixture("design-studio.journal"));
    book = result.book;
  });

  it("lists one account per journal account and commodity, with the type the journal gives or its name implies", () => {
    expect(book.format).toBe("journal");
    expect(
      book.accounts.map((a) => [a.fullName, a.currency, a.bookType, a.side, a.markedAsRevenue]),
    ).toEqual([
      ["assets:bank:chequing", "CAD", "Cash", "debit", false],
      ["assets:bank:chequing", "USD", "Cash", "debit", false],
      ["assets:receivable", "CAD", "Asset", "debit", false],
      ["equity:opening", "CAD", "Equity", "credit", false],
      ["expenses:software", "CAD", "Expense", "debit", false],
      // income:design and income:interest have no type of their own; they inherit "income"'s R.
      ["income:design", "CAD", "Revenue", "credit", true],
      ["income:design", "USD", "Revenue", "credit", true],
      ["income:interest", "CAD", "Revenue", "credit", true],
      ["liabilities:gst-hst", "CAD", "Liability", "credit", false],
    ]);
    expect(result.commodities).toEqual([
      { symbol: "CAD", currency: "CAD", postings: 21 },
      { symbol: "USD", currency: "USD", postings: 2 },
    ]);
  });

  it("works out the one amount a transaction leaves out, exactly", () => {
    const receivable = idOf(book, "assets:receivable", "CAD");
    const lines = book.lines.filter((l) => l.accountId === receivable);
    // Jan 15 invoice, Jan 28 payment (left out, so -1130.00), the October sale.
    expect(lines.map((l) => [l.day, l.amount && Number(l.amount.num) / Number(l.amount.den)])).toEqual([
      ["2026-01-15", 1130],
      ["2026-01-28", -1130],
      ["2026-10-02", 400],
    ]);
  });

  it("adds up the ticked revenue by month, per currency, with a posting's own date and nothing rounded", () => {
    const totals = monthly(book, [
      idOf(book, "income:design", "CAD"),
      idOf(book, "income:design", "USD"),
      idOf(book, "income:interest", "CAD"),
    ]);
    expect(totals.months).toEqual([
      ["CAD", "2026-01-01", 100000, 1],
      // March: the Feb 27 line dated 2026-03-02 by its date: tag (500.00), the refund (-200.00)
      // and the interest the journal left out (1.23).
      ["CAD", "2026-03-01", 30123, 3],
      ["USD", "2026-02-01", 200000, 1],
    ]);
    expect(totals.skipped).toEqual([
      ["not-cents", "2026-03", 1],
      ["not-over", "2026-10", 1],
    ]);
  });

  it("keeps no description, payee, code, note or comment from the journal", () => {
    const kept = JSON.stringify(result, (_k, v) => (typeof v === "bigint" ? String(v) : v));
    for (const words of ["Northwind", "Harbour", "INV-001", "logo", "subscription", "GST/HST collected", "org-mode", "Opening balances"]) {
      expect(kept).not.toContain(words);
    }
    expect(kept).toContain("income:design"); // the positive check first: account names are kept
  });

  it("reads the same with Windows line ends and a byte-order mark", () => {
    const crlf = "\ufeff" + fixture("design-studio.journal").replace(/\r?\n/g, "\r\n");
    expect(crlf.includes("\r\n")).toBe(true);
    const again = read(crlf);
    expect(again.book.accounts).toEqual(book.accounts);
    expect(again.book.lines).toEqual(book.lines);
  });
});

describe("the euro freelancer journal (comma as the decimal mark)", () => {
  it("reads 1.234,56 and 1 000,50 the way its commodity line says, and Revenues by its name", () => {
    const { book, commodities } = read(fixture("euro-freelancer.journal"));
    expect(commodities).toEqual([{ symbol: "EUR", currency: "EUR", postings: 6 }]);
    const revenue = book.accounts.find((a) => a.fullName === "Revenues:Freelance")!;
    expect([revenue.bookType, revenue.side, revenue.markedAsRevenue]).toEqual(["Revenue", "credit", true]);
    expect(monthly(book, [revenue.id]).months).toEqual([
      ["EUR", "2026-04-01", 223506, 2],
      ["EUR", "2026-05-01", 25000, 1],
    ]);
  });
});

describe("amounts", () => {
  const cents = (text: string, mark: "." | "," | null = null) => {
    const r = readAmount(text, () => mark);
    if (!r.ok) return r.problem;
    return [r.commodity, Number(r.amount.num * 100n) / Number(r.amount.den)];
  };

  it.each([
    ["$1", ["$", 100]],
    ["-$1.50", ["$", -150]],
    ["$-1.50", ["$", -150]],
    ["$ -1.50", ["$", -150]],
    ["- $1.50", ["$", -150]],
    ["+ $1.50", ["$", 150]],
    ["1.50 CAD", ["CAD", 150]],
    ["-1.50 CAD", ["CAD", -150]],
    ["1.50CAD", ["CAD", 150]],
    ["CAD 1,234.56", ["CAD", 123456]],
    ["1.234,56 EUR", ["EUR", 123456]],
    ["1 234,56 EUR", ["EUR", 123456]],
    ["1\u00a0234,56 EUR", ["EUR", 123456]],
    ["1\u202f234.56 CAD", ["CAD", 123456]],
    ["1,234,567.89", ["", 123456789]],
    ["10.", ["", 1000]],
    ["0.125", ["", 12.5]],
    ["1234.567", ["", 123456.7]],
    ["1E3 EUR", ["EUR", 100000]],
    ["EUR 1E-2", ["EUR", 1]],
    ['"green apples" 3', ["green apples", 300]],
    ['3 "ABC123"', ["ABC123", 300]],
    ["€5", ["€", 500]],
    ["5 zł", ["zł", 500]],
    ["US$5", ["US$", 500]],
    ["1EUR", ["EUR", 100]],
  ])("reads %s", (text, expected) => {
    expect(cents(text)).toEqual(expected);
  });

  it.each([
    ["1,000"],
    ["1.000"],
    ["$12.500"],
    ["-999,999 EUR"],
  ])("refuses %s as ambiguous when nothing says which mark is the decimal mark", (text) => {
    expect(cents(text)).toBe("ambiguous");
  });

  it("reads 1,000 as a thousand once the decimal mark is the point, and 1.000 as a thousand once it is the comma", () => {
    expect(cents("1,000", ".")).toEqual(["", 100000]);
    expect(cents("1.000", ",")).toEqual(["", 100000]);
    expect(cents("1.5", ",")).toBe("unreadable"); // "." is then a group mark, and "5" isn't a group of three
  });

  it.each([
    [".50"],
    ["1,00,000"],
    ["1,000 000"],
    ["1,,000"],
    ["1.000.000,5.5"],
    ["$1 $"],
    ["CAD 1 USD"],
    ["--1"],
    ["-$-1"],
    ["$"],
    ["1 2 3x"],
    ["🍎 3"],
    ['"" 3'],
    ['"unclosed 3'],
    ['"\u202eDAC" 3'],
    ['"CA\u200bD" 3'],
  ])("refuses %s as unreadable", (text) => {
    expect(cents(text)).toBe("unreadable");
  });

  it("refuses an amount with more digits than any real amount, and a huge exponent", () => {
    expect(cents("1".repeat(31))).toBe("too-long");
    expect(cents("1E19")).toBe("too-long");
    expect(cents("1".repeat(30))).toEqual(["", Number(BigInt("1".repeat(30)) * 100n)]);
  });

  it("keeps a fraction exact rather than as a decimal number", () => {
    const r = readNumber("0.1", null);
    expect(r).toEqual({ ok: true, amount: { num: 1n, den: 10n }, decimal: "." });
  });
});

describe("transactions", () => {
  it("refuses a transaction that doesn't add up to zero, at its first line", () => {
    const r = refusal(`${sale("2026-01-05", "10.00")}\n2026-01-06 off by a cent\n    income:sales  -10.00\n    assets:bank  9.99\n`);
    expect([r.refusal, r.line]).toEqual(["unbalanced", 5]);
  });

  it("refuses two postings without an amount, at the second", () => {
    const r = refusal("2026-01-05 x\n    income:sales  -10.00\n    assets:bank\n    assets:cash\n");
    expect([r.refusal, r.line]).toEqual(["blank-amounts", 4]);
  });

  it("refuses to work out a left-out amount when the rest is in two commodities", () => {
    const r = refusal("2026-01-05 x\n    income:sales  -10.00 CAD\n    income:sales  -10.00 USD\n    assets:bank\n");
    expect([r.refusal, r.line]).toEqual(["blank-amount-mixed", 4]);
  });

  it("works out a left-out amount through a unit cost and a total cost", () => {
    const unit = read("2026-01-05 x\n    assets:usd  10 USD @ 1.35 CAD\n    assets:cad\n");
    const value = (l: { amount: { num: bigint; den: bigint } | null }) =>
      Number(l.amount!.num) / Number(l.amount!.den);
    expect(unit.book.lines.map(value)).toEqual([10, -13.5]);
    const total = read("2026-01-05 x\n    assets:usd  -10 USD @@ 13.50 CAD\n    assets:cad\n");
    expect(value(total.book.lines[1])).toBe(13.5);
    expect(total.commodities.map((c) => c.symbol)).toEqual(["CAD", "USD"]);
  });

  it("refuses a negative cost", () => {
    expect(refusal("2026-01-05 x\n    assets:usd  10 USD @ -1.35 CAD\n    assets:cad\n").refusal).toBe(
      "negative-cost",
    );
  });

  it("skips a balance assertion but refuses a balance assignment", () => {
    for (const assertion of ["= 10.00", "== 10.00", "=* 10.00", "==* 10.00"]) {
      const { book } = read(`2026-01-05 x\n    assets:bank  10.00 ${assertion}\n    income:sales\n`);
      expect(book.lines[0].amount).toEqual({ num: 1000n, den: 100n });
    }
    const r = refusal("2026-01-05 x\n    assets:bank  = 10.00\n    income:sales\n");
    expect([r.refusal, r.line]).toEqual(["balance-assignment", 2]);
  });

  it("reads status marks, codes, secondary dates and dates written with / or .", () => {
    const { book } = read(
      "2026/1/5=1/7 * (A1) x\n    ! income:sales  -1.00\n    * assets:bank  1.00\n2026.12.31 y\n    income:sales  -2.00\n    assets:bank\n",
    );
    expect(book.lines.map((l) => l.day)).toEqual(["2026-01-05", "2026-01-05", "2026-12-31", "2026-12-31"]);
  });

  it("keeps an account name with single spaces and ends it at two spaces or a tab", () => {
    const { book } = read("2026-01-05 x\n    income:web design\t-5.00\n    assets:my bank  5.00\n");
    expect(book.accounts.map((a) => a.fullName)).toEqual(["assets:my bank", "income:web design"]);
  });

  it("reads a transaction with no postings and an empty journal of comments", () => {
    expect(read("2026-01-05 nothing posted\n").book.lines).toEqual([]);
    expect(read("; just a comment\n").book.accounts).toEqual([]);
  });
});

describe("posting dates", () => {
  it("moves a posting by its date: tag, on the same line or on a comment line under it", () => {
    const { book } = read(
      "2026-01-30 x\n    income:sales  -1.00  ; date: 2026-02-02\n    assets:bank  1.00\n    ; date: 2/3\n",
    );
    expect(book.lines.map((l) => l.day)).toEqual(["2026-02-02", "2026-02-03"]);
  });

  it("skips a date2: tag, like the transaction's own secondary date", () => {
    const { book } = read("2026-01-30 x\n    income:sales  -1.00  ; date2: 2026-02-02\n    assets:bank  1.00\n");
    expect(book.lines[0].day).toBe("2026-01-30");
  });

  it.each<[string, string, JournalRefusal, number]>([
    ["a date: tag on the transaction's line", "2026-01-30 x  ; date: 2026-02-02\n    income:sales  -1.00\n    assets:bank  1.00\n", "transaction-date-tag", 1],
    ["a date: tag under the transaction line, before any posting", "2026-01-30 x\n    ; date: 2026-02-02\n    income:sales  -1.00\n    assets:bank  1.00\n", "transaction-date-tag", 2],
    ["two date: tags on one posting", "2026-01-30 x\n    income:sales  -1.00  ; date: 2026-02-02\n    ; date: 2026-02-03\n    assets:bank  1.00\n", "posting-date-twice", 3],
    ["a date: tag that isn't a day", "2026-01-30 x\n    income:sales  -1.00  ; date: soon\n    assets:bank  1.00\n", "bad-date", 2],
    ["Date: in capitals", "2026-01-30 x\n    income:sales  -1.00  ; Date: 2026-02-02\n    assets:bank  1.00\n", "unclear-tag", 2],
    ["a Ledger-style [date]", "2026-01-30 x\n    income:sales  -1.00  ; [2026-02-02]\n    assets:bank  1.00\n", "bracketed-posting-date", 2],
    ["a Ledger-style [=date]", "2026-01-30 x\n    income:sales  -1.00\n    ; [=2026/02/02]\n    assets:bank  1.00\n", "bracketed-posting-date", 3],
  ])("refuses %s", (_name, text, kind, line) => {
    const r = refusal(text);
    expect([r.refusal, r.line]).toEqual([kind, line]);
  });
});

describe("account types", () => {
  it("lets a child inherit its nearest declared parent's type, and falls back to the name", () => {
    const { book } = read(
      "account Ingresos  ; type: Revenue\naccount biz:sales\n    ; just a note\n" +
        "account biz  ; type: R\n" +
        sale("2026-01-05", "1.00").replace("income:sales", "Ingresos:ventas") +
        sale("2026-01-06", "1.00").replace("income:sales", "biz:sales:online") +
        sale("2026-01-07", "1.00").replace("income:sales", "Revenue:x") +
        sale("2026-01-08", "1.00").replace("income:sales", "misc:other"),
    );
    const types = Object.fromEntries(book.accounts.map((a) => [a.fullName, [a.bookType, a.side]]));
    expect(types).toEqual({
      "Ingresos:ventas": ["Revenue", "credit"],
      "biz:sales:online": ["Revenue", "credit"],
      "Revenue:x": ["Revenue", "credit"],
      "misc:other": ["", null],
      "assets:bank": ["Asset", "debit"],
    });
  });

  it("can't add up an account whose type it can't tell", () => {
    const { book } = read(sale("2026-01-05", "1.00").replace("income:sales", "misc:other"));
    const result = booksMonthlyTotals(book, [idOf(book, "misc:other", null)], TODAY);
    expect(result.ok).toBe(false);
  });

  it("treats equity:conversion as having no side", () => {
    const { book } = read(sale("2026-01-05", "1.00").replace("income:sales", "equity:conversion"));
    expect(book.accounts[1]).toMatchObject({ bookType: "Conversion", side: null });
  });

  it("ignores a type: tag in a posting's comment, in any case", () => {
    const { book } = read("2026-01-05 x\n    misc:other  -1.00  ; Type: R\n    assets:bank  1.00\n");
    expect(book.accounts.find((a) => a.fullName === "misc:other")!.side).toBeNull();
  });

  it.each<[string, string, JournalRefusal, number]>([
    ["an unknown type", "account income:x  ; type: Z\n", "account-type", 1],
    ["a type written with capitals", "account income:x  ; Type: R\n", "unclear-tag", 1],
    ["a second, different type", "account income:x  ; type: R\naccount income:x\n    ; type: X\n", "account-type-conflict", 3],
    ["a date: tag on an account", "account income:x  ; date: 2026-01-01\n", "transaction-date-tag", 1],
    ["an alias under an account", "account income:x\n    alias sales\n", "subdirective", 2],
  ])("refuses %s", (_name, text, kind, line) => {
    const r = refusal(text);
    expect([r.refusal, r.line]).toEqual([kind, line]);
  });

  it("reads a note under an account and the same type twice", () => {
    expect(read("account income:x  ; type: R\n    note sales\naccount income:x  ; type: Revenue\n").ok).toBe(true);
  });
});

describe("commodities and currencies", () => {
  it("counts $ as a currency only when the person says which one it is", () => {
    const text = sale("2026-01-05", "$10.00", "$-10.00");
    const plain = read(text);
    expect(plain.commodities).toEqual([{ symbol: "$", currency: null, postings: 2 }]);
    const sales = plain.book.accounts.find((a) => a.fullName === "income:sales")!;
    expect(monthly(plain.book, [sales.id]).skipped).toEqual([["not-currency", "2026-01", 1]]);

    const told = read(text, { currencyOf: { $: "CAD" } });
    const toldSales = told.book.accounts.find((a) => a.fullName === "income:sales")!;
    expect(monthly(told.book, [toldSales.id]).months).toEqual([["CAD", "2026-01-01", 1000, 1]]);
  });

  it("takes bare numbers as a currency only when told, and never a commodity that isn't a code", () => {
    const told = read(sale("2026-01-05", "10.00") + sale("2026-01-06", "3 AAPL", "-3 AAPL"), {
      currencyOf: { "": "CAD" },
    });
    expect(told.commodities).toEqual([
      { symbol: "", currency: "CAD", postings: 2 },
      { symbol: "AAPL", currency: null, postings: 2 },
    ]);
  });

  it("refuses a currency that isn't a code, and a code told it is another code", () => {
    expect(refusal("", { currencyOf: { $: "XYZ" } }).refusal).toBe("empty");
    expect(refusal("; x\n", { currencyOf: { $: "XYZ" } }).refusal).toBe("bad-option");
    expect(refusal("; x\n", { currencyOf: { $: "cad" } }).refusal).toBe("bad-option");
    expect(refusal("; x\n", { currencyOf: { USD: "CAD" } }).refusal).toBe("bad-option");
  });

  it("settles 1,000 with a decimal-mark line, from that line on", () => {
    const after = read("decimal-mark .\n" + sale("2026-01-05", "1,000"));
    expect(after.book.lines[0].amount).toEqual({ num: -1000n, den: 1n });
    const before = refusal(sale("2026-01-05", "1,000") + "decimal-mark .\n");
    expect([before.refusal, before.line]).toEqual(["ambiguous-amount", 2]);
    expect(before.error).toContain('"decimal-mark ."');
  });

  it("settles 1.000 with a commodity line for that commodity only", () => {
    const head = "commodity 1.000,00 EUR\n";
    expect(read(head + sale("2026-01-05", "1.000 EUR", "-1.000 EUR")).book.lines[1].amount).toEqual({
      num: 1000n,
      den: 1n,
    });
    expect(refusal(head + sale("2026-01-05", "$1.000", "$-1.000")).refusal).toBe("ambiguous-amount");
  });

  it("reads a format line under a commodity, and a commodity with no sample", () => {
    expect(read('commodity "green apples"\ncommodity CAD\n    format CAD 1,000.00\n    note dollars\n' + sale("2026-01-05", "CAD 1,000", "CAD -1,000")).ok).toBe(true);
  });

  it.each<[string, string, JournalRefusal, number]>([
    ["an ambiguous sample", "commodity $1,000\n", "commodity-sample", 1],
    ["a sample that isn't an amount", "commodity $1,000.00.00\n", "commodity-sample", 1],
    ["a second, different decimal mark", "commodity $1,000.00\ncommodity $1.000,00\n", "commodity-conflict", 2],
    ["a format for another commodity", "commodity CAD\n    format USD 1,000.00\n", "commodity-sample", 2],
    ["an alias under a commodity", "commodity CAD\n    alias C$\n", "subdirective", 2],
    ["a decimal-mark that isn't . or ,", "decimal-mark ;\n", "decimal-mark", 1],
  ])("refuses %s", (_name, text, kind, line) => {
    const r = refusal(text);
    expect([r.refusal, r.line]).toEqual([kind, line]);
  });
});

describe("what it refuses, by name and line, never quoting the line", () => {
  // Every case puts the made-up word "Zorblax" on the refused line; no refusal may repeat it.
  const cases: [string, string, JournalRefusal, number][] = [
    ["an include", "; ok\ninclude Zorblax.journal\n", "include", 2],
    ["a periodic transaction", "~ monthly  Zorblax\n    income:x  -1\n    assets:y\n", "periodic-transaction", 1],
    ["an automated posting rule", "= Zorblax\n    (budget)  *-1\n", "auto-posting", 1],
    ["a value expression", "2026-01-05 x\n    income:Zorblax  ($10 / 3)\n    assets:bank\n", "value-expression", 2],
    ["a cost expression", "2026-01-05 x\n    assets:Zorblax  10 X @ ($1 / 3)\n    assets:bank\n", "value-expression", 2],
    ["a lot price", "2026-01-05 x\n    assets:Zorblax  10 X {$1.00}\n    assets:bank  $-10.00\n", "lot-annotation", 2],
    ["a lot date", "2026-01-05 x\n    assets:Zorblax  10 X [2026-01-01]\n    assets:bank  $-10.00\n", "lot-annotation", 2],
    ["a virtual posting", "2026-01-05 x\n    (budget:Zorblax)  -1\n", "virtual-posting", 2],
    ["a balanced virtual posting", "2026-01-05 x\n    [budget:Zorblax]  -1\n    [assets]  1\n", "virtual-posting", 2],
    ["an alias", "alias Zorblax = income\n", "alias", 1],
    ["end aliases", "end aliases\n", "alias", 1],
    ["apply account", "apply account Zorblax\n", "apply-account", 1],
    ["end apply account", "end apply account\n", "apply-account", 1],
    ["a D default commodity", "D $1,000.00 Zorblax\n", "default-commodity", 1],
    ["a Y default year", "Y 2026 Zorblax\n", "default-year", 1],
    ["a year default year", "year 2026\n", "default-year", 1],
    ["apply year", "apply year 2026\n", "default-year", 1],
    ["an unknown directive", "Zorblax something\n", "unknown-directive", 1],
    ["a timeclock line", "i 2026-01-05 08:00:00 Zorblax\n", "unknown-directive", 1],
    ["a % comment (Ledger only)", "% Zorblax\n", "unknown-directive", 1],
    ["a stray indented line", "; top\n    income:Zorblax  1\n", "stray-indent", 2],
    ["an indented line after a P directive", "P 2026-01-01 USD CAD 1.35\n    Zorblax\n", "stray-indent", 2],
    ["an indented # line in a transaction", "2026-01-05 x\n    # Zorblax\n", "unknown-line", 2],
    ["a date without a year", "1/5 Zorblax\n    income:x  -1\n    assets:y\n", "date-without-year", 1],
    ["a date that isn't a day", "2026-02-30 Zorblax\n", "bad-date", 1],
    ["mixed date separators", "2026-02/03 Zorblax\n", "bad-date", 1],
    ["a date run into its description", "2026-02-03Zorblax\n", "bad-date", 1],
    ["a bad secondary date", "2026-02-03=2026-13-01 Zorblax\n", "bad-date", 1],
    ["an ambiguous amount", "2026-01-05 x\n    income:Zorblax  -1,000\n    assets:y\n", "ambiguous-amount", 2],
    ["an unreadable amount", "2026-01-05 x\n    income:Zorblax  -1..0\n    assets:y\n", "bad-amount", 2],
    ["an over-long amount", `2026-01-05 x\n    income:Zorblax  ${"9".repeat(40)}\n    assets:y\n`, "amount-too-long", 2],
    ["a semicolon in an account name", "2026-01-05 x\n    income:sales ;Zorblax\n    assets:y  1\n", "account-name", 2],
    ["a no-break space in an account name", "2026-01-05 x\n    income:\u00a0Zorblax  -1\n    assets:y\n", "account-name", 2],
    ["a text-direction override in an account name", "2026-01-05 x\n    income:\u202eZorblax  -1\n    assets:y\n", "account-name", 2],
    ["a zero-width space in an account name", "2026-01-05 x\n    income:Zor\u200bblax  -1\n    assets:y\n", "account-name", 2],
    ["a line separator in an account name", "2026-01-05 x\n    income:\u2028Zorblax  -1\n    assets:y\n", "account-name", 2],
    ["a control character", "; fine\n2026-01-05 Zorblax\u0007\n", "control-character", 2],
    ["a lone carriage return", "; fine\r; Zorblax\n", "control-character", 1],
  ];
  for (const keyword of ["assert", "bucket", "A", "capture", "check", "define", "eval", "expr", "python", "value", "test"]) {
    cases.push([`the Ledger directive ${keyword}`, `; ok\n${keyword} Zorblax\n`, "ledger-directive", 2]);
  }
  cases.push(["apply fixed", "apply fixed Zorblax 1.35\n", "ledger-directive", 1]);
  cases.push(["apply tag", "apply tag Zorblax\n", "ledger-directive", 1]);
  cases.push(["a command-line option", "--input-date-format Zorblax\n", "ledger-directive", 1]);

  it.each(cases)("refuses %s", (_name, text, kind, line) => {
    const r = refusal(text);
    expect([r.refusal, r.line]).toEqual([kind, line]);
    expect(r.error).toMatch(new RegExp(`^Line ${line} of the journal `));
    expect(r.error).toContain("DotAmi won't guess, so it read nothing.");
    expect(r.error).not.toContain("Zorblax");
  });

  it("names the Ledger directive from its own list", () => {
    expect(refusal("bucket Assets:Zorblax\n").error).toContain('("bucket")');
    expect(refusal("apply tag x\n").error).toContain('("apply tag")');
  });

  it("refuses a journal whose bad line comes after thousands of good ones, at that line", () => {
    const good = Array.from({ length: 5000 }, (_, i) => sale(`2026-01-${String((i % 28) + 1).padStart(2, "0")}`, "1.00")).join("");
    const r = refusal(good + "include more.journal\n");
    expect([r.refusal, r.line]).toEqual(["include", 5000 * 3 + 1]);
  });
});

describe("the file as a whole", () => {
  it("refuses an empty file, one over 10 MB, a binary file and text that isn't UTF-8", () => {
    expect(refusal(new Uint8Array()).refusal).toBe("empty");
    expect(refusal(new Uint8Array(MAX_FILE_BYTES + 1).fill(0x3b)).refusal).toBe("too-big");
    expect(refusal(bytes("SQLite format 3\u0000")).refusal).toBe("not-text");
    expect(refusal(new Uint8Array([0x3b, 0x20, 0xff, 0xfe, 0x0a])).refusal).toBe("not-utf8");
    for (const r of [refusal(new Uint8Array()), refusal(bytes("SQLite format 3\u0000"))]) {
      expect(r.line).toBeNull();
      expect(r.error.length).toBeGreaterThan(10);
    }
  });

  it("reads a comment block that runs to the end of the file", () => {
    expect(read(sale("2026-01-05", "1.00") + "comment\ninclude x\n~ monthly\n").book.lines).toHaveLength(2);
  });

  it("reads unusual but ordinary unicode in names and commodities, and keeps names exactly as written", () => {
    const nfc = "income:café ☕:日本";
    const nfd = "income:café ☕:日本";
    const { book, commodities } = read(
      `2026-01-05 x\n    ${nfc}  -5 zł\n    assets:bank  5 zł\n2026-01-06 y\n    ${nfd}  "🍎 apples" -2\n    assets:bank  "🍎 apples" 2\n`,
    );
    expect(book.accounts.map((a) => a.fullName)).toEqual(["assets:bank", "assets:bank", nfd, nfc]);
    expect(commodities.map((c) => c.symbol)).toEqual(["zł", "🍎 apples"]);
  });

  it("reads a deep account tree to the limit and refuses one past it", () => {
    const deep = (levels: number) =>
      ["income", ...Array.from({ length: levels - 1 }, (_, i) => `l${i}`)].join(":");
    const ok = read(sale("2026-01-05", "1.00").replace("income:sales", deep(MAX_ACCOUNT_DEPTH)));
    expect(ok.book.accounts.find((a) => a.fullName.startsWith("income:"))!.side).toBe("credit");
    const r = refusal(sale("2026-01-05", "1.00").replace("income:sales", deep(MAX_ACCOUNT_DEPTH + 1)));
    expect([r.refusal, r.line]).toEqual(["account-too-deep", 2]);
  });

  it("reads a journal just under 10 MB and adds it up exactly", () => {
    // 60 000 sales of $12.34 spread over 2025's months: big, but a size a real journal reaches.
    const parts: string[] = ["decimal-mark .\n"];
    let size = 0;
    let count = 0;
    while (size < MAX_FILE_BYTES - 400) {
      const month = String((count % 12) + 1).padStart(2, "0");
      const chunk = `2025-${month}-15 sale number ${count}\n    income:sales  CAD -12.34\n    assets:bank:chequing  CAD 12.34\n`;
      if (size + chunk.length > MAX_FILE_BYTES - 400) break;
      parts.push(chunk);
      size += chunk.length;
      count += 1;
    }
    const text = parts.join("");
    expect(text.length).toBeLessThanOrEqual(MAX_FILE_BYTES);
    const started = performance.now();
    const { book } = read(text);
    const totals = monthly(book, [idOf(book, "income:sales", "CAD")]);
    expect(performance.now() - started).toBeLessThan(15000);
    const perMonth = (m: number) => Math.floor(count / 12) + (m < count % 12 ? 1 : 0);
    expect(totals.months).toEqual(
      Array.from({ length: 12 }, (_, m) => [
        "CAD",
        `2025-${String(m + 1).padStart(2, "0")}-01`,
        1234 * perMonth(m),
        perMonth(m),
      ]),
    );
  }, 30000);
});

describe("never throws, never quotes", () => {
  /** A small deterministic random number generator, so a failure can be replayed. */
  function random(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
  }

  it("answers every damaged copy of a real journal with a book or a sentence that doesn't quote it", () => {
    const original = fixture("design-studio.journal").replace(/Northwind/g, "Zorblax");
    const rand = random(20261008);
    const pieces = ["Zorblax", "(", ")", "{", "[", "=", "@", ";", "~", "  ", "\t", ",", ".", "-", "\n", "1", "\u00a0", "\r", "include", "date: x"];
    for (let i = 0; i < 400; i += 1) {
      let text = original;
      for (let k = 0; k < 3; k += 1) {
        const at = Math.floor(rand() * text.length);
        const piece = pieces[Math.floor(rand() * pieces.length)];
        text = rand() < 0.5 ? text.slice(0, at) + piece + text.slice(at) : text.slice(0, at) + text.slice(at + 1 + Math.floor(rand() * 4));
      }
      const result = readJournal(bytes(text));
      if (!result.ok) {
        expect(result.error).not.toContain("Zorblax");
        expect(result.refusal).not.toBe("reader-fault");
      }
    }
  });
});
