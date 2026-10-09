/**
 * [8h] The GnuCash XML reader (lib/figures/books/gnucash-xml.ts): a book's bytes in, accounts and
 * posted lines out — and a plain refusal for everything it doesn't fully understand. The books are
 * invented: a hand-written one (GOLDEN_BOOK_XML) and ones built in code (tests/helpers/make-gnucash).
 */
import { gzipSync, strToU8 } from "fflate";
import { beforeAll, describe, expect, it } from "vitest";
import {
  gnuCashDay,
  KNOWN_GNUCASH_FEATURES,
  looksLikeGnuCash,
  readGnuCashBook,
} from "@/lib/figures/books/gnucash-xml";
import { booksMonthlyTotals } from "@/lib/figures/books/totals";
import type { BookData } from "@/lib/figures/books/types";
import { MAX_BOOK_BYTES } from "@/lib/figures/books/detect";
import { MAX_FILE_BYTES } from "@/lib/figures/file/types";
import {
  GOLDEN_BOOK_XML,
  gnucashGz,
  gnucashXml,
  gncOpenTag,
  smallBook,
} from "./helpers/make-gnucash";

const text = (s: string) => new TextEncoder().encode(s);

/** The book of a successful read, failing the test if the read was refused. */
function bookOf(bytes: Uint8Array): BookData {
  const result = readGnuCashBook(bytes);
  if (!result.ok) throw new Error(`expected a book, got a refusal: ${result.error}`);
  return result.book;
}

/** The refusal sentence, failing the test if the read succeeded. */
function refusalOf(bytes: Uint8Array, maxUnpackedBytes?: number): string {
  const result = readGnuCashBook(bytes, maxUnpackedBytes);
  if (result.ok) throw new Error("expected the read to be refused");
  return result.error;
}

/** Ids by full name, for ticking accounts the way the person would. */
const idsByName = (book: BookData) => new Map(book.accounts.map((a) => [a.fullName, a.id]));

describe("the hand-written book", () => {
  // Read once for the whole group, but inside beforeAll so a refusal fails these tests by name
  // instead of stopping the whole file from loading.
  let book: BookData;
  beforeAll(() => {
    book = bookOf(text(GOLDEN_BOOK_XML));
  });

  it("lists every account to choose from, in order, without the book's invisible root or the template accounts", () => {
    expect(book.format).toBe("gnucash-xml");
    expect(
      book.accounts.map((a) => [a.fullName, a.bookType, a.side, a.currency, a.markedAsRevenue]),
    ).toEqual([
      ["Assets", "ASSET", "debit", "CAD", false],
      ["Assets:Chequing", "BANK", "debit", "CAD", false],
      ["Expenses", "EXPENSE", "debit", "CAD", false],
      ["Income", "INCOME", "credit", "CAD", true],
      ["Income:Consulting & Design", "INCOME", "credit", "CAD", true],
      ["Income:Interest", "INCOME", "credit", "CAD", true],
    ]);
  });

  it("reads every posted line, and marks the scheduled one", () => {
    expect(book.lines).toHaveLength(13); // 6 transactions x 2 splits, plus the scheduled retainer
    const scheduled = book.lines.filter((l) => l.scheduled);
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].amount).toEqual({ num: -50000n, den: 100n });
    // The posted day is the day as written: GnuCash's neutral 10:59 UTC stamp.
    expect(book.lines[0].day).toBe("2026-01-15");
  });

  it("adds up to the right months once Consulting and Interest are ticked", () => {
    const ids = idsByName(book);
    const ticked = [ids.get("Income:Consulting & Design")!, ids.get("Income:Interest")!];
    const result = booksMonthlyTotals(book, ticked, "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies).toEqual([
      {
        currency: "CAD",
        linesCounted: 4,
        months: [
          // January: one invoice.
          { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 120000, rows: 1 },
          // February: an invoice of 2,500.00, a refund of 300.00 and 12.34 of interest.
          {
            periodStart: "2026-02-01",
            periodEnd: "2026-02-28",
            amountCents: 250000 - 30000 + 1234,
            rows: 3,
          },
        ],
      },
    ]);
    // October's invoice is dated ahead of today, and the retainer is only scheduled.
    expect(result.skipped).toEqual([
      {
        reason: "not-over",
        accountId: ids.get("Income:Consulting & Design"),
        month: "2026-10",
        lines: 1,
      },
    ]);
    // The scheduled retainer points (through the template account) at nothing the person ticked.
    expect(result.scheduledLines).toBe(1);
  });

  it("reads the same whether the file is plain XML or gzip-compressed, as GnuCash saves it", () => {
    expect(bookOf(gnucashGz(GOLDEN_BOOK_XML))).toEqual(book);
  });

  it("adds a bank account up as it is written: money in is positive", () => {
    const ids = idsByName(book);
    const result = booksMonthlyTotals(book, [ids.get("Assets:Chequing")!], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    // January +1,200.00; February +2,500.00 -300.00 +12.34; March -40.00 (hosting).
    expect(result.currencies[0].months.map((m) => m.amountCents)).toEqual([120000, 221234, -4000]);
  });

  it("does not change the bytes it was given", () => {
    const bytes = text(GOLDEN_BOOK_XML);
    const before = Array.from(bytes);
    readGnuCashBook(bytes);
    expect(Array.from(bytes)).toEqual(before);
  });
});

describe("what a line means", () => {
  /** One sale of `amount` ("num/denom"): money into the bank, income credited. `value` is what the transaction's own currency says. */
  const sale = (amount: string, value?: string) =>
    gnucashXml(
      smallBook({
        transactions: [
          {
            date: "2026-03-05",
            splits: [
              { account: "bank", quantity: amount, value },
              { account: "sales", quantity: `-${amount}`, value: value ? `-${value}` : undefined },
            ],
          },
        ],
      }),
    );

  it("reads exact cents from any denominator GnuCash uses", () => {
    const book = bookOf(text(sale("12500/100")));
    const line = book.lines.find((l) => l.amount && l.amount.num === -12500n);
    expect(line?.amount).toEqual({ num: -12500n, den: 100n });
    const thousand = bookOf(text(sale("125000/1000")));
    const result = booksMonthlyTotals(
      thousand,
      [thousand.accounts.find((a) => a.fullName === "Income:Sales")!.id],
      "2026-10-06",
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies[0].months[0].amountCents).toBe(12500);
  });

  it("uses the quantity in the account's own currency, not the transaction's value", () => {
    // A US-dollar sale booked in a CAD income account: the value says 100.00 (USD), the
    // quantity (what lands in the CAD account) says 135.00.
    const book = bookOf(text(sale("13500/100", "10000/100")));
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies[0].months[0].amountCents).toBe(13500);
  });

  it("leaves out an amount that isn't whole cents rather than rounding it", () => {
    const book = bookOf(text(sale("12505/1000")));
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies).toEqual([]);
    expect(result.skipped).toEqual([
      { reason: "not-cents", accountId: id, month: "2026-03", lines: 1 },
    ]);
  });

  it("keeps each currency's income in its own list", () => {
    const xml = gnucashXml(
      smallBook({
        transactions: [
          {
            date: "2026-03-05",
            splits: [
              { account: "bank", quantity: "10000/100" },
              { account: "sales", quantity: "-10000/100" },
            ],
          },
          {
            date: "2026-03-06",
            splits: [
              { account: "bank", quantity: "5000/100" },
              { account: "usd", quantity: "-5000/100" },
            ],
          },
        ],
      }),
    );
    const book = bookOf(text(xml));
    const ticked = book.accounts
      .filter((a) => a.bookType === "INCOME" && a.fullName !== "Income")
      .map((a) => a.id);
    const result = booksMonthlyTotals(book, ticked, "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies.map((c) => [c.currency, c.months[0].amountCents])).toEqual([
      ["CAD", 10000],
      ["USD", 5000],
    ]);
  });

  it("treats an account in a commodity that isn't a currency as one DotAmi can't add up", () => {
    const xml = gnucashXml({
      accounts: [
        { key: "gains", name: "Gains", type: "INCOME", commodity: { space: "NASDAQ", id: "ACME" } },
      ],
      transactions: [{ date: "2026-03-05", splits: [{ account: "gains", quantity: "-100/1" }] }],
    });
    const book = bookOf(text(xml));
    expect(book.accounts[0].currency).toBeNull();
    const result = booksMonthlyTotals(book, [book.accounts[0].id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies).toEqual([]);
    expect(result.skipped[0].reason).toBe("not-currency");
  });

  it("takes the old ISO4217 name for a currency as a currency too", () => {
    const xml = gnucashXml({
      accounts: [
        { key: "old", name: "Old", type: "INCOME", commodity: { space: "ISO4217", id: "EUR" } },
      ],
      transactions: [],
    });
    expect(bookOf(text(xml)).accounts[0].currency).toBe("EUR");
  });

  it("reads the day as written, whatever the time of day and offset beside it", () => {
    expect(gnuCashDay("2026-03-05 10:59:00 +0000")).toBe("2026-03-05"); // GnuCash's neutral time
    expect(gnuCashDay("2026-03-31 23:30:00 -0500")).toBe("2026-03-31"); // an older book's local stamp: not moved to April
    expect(gnuCashDay("2026-04-01 00:15:00 +0200")).toBe("2026-04-01");
    expect(gnuCashDay("2028-02-29 10:59:00 +0000")).toBe("2028-02-29");
  });

  it("refuses a date that isn't exactly GnuCash's shape, or isn't a real day", () => {
    for (const bad of [
      "",
      "2026-03-05",
      "2026-03-05T10:59:00Z",
      "2026-02-30 10:59:00 +0000",
      "2026-13-01 10:59:00 +0000",
      "26-03-05 10:59:00 +0000",
      "2026-03-05 10:59 +0000",
    ]) {
      expect(gnuCashDay(bad), bad).toBeNull();
    }
  });

  it("leaves a line with an unreadable date out of the totals and says so", () => {
    const xml = sale("12500/100").replace("2026-03-05 10:59:00 +0000", "someday");
    const book = bookOf(text(xml));
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.skipped).toEqual([{ reason: "no-date", accountId: id, month: null, lines: 1 }]);
  });

  it("leaves a line whose amount is not a fraction out of the totals and says so", () => {
    const xml = sale("12500/100").replace(
      "<split:quantity>-12500/100</split:quantity>",
      "<split:quantity>lots</split:quantity>",
    );
    const book = bookOf(text(xml));
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.skipped).toEqual([
      { reason: "bad-amount", accountId: id, month: "2026-03", lines: 1 },
    ]);
  });
});

describe("scheduled transactions are never counted", () => {
  // Real GnuCash points a template split at a template account. This book is nastier: the
  // scheduled split points straight at the REAL income account, as a damaged or foreign file might.
  const xml = gnucashXml(
    smallBook({
      transactions: [
        {
          date: "2026-02-10",
          splits: [
            { account: "bank", quantity: "250000/100" },
            { account: "sales", quantity: "-250000/100" },
          ],
        },
      ],
      templateTransactions: [
        {
          date: "2026-02-01",
          description: "Monthly retainer",
          splits: [{ account: "sales", quantity: "-50000/100" }],
        },
      ],
    }),
  );

  it("marks every line in gnc:template-transactions as scheduled, whatever account it names", () => {
    const book = bookOf(text(xml));
    expect(book.lines.map((l) => l.scheduled)).toEqual([false, false, true]);
  });

  it("leaves the scheduled line out of the month, so February is the one invoice and not two", () => {
    const book = bookOf(text(xml));
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-10-06");
    if (!result.ok) throw new Error(result.error);
    expect(result.currencies[0].months).toEqual([
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 250000, rows: 1 },
    ]);
    expect(result.skipped).toEqual([
      { reason: "scheduled", accountId: id, month: "2026-02", lines: 1 },
    ]);
  });

  it("does not offer a template account to tick", () => {
    const book = bookOf(text(GOLDEN_BOOK_XML));
    expect(book.accounts.some((a) => a.fullName.includes("e0000000"))).toBe(false);
    expect(book.accounts.some((a) => a.fullName.includes("Template"))).toBe(false);
  });
});

describe("features and versions: a book it doesn't fully understand is refused", () => {
  it("accepts every feature GnuCash 5 knows, and the one it quietly drops", () => {
    expect(KNOWN_GNUCASH_FEATURES).toHaveLength(11);
    const xml = gnucashXml(smallBook({ features: [...KNOWN_GNUCASH_FEATURES] }));
    expect(readGnuCashBook(text(xml)).ok).toBe(true);
  });

  it("refuses a feature it doesn't know, naming it, the way GnuCash itself does", () => {
    const xml = gnucashXml(smallBook({ features: ["Credit Notes", "Quantum Ledger Mode"] }));
    const error = refusalOf(text(xml));
    expect(error).toContain('"Quantum Ledger Mode"');
    expect(error).toContain("newer GnuCash");
    expect(error).not.toContain("Credit Notes");
  });

  it("names a few unknown features and counts the rest", () => {
    const xml = gnucashXml(smallBook({ features: ["F1", "F2", "F3", "F4", "F5"] }));
    expect(refusalOf(text(xml))).toContain('"F1", "F2", "F3" and 2 more');
  });

  it("is exact about a feature's name: a near miss is not the known feature", () => {
    for (const near of ["credit notes", "Credit Notes ", "Credit  Notes", "Credit Note"]) {
      const xml = gnucashXml(smallBook({ features: [near] }));
      expect(readGnuCashBook(text(xml)).ok, JSON.stringify(near)).toBe(false);
    }
  });

  it("cleans a feature's name before showing it", () => {
    const long = `Strange\u0007 name ${"x".repeat(200)}`;
    const error = refusalOf(text(gnucashXml(smallBook({ features: [long] }))));
    expect(error).not.toMatch(/\u0007/);
    expect(error).toContain("…");
    expect(error.length).toBeLessThan(400);
  });

  it("refuses a newer version on the book, an account, a transaction or a commodity", () => {
    const base = gnucashXml(
      smallBook({
        transactions: [
          {
            date: "2026-03-05",
            splits: [
              { account: "bank", quantity: "1/1" },
              { account: "sales", quantity: "-1/1" },
            ],
          },
        ],
      }),
    );
    const bump = (element: string) =>
      base.replace(`<${element} version="2.0.0">`, `<${element} version="2.1.0">`);
    for (const element of ["gnc:book", "gnc:account", "gnc:transaction", "gnc:commodity"]) {
      const changed = bump(element);
      expect(changed).not.toBe(base);
      expect(refusalOf(text(changed)), element).toContain("newer file version");
    }
  });

  it("refuses a book, account or transaction with no version at all", () => {
    const base = gnucashXml(smallBook());
    const error = refusalOf(text(base.replace('<gnc:book version="2.0.0">', "<gnc:book>")));
    expect(error).toContain("newer file version");
  });

  it("refuses an account type it doesn't know, naming it", () => {
    const xml = gnucashXml({
      accounts: [{ key: "x", name: "X", type: "HOLOGRAM" }],
      transactions: [],
    });
    expect(refusalOf(text(xml))).toContain('"HOLOGRAM"');
  });

  it("does not take a built-in JavaScript property name for an account type", () => {
    for (const type of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const xml = gnucashXml({ accounts: [{ key: "x", name: "X", type }], transactions: [] });
      expect(refusalOf(text(xml)), type).toContain("account type DotAmi doesn't know");
    }
  });

  it("refuses when GnuCash's own addresses aren't the ones the file's prefixes stand for", () => {
    const base = gnucashXml(smallBook());
    expect(
      refusalOf(
        text(
          base.replace(
            'xmlns:act="http://www.gnucash.org/XML/act"',
            'xmlns:act="http://example.com/act"',
          ),
        ),
      ),
    ).toContain("doesn't look like a GnuCash book");
    expect(
      refusalOf(text(base.replace('     xmlns:trn="http://www.gnucash.org/XML/trn"\n', ""))),
    ).toContain("doesn't look like a GnuCash book");
  });
});

describe("inputs that aren't a readable book", () => {
  it("refuses an empty file and a file over 50 MB without looking inside", () => {
    expect(refusalOf(new Uint8Array())).toBe("That file is empty.");
    // A book has a limit of its own, above a spreadsheet's (the maintainer's decision, 2026-10-07).
    expect(refusalOf(new Uint8Array(MAX_BOOK_BYTES + 1))).toBe(
      "That GnuCash book is over 50 MB, more than DotAmi reads.",
    );
  });

  it("reads a book bigger than a spreadsheet may be (over 10 MB, under 50 MB), plain or compressed", () => {
    // About 12,000 invented sales of $10.01: roughly 13 MB of XML, past the 10 MB spreadsheet limit.
    const transactions = Array.from({ length: 12_000 }, (_, i) => ({
      date: `2025-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      splits: [
        { account: "bank", quantity: "1001/100" },
        { account: "sales", quantity: "-1001/100" },
      ],
    }));
    const xml = gnucashXml(smallBook({ transactions }));
    const plain = text(xml);
    expect(plain.length).toBeGreaterThan(MAX_FILE_BYTES);
    expect(plain.length).toBeLessThan(MAX_BOOK_BYTES);
    for (const bytes of [plain, gnucashGz(xml)]) {
      const book = bookOf(bytes);
      const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
      const result = booksMonthlyTotals(book, [id], "2026-10-08");
      if (!result.ok) throw new Error(result.error);
      expect(result.currencies[0].linesCounted).toBe(12_000);
      expect(result.currencies[0].months.reduce((sum, m) => sum + m.amountCents, 0)).toBe(
        12_000 * 1001,
      );
    }
  });

  it("recognises a GnuCash book saved as a database and says what to do instead", () => {
    const sqlite = new Uint8Array(4096);
    sqlite.set(text("SQLite format 3\u0000"));
    const error = refusalOf(sqlite);
    expect(error).toContain("database (SQLite)");
    expect(error).toContain("Save As");
  });

  it("refuses files that aren't XML or gzip: a spreadsheet, a picture, plain words", () => {
    for (const bytes of [
      text("date,amount\n2026-01-05,10\n"),
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]),
      text("hello"),
      new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]),
    ]) {
      expect(refusalOf(bytes)).toContain("doesn't look like a GnuCash book");
    }
  });

  it("refuses XML that isn't a GnuCash book, however well formed", () => {
    expect(refusalOf(text(`<?xml version="1.0"?><html><body>hi</body></html>`))).toContain(
      "doesn't look like a GnuCash book",
    );
    expect(refusalOf(text(`<gnc-v3 xmlns:gnc="http://www.gnucash.org/XML/gnc"/>`))).toContain(
      "doesn't look like a GnuCash book",
    );
  });

  it("refuses a gzip file that isn't a GnuCash book", () => {
    expect(refusalOf(gzipSync(text("just some words, not xml")))).toContain("damaged or cut short");
    expect(refusalOf(gzipSync(text(`<?xml version="1.0"?><html/>`)))).toContain(
      "doesn't look like a GnuCash book",
    );
  });

  it("refuses an account list with no book of transactions in it", () => {
    const xml = `<?xml version="1.0" encoding="utf-8" ?>\n${gncOpenTag()}\n<gnc:count-data cd:type="account">0</gnc:count-data>\n</gnc-v2>\n`;
    expect(refusalOf(text(xml))).toContain("no book of transactions");
  });

  it("refuses a document type declaration or a custom entity, which a book never has", () => {
    const base = gnucashXml(smallBook());
    expect(
      refusalOf(text(base.replace("<gnc-v2", `<!DOCTYPE gnc-v2 [<!ENTITY x "y">]>\n<gnc-v2`))),
    ).toContain("XML features a GnuCash book never has");
    expect(
      refusalOf(text(base.replace("<act:name>Sales</act:name>", "<act:name>&custom;</act:name>"))),
    ).toContain("XML features a GnuCash book never has");
  });

  it("refuses text that isn't UTF-8, plain or declared", () => {
    const base = gnucashXml(smallBook());
    const bad = new Uint8Array([...text(base.replace("Sales", "S")), 0xff, 0xfe]);
    expect(refusalOf(bad)).toContain("UTF-8");
    expect(refusalOf(text(base.replace('encoding="utf-8"', 'encoding="ISO-8859-1"')))).toContain(
      "UTF-8",
    );
  });

  it("accepts a UTF-8 byte-order mark and accented names", () => {
    const xml = gnucashXml({
      accounts: [{ key: "a", name: "Revenus d'été — café", type: "INCOME" }],
      transactions: [],
    });
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...text(xml)]);
    expect(bookOf(withBom).accounts[0].fullName).toBe("Revenus d'été — café");
  });

  it("refuses a book that is cut short", () => {
    const xml = gnucashXml(
      smallBook({
        transactions: [{ date: "2026-03-05", splits: [{ account: "bank", quantity: "1/1" }] }],
      }),
    );
    for (const cut of [xml.length - 3, Math.floor(xml.length / 2), 200]) {
      expect(refusalOf(text(xml.slice(0, cut))), `cut at ${cut}`).toContain("damaged or cut short");
    }
  });

  it("refuses a gzip file that is cut short", () => {
    const gz = gnucashGz(GOLDEN_BOOK_XML);
    expect(readGnuCashBook(gz.subarray(0, Math.floor(gz.length / 2))).ok).toBe(false);
    expect(readGnuCashBook(gz.subarray(0, 30)).ok).toBe(false);
  });

  it("refuses a gzip file with damage in the middle", () => {
    const gz = gnucashGz(GOLDEN_BOOK_XML);
    const hurt = gz.slice();
    for (let i = 40; i < 80; i += 1) hurt[i] = hurt[i] ^ 0xa5;
    expect(readGnuCashBook(hurt).ok).toBe(false);
  });

  it("stops unpacking at the limit: a small file that would unpack to a huge one is refused", () => {
    // 3 MB of one repeated byte is a few KB compressed. With a 1 MB limit it must be stopped.
    const bomb = gzipSync(new Uint8Array(3 * 1024 * 1024).fill(0x20));
    expect(bomb.length).toBeLessThan(10 * 1024);
    expect(refusalOf(bomb, 1024 * 1024)).toContain("too large for DotAmi to read safely");
  });

  it("reads a gzip file made of two parts in full, never just the first", () => {
    const half = Math.floor(GOLDEN_BOOK_XML.length / 2);
    const first = gzipSync(strToU8(GOLDEN_BOOK_XML.slice(0, half)));
    const second = gzipSync(strToU8(GOLDEN_BOOK_XML.slice(half)));
    const both = new Uint8Array(first.length + second.length);
    both.set(first);
    both.set(second, first.length);
    expect(bookOf(both)).toEqual(bookOf(text(GOLDEN_BOOK_XML)));
  });
});

describe("books that don't hang together are refused, not patched up", () => {
  const build = () =>
    gnucashXml(
      smallBook({
        transactions: [
          {
            date: "2026-03-05",
            splits: [
              { account: "bank", quantity: "1/1" },
              { account: "sales", quantity: "-1/1" },
            ],
          },
        ],
      }),
    );

  it("refuses a split that points at an account the book doesn't have", () => {
    const xml = gnucashXml(
      smallBook({
        transactions: [{ date: "2026-03-05", splits: [{ account: "nowhere", quantity: "1/1" }] }],
      }),
    );
    expect(refusalOf(text(xml))).toContain("damaged or cut short");
  });

  it("refuses a split with no account", () => {
    const xml = build().replace(/<split:account type="guid">[0-9a-f]+<\/split:account>/, "");
    expect(refusalOf(text(xml))).toContain("damaged or cut short");
  });

  it("refuses two accounts with the same id", () => {
    const xml = build();
    const id = xml.match(/<act:id type="guid">([0-9a-f]+)<\/act:id>\n  <act:type>INCOME/)![1];
    const twin = xml.replace(
      /(<act:name>Sales<\/act:name>\n  <act:id type="guid">)[0-9a-f]+/,
      `$1${id}`,
    );
    expect(twin).not.toBe(xml);
    expect(refusalOf(text(twin))).toContain("damaged or cut short");
  });

  it("refuses an account whose parent isn't in the book, or whose parents loop", () => {
    const orphan = gnucashXml({
      accounts: [{ key: "a", name: "A", type: "INCOME", parent: "ghost" }],
      transactions: [],
    });
    expect(refusalOf(text(orphan))).toContain("damaged or cut short");
    const loop = gnucashXml({
      accounts: [
        { key: "a", name: "A", type: "INCOME", parent: "b" },
        { key: "b", name: "B", type: "INCOME", parent: "a" },
      ],
      transactions: [],
    });
    expect(refusalOf(text(loop))).toContain("damaged or cut short");
  });

  it("refuses an account with no name or no type, and a file with two books", () => {
    const noName = build().replace("<act:name>Sales</act:name>", "");
    expect(refusalOf(text(noName))).toContain("damaged or cut short");
    const noType = build().replace(/<act:type>BANK<\/act:type>/, "");
    expect(refusalOf(text(noType))).toContain("damaged or cut short");
    const two = build().replace(
      "</gnc:book>",
      '</gnc:book>\n<gnc:book version="2.0.0"></gnc:book>',
    );
    expect(refusalOf(text(two))).toContain("damaged or cut short");
  });

  it("refuses a text-only element that holds another element", () => {
    const xml = build().replace("<act:name>Sales</act:name>", "<act:name>Sa<b>l</b>es</act:name>");
    expect(refusalOf(text(xml))).toContain("damaged or cut short");
  });
});

/**
 * One sale of 100.00 on 2026-03-05 (bank in, sales out), as the builder writes it. The probes below
 * edit its text; each one asserts its edit changed something, so a probe can't pass by missing.
 */
const oneSale = () =>
  gnucashXml(
    smallBook({
      transactions: [
        {
          date: "2026-03-05",
          splits: [
            { account: "bank", quantity: "10000/100" },
            { account: "sales", quantity: "-10000/100" },
          ],
        },
      ],
    }),
  );

/** Replaces the first `find` with `put`, failing the test if `find` isn't there. */
function edit(xml: string, find: string, put: string): string {
  expect(xml, `"${find}" should be in the book`).toContain(find);
  return xml.replace(find, put);
}

/** A transaction using every part the schema lists, in each part's place. */
const fullSale = () => {
  let xml = oneSale();
  xml = edit(xml, "</trn:currency>", "</trn:currency>\n<trn:num>1001</trn:num>");
  xml = edit(xml, "</trn:date-posted>", "<ts:ns>0</ts:ns>\n</trn:date-posted>");
  xml = edit(
    xml,
    "<trn:splits>",
    `<trn:slots><slot><slot:key>notes</slot:key><slot:value type="frame"><slot><slot:key>a</slot:key><slot:value type="gdate"><gdate>2026-03-05</gdate></slot:value></slot><anything-at-all/></slot:value></slot></trn:slots>\n<trn:splits>`,
  );
  return edit(
    xml,
    "</trn:split>",
    `<split:memo>m</split:memo><split:action>a</split:action>` +
      `<split:reconcile-date><ts:date>2026-03-06 10:59:00 +0000</ts:date><ts:ns>5</ts:ns></split:reconcile-date>` +
      `<split:lot type="guid">00000000000000000000000000000abc</split:lot>` +
      `<split:slots><slot><slot:key>k</slot:key><slot:value type="string">v</slot:value></slot></split:slots>\n</trn:split>`,
  );
};

describe("a transaction with a part it doesn't know is refused, never read around", () => {
  const UNKNOWN = "a part DotAmi doesn't know";

  it("refuses a split wrapped in an element it doesn't know, naming the element", () => {
    // Before this was refused, the wrapped splits were simply not picked up: no lines, no reason.
    const wrapped = edit(
      edit(oneSale(), "<trn:splits>", "<trn:splits>\n<trn:future>"),
      "</trn:splits>",
      "</trn:future>\n</trn:splits>",
    );
    const error = refusalOf(text(wrapped));
    expect(error).toContain(UNKNOWN);
    expect(error).toContain('"trn:future"');
    expect(error).toContain("read nothing");
  });

  it("refuses an unknown element wherever a transaction or a split could hold one", () => {
    const places: Array<[string, (xml: string) => string]> = [
      [
        "in the transaction",
        (x) => edit(x, "</gnc:transaction>", "<trn:future/>\n</gnc:transaction>"),
      ],
      ["among the splits", (x) => edit(x, "<trn:splits>", "<trn:splits>\n<trn:future/>")],
      [
        "in a split",
        (x) => edit(x, "</trn:split>", "<split:future>x</split:future>\n</trn:split>"),
      ],
      [
        "a split outside the splits",
        (x) => edit(x, "</trn:splits>", "</trn:splits>\n<trn:split/>"),
      ],
      [
        "inside a text part",
        (x) => edit(x, "<trn:description>Invented entry", "<trn:description>Invented <b>entry</b>"),
      ],
      [
        "inside a posted date",
        (x) => edit(x, "</trn:date-posted>", "<ts:future/>\n</trn:date-posted>"),
      ],
      [
        "inside the currency",
        (x) => edit(x, "</trn:currency>", "<cmdty:future/>\n</trn:currency>"),
      ],
      [
        "another transaction inside it",
        (x) => edit(x, "</trn:splits>", '</trn:splits>\n<gnc:transaction version="2.0.0"/>'),
      ],
    ];
    for (const [where, change] of places) {
      expect(refusalOf(text(change(oneSale()))), where).toContain(UNKNOWN);
    }
  });

  it("holds a scheduled transaction to the same rule", () => {
    const xml = gnucashXml(
      smallBook({
        templateTransactions: [
          { date: "2026-02-01", splits: [{ account: "sales", quantity: "-50000/100" }] },
        ],
      }),
    );
    const wrapped = edit(
      edit(xml, "<trn:splits>", "<trn:splits>\n<trn:future>"),
      "</trn:splits>",
      "</trn:future>\n</trn:splits>",
    );
    expect(refusalOf(text(wrapped))).toContain(UNKNOWN);
  });

  it("refuses a transaction sitting in a place the book never keeps one", () => {
    const hidden = edit(
      edit(
        oneSale(),
        '<gnc:transaction version="2.0.0">',
        '<gnc:future>\n<gnc:transaction version="2.0.0">',
      ),
      "</gnc:transaction>",
      "</gnc:transaction>\n</gnc:future>",
    );
    expect(refusalOf(text(hidden))).toContain("a transaction in a place DotAmi doesn't expect");
  });

  it("reads a transaction that uses every part GnuCash's schema lists", () => {
    const book = bookOf(text(fullSale()));
    expect(book.lines.map((l) => [l.day, l.amount?.num])).toEqual([
      ["2026-03-05", 10000n],
      ["2026-03-05", -10000n],
    ]);
  });

  it("does not look inside slots, and reads nothing from inside them as a part of the transaction", () => {
    // Slots are free-form notes and settings. A posted date or a quantity tucked inside one
    // (after the real one, where taking the last would let it win) must not replace the real one.
    const posted = edit(
      oneSale(),
      "<trn:splits>",
      `<trn:slots><slot><slot:key>x</slot:key><slot:value type="frame"><trn:date-posted><ts:date>2026-04-09 10:59:00 +0000</ts:date></trn:date-posted></slot:value></slot></trn:slots>\n<trn:splits>`,
    );
    const quantity = edit(
      posted,
      "</trn:split>",
      `<split:slots><slot><slot:key>x</slot:key><slot:value type="frame"><split:quantity>-99900/100</split:quantity></slot:value></slot></split:slots>\n</trn:split>`,
    );
    const book = bookOf(text(quantity));
    expect(book.lines.map((l) => [l.day, l.amount?.num])).toEqual([
      ["2026-03-05", 10000n],
      ["2026-03-05", -10000n],
    ]);
  });

  it("cuts a long unknown name before showing it", () => {
    const long = `trn:${"x".repeat(200)}`;
    const error = refusalOf(text(edit(oneSale(), "<trn:splits>", `<trn:splits>\n<${long}/>`)));
    expect(error).toContain("…");
    expect(error).not.toContain(long);
    expect(error.length).toBeLessThan(400);
  });
});

describe("a part that appears twice is refused as damaged, never settled by taking the last", () => {
  it("refuses a second quantity on a split, whichever one is the real one", () => {
    // Before this was refused the last quantity won: a second -99900/100 after the real
    // -10000/100 was read as 99900 cents.
    const later = edit(
      oneSale(),
      "<split:quantity>-10000/100</split:quantity>",
      "<split:quantity>-10000/100</split:quantity>\n<split:quantity>-99900/100</split:quantity>",
    );
    expect(refusalOf(text(later))).toContain("damaged or cut short");
    const earlier = edit(
      oneSale(),
      "<split:quantity>-10000/100</split:quantity>",
      "<split:quantity>-99900/100</split:quantity>\n<split:quantity>-10000/100</split:quantity>",
    );
    expect(refusalOf(text(earlier))).toContain("damaged or cut short");
  });

  it("refuses a repeat even when both copies say the same thing", () => {
    const same = edit(
      oneSale(),
      "<split:quantity>-10000/100</split:quantity>",
      "<split:quantity>-10000/100</split:quantity>\n<split:quantity>-10000/100</split:quantity>",
    );
    expect(refusalOf(text(same))).toContain("damaged or cut short");
  });

  it("refuses a second account on a split and a second posted date on a transaction", () => {
    const account = oneSale().match(/<split:account type="guid">[0-9a-f]+<\/split:account>/)![0];
    expect(refusalOf(text(edit(oneSale(), account, `${account}\n${account}`)))).toContain(
      "damaged or cut short",
    );

    const posted = oneSale().match(/<trn:date-posted>[\s\S]*?<\/trn:date-posted>/)![0];
    const otherDay = posted.replace("2026-03-05", "2026-04-09");
    expect(refusalOf(text(edit(oneSale(), posted, `${posted}\n${otherDay}`)))).toContain(
      "damaged or cut short",
    );
  });

  it("refuses a second date inside one posted date", () => {
    const twice = edit(
      oneSale(),
      "</trn:date-posted>",
      "<ts:date>2026-04-09 10:59:00 +0000</ts:date>\n</trn:date-posted>",
    );
    expect(refusalOf(text(twice))).toContain("damaged or cut short");
  });

  it("refuses a repeat of any part a transaction or a split has, but not a second split", () => {
    // Every part of the schema, copied once more in place inside the transaction.
    const parts = [
      "trn:id",
      "trn:currency",
      "trn:num",
      "trn:date-posted",
      "trn:date-entered",
      "trn:description",
      "trn:slots",
      "trn:splits",
      "split:id",
      "split:memo",
      "split:action",
      "split:reconciled-state",
      "split:reconcile-date",
      "split:value",
      "split:quantity",
      "split:account",
      "split:lot",
      "split:slots",
      "ts:date",
      "ts:ns",
      "cmdty:space",
      "cmdty:id",
    ];
    // Reads in full as is — and has more than one split, so repeated splits are shown to be fine.
    const whole = fullSale();
    expect(bookOf(text(whole)).lines).toHaveLength(2);

    const open = whole.indexOf("<gnc:transaction");
    const close = whole.indexOf("</gnc:transaction>");
    const inside = whole.slice(open, close);
    for (const part of parts) {
      const first = inside.match(new RegExp(`<${part}(?:\\s[^>]*)?>[\\s\\S]*?</${part}>`));
      expect(first, `${part} should be in the transaction`).not.toBeNull();
      const changed =
        whole.slice(0, open) +
        inside.replace(first![0], () => `${first![0]}\n${first![0]}`) +
        whole.slice(close);
      expect(refusalOf(text(changed)), part).toContain("damaged or cut short");
    }
  });

  it("holds a scheduled transaction to the same rule", () => {
    const xml = gnucashXml(
      smallBook({
        templateTransactions: [
          { date: "2026-02-01", splits: [{ account: "sales", quantity: "-50000/100" }] },
        ],
      }),
    );
    const twice = edit(
      xml,
      "<split:quantity>-50000/100</split:quantity>",
      "<split:quantity>-50000/100</split:quantity>\n<split:quantity>-1/100</split:quantity>",
    );
    expect(refusalOf(text(twice))).toContain("damaged or cut short");
  });
});

describe("refusals never quote the book", () => {
  it("puts no amount and no account name in any refusal message", () => {
    const secretName = "Acme Corp Retainer";
    const secretAmount = "98765432/100";
    const base = gnucashXml({
      accounts: [{ key: "a", name: secretName, type: "INCOME" }],
      transactions: [
        {
          date: "2026-03-05",
          splits: [
            { account: "a", quantity: `-${secretAmount}` },
            { account: "nowhere", quantity: secretAmount },
          ],
        },
      ],
    });
    const attempts = [
      base, // dangling split
      base.replace("</gnc:book>", ""), // cut short
      base.replace("<gnc:book", "<!DOCTYPE x [<!ENTITY y 'z'>]>\n<gnc:book"),
      base.replace('<gnc:book version="2.0.0">', '<gnc:book version="9.9.9">'),
      base.replace(
        `<act:name>${secretName}</act:name>`,
        `<act:name>${secretName}&nbsp;</act:name>`,
      ),
      base.replace("<trn:splits>", "<trn:splits>\n<trn:future/>"), // a part it doesn't know
      base.replace("<split:quantity>", "<split:quantity>1/1</split:quantity><split:quantity>"), // a part twice
    ];
    for (const attempt of attempts) {
      const error = refusalOf(text(attempt));
      expect(error).not.toContain(secretName);
      expect(error).not.toContain("98765432");
    }
  });
});

describe("looksLikeGnuCash", () => {
  it("says yes for a gzip file and for XML that opens a gnc-v2 element", () => {
    expect(looksLikeGnuCash(gnucashGz(GOLDEN_BOOK_XML).subarray(0, 8192))).toBe(true);
    expect(looksLikeGnuCash(text(GOLDEN_BOOK_XML).subarray(0, 8192))).toBe(true);
    expect(
      looksLikeGnuCash(
        new Uint8Array([0xef, 0xbb, 0xbf, ...text(GOLDEN_BOOK_XML)]).subarray(0, 8192),
      ),
    ).toBe(true);
  });

  it("says no for a spreadsheet, a picture and XML of some other kind", () => {
    expect(looksLikeGnuCash(text("date,amount\n2026-01-05,10\n"))).toBe(false);
    expect(looksLikeGnuCash(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(looksLikeGnuCash(text(`<?xml version="1.0"?><html/>`))).toBe(false);
    expect(looksLikeGnuCash(new Uint8Array())).toBe(false);
  });
});

describe("a bigger book", () => {
  it("reads a few thousand transactions and adds them up exactly", () => {
    const transactions = Array.from({ length: 3000 }, (_, i) => ({
      date: `2026-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      splits: [
        { account: "bank", quantity: "1001/100" },
        { account: "sales", quantity: "-1001/100" },
      ],
    }));
    const xml = gnucashXml(smallBook({ transactions }));
    const book = bookOf(gnucashGz(xml));
    expect(book.lines).toHaveLength(6000);
    const id = book.accounts.find((a) => a.fullName === "Income:Sales")!.id;
    const result = booksMonthlyTotals(book, [id], "2026-12-31");
    if (!result.ok) throw new Error(result.error);
    const total = result.currencies[0].months.reduce((sum, m) => sum + m.amountCents, 0);
    expect(total).toBe(3000 * 1001);
    expect(result.currencies[0].linesCounted).toBe(3000);
  });
});
