import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parseSync } from "ofx-js";
import { describe, expect, it } from "vitest";
import { previewFile } from "@/lib/figures/file/preview";
import { bankMonthlyTotals, countLeftOut } from "@/lib/figures/bank/totals";
import type { BankRow } from "@/lib/figures/bank/types";
import {
  looksLikeOfx,
  OFX_MAX_BYTES,
  OFX_REFUSAL_TEXT,
  readOfx,
  type OfxReadResult,
  type OfxStatement,
} from "@/lib/figures/bank/read-ofx";

// [8g] The OFX/QFX reader (lib/figures/bank/read-ofx.ts) over INVENTED statements: the made-up
// account 000123456789, branch 04567 and card 9990001112223333 below belong to nobody. What each
// check pins is explained next to it; the review of the package underneath is
// docs/connectors/ofx-reader-review.md.

const FIXTURES = path.join(process.cwd(), "tests", "fixtures", "bank");
const fixture = (name: string) => new Uint8Array(readFileSync(path.join(FIXTURES, name)));
const fixtureText = (name: string) => readFileSync(path.join(FIXTURES, name), "utf8");

/** The invented numbers that must never come out of the reader, however they were written. */
const INVENTED_NUMBERS = [
  "000123456789",
  "04567",
  "0001 2345 6789",
  "9990001112223333",
  "000987654321",
  "000555666777",
  "000777888999",
];

const TODAY = "2026-04-07";
const NL = "\n";

/** The statements of a read that must have worked. */
function statementsOf(result: OfxReadResult): OfxStatement[] {
  if (!result.ok) throw new Error(`expected a readable file, got "${result.reason}"`);
  return result.statements;
}

const idsOf = (rows: readonly BankRow[], filter: (row: BankRow) => boolean) =>
  new Set(rows.filter(filter).map((row) => row.id));

/** The row with this bank id (FITID). */
function byFitid(rows: readonly BankRow[], fitid: string): BankRow {
  const row = rows.find((r) => r.fitid === fitid);
  if (!row) throw new Error(`no row with bank id ${fitid}`);
  return row;
}

/** A tiny valid SGML download around the given transactions, for the edge cases. */
function smallFile(options: {
  start?: string;
  end?: string;
  currency?: string | null;
  transactions?: string;
  account?: string;
}): string {
  const { start, end, currency = "CAD", transactions = "", account = "000123456789" } = options;
  return [
    "OFXHEADER:100",
    "DATA:OFXSGML",
    "VERSION:102",
    "",
    "<OFX>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<STMTRS>",
    currency === null ? "" : `<CURDEF>${currency}`,
    "<BANKACCTFROM>",
    "<BANKID>003",
    `<ACCTID>${account}`,
    "</BANKACCTFROM>",
    "<BANKTRANLIST>",
    start === undefined ? "" : `<DTSTART>${start}`,
    end === undefined ? "" : `<DTEND>${end}`,
    transactions,
    "</BANKTRANLIST>",
    "</STMTRS>",
    "</STMTTRNRS>",
    "</BANKMSGSRSV1>",
    "</OFX>",
    "",
  ].join("\n");
}

/** One SGML transaction; a field set to null is left out. */
function txn(fields: Record<string, string | null>): string {
  const base: Record<string, string | null> = {
    TRNTYPE: "CREDIT",
    DTPOSTED: "20260105",
    TRNAMT: "10.00",
    FITID: "X1",
    NAME: "SAMPLE",
    ...fields,
  };
  const body = Object.entries(base)
    .filter(([, value]) => value !== null)
    .map(([tag, value]) => `<${tag}>${value}`);
  return ["<STMTTRN>", ...body, "</STMTTRN>"].join("\n");
}

describe("readOfx — a Canadian-style chequing download, OFX 1.x (SGML) and 2.x (XML)", () => {
  const formats = [
    ["canadian-chequing-sgml.ofx", "OFX 1.x SGML"],
    ["canadian-chequing-xml.ofx", "OFX 2.x XML"],
  ] as const;

  for (const [file, label] of formats) {
    describe(label, () => {
      const result = readOfx(fixture(file));
      const [statement] = statementsOf(result);

      it("reads one bank statement in CAD with every transaction, in file order", () => {
        expect(statementsOf(result)).toHaveLength(1);
        expect(statement.kind).toBe("bank");
        expect(statement.currency).toBe("CAD");
        expect(statement.rows).toHaveLength(10);
        expect(statement.rows.map((r) => r.id)).toEqual(
          Array.from({ length: 10 }, (_, i) => `o1.${i + 1}`),
        );
        expect(statement.rows.map((r) => r.cents)).toEqual([
          100000, 25050, -8025, 1000, 40000, 30000, 30000, -5000, 150000, 10010,
        ]);
      });

      it("takes each day exactly as written, whatever its time or zone", () => {
        // 20260331235959[-5:EST] is March 31st; a time-zone shift would have made it April 1st.
        expect(byFitid(statement.rows, "M0002").day).toBe("2026-03-31");
        // A bare date, and a date with a time and an offset.
        expect(byFitid(statement.rows, "F0002").day).toBe("2026-02-15");
        expect(byFitid(statement.rows, "J0001").day).toBe("2026-01-05");
      });

      it("reads a decimal comma (OFX allows either) as cents", () => {
        expect(byFitid(statement.rows, "M0002").cents).toBe(10010);
      });

      it("treats the end date at midnight as exclusive: the file covers January 1 to March 31", () => {
        expect(statement.coverage).toEqual([{ from: "2026-01-01", to: "2026-03-31" }]);
      });

      it("adds up by month with the shared totals, counting the repeated FITID once", () => {
        const ticks = idsOf(statement.rows, () => true); // tick everything, even money out
        const totals = bankMonthlyTotals(statement.rows, ticks, statement.coverage, TODAY, {
          currency: "CAD",
        });
        expect(totals.months).toEqual([
          // 1000.00 + 250.50 + 10.00
          { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 126050, rows: 3 },
          // 400.00 + 300.00 (the second F0002 is the same transaction listed twice)
          { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 70000, rows: 2 },
          // 1500.00 + 100.10
          { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 160010, rows: 2 },
        ]);
        const counts = countLeftOut(totals.leftOut);
        expect(counts.duplicate).toBe(1);
        expect(counts["not-money-in"]).toBe(2); // the two debits, ticked but only money in counts
        expect(totals.rowsCounted).toBe(7);
        expect(totals.heldBack).toEqual([]);
      });

      it("carries none of the account, branch or bank numbers anywhere in the result", () => {
        const everything = JSON.stringify(result);
        for (const invented of INVENTED_NUMBERS) {
          expect(everything, `found ${invented}`).not.toContain(invented);
        }
        // Not in what the totals say either.
        const totals = bankMonthlyTotals(
          statement.rows,
          idsOf(statement.rows, () => true),
          statement.coverage,
          TODAY,
          { currency: "CAD" },
        );
        for (const invented of INVENTED_NUMBERS) {
          expect(JSON.stringify(totals)).not.toContain(invented);
        }
      });

      it("blanks the account number where the bank printed it in a memo or built an id from it", () => {
        expect(statement.rows.find((r) => r.description.startsWith("TRANSFER"))?.description).toBe(
          "TRANSFER - TFR FROM [hidden] SAVINGS",
        );
        expect(statement.rows.find((r) => r.description.startsWith("REFERENCE"))?.description).toBe(
          "REFERENCE [hidden] PAYMENT",
        );
        expect(statement.rows.some((r) => r.fitid === "[hidden]-0004")).toBe(true);
      });
    });
  }

  it("reads the SGML and the XML copy of the same statement as the same transactions", () => {
    const sgml = statementsOf(readOfx(fixture("canadian-chequing-sgml.ofx")))[0];
    const xml = statementsOf(readOfx(fixture("canadian-chequing-xml.ofx")))[0];
    const withoutText = (rows: BankRow[]) => rows.map(({ description, ...rest }) => rest);
    expect(withoutText(xml.rows)).toEqual(withoutText(sgml.rows));
    expect(xml.coverage).toEqual(sgml.coverage);
    // The XML copy writes "&amp;" in one memo; it comes out as the character.
    expect(byFitid(xml.rows, "J0001").description).toBe(
      "SAMPLE CUSTOMER ONE - Invoice 101 & thanks",
    );
  });

  it("reads the same file whether it is given as bytes or as text, and with Windows line ends", () => {
    const bytes = readOfx(fixture("canadian-chequing-sgml.ofx"));
    expect(readOfx(fixtureText("canadian-chequing-sgml.ofx"))).toEqual(bytes);
    expect(readOfx(fixtureText("canadian-chequing-sgml.ofx").replace(/\r?\n/g, "\r\n"))).toEqual(
      bytes,
    );
  });

  it("uses a row-id prefix when asked, so ids from several files never meet", () => {
    const [statement] = statementsOf(
      readOfx(fixture("canadian-chequing-sgml.ofx"), { idPrefix: "f2-" }),
    );
    expect(statement.rows[0].id).toBe("f2-1.1");
  });
});

describe("readOfx — pending rows and corrections", () => {
  const [statement] = statementsOf(readOfx(fixture("pending-and-corrections.ofx")));

  it("marks every pending transaction: the separate pending list and a HOLD in the main list", () => {
    const pending = statement.rows.filter((r) => r.pending).map((r) => r.description);
    expect(pending).toEqual(["HELD DEPOSIT", "PENDING DEPOSIT"]);
    // A pending row has no bank id of its own and its date is the date of the transaction.
    const waiting = statement.rows.find((r) => r.description === "PENDING DEPOSIT");
    expect(waiting?.fitid).toBeUndefined();
    expect(waiting?.day).toBe("2026-02-28");
    expect(waiting?.cents).toBe(6000);
  });

  it("passes corrections on: REPLACE and DELETE, each pointing at the earlier bank id", () => {
    expect(byFitid(statement.rows, "P0003").corrects).toEqual({
      fitid: "P0002",
      action: "replace",
    });
    expect(byFitid(statement.rows, "P0005").corrects).toEqual({ fitid: "P0004", action: "delete" });
    expect(byFitid(statement.rows, "P0001").corrects).toBeUndefined();
  });

  it("counts a corrected transaction as its correction says and never counts a pending one", () => {
    const totals = bankMonthlyTotals(
      statement.rows,
      idsOf(statement.rows, () => true),
      statement.coverage,
      TODAY,
      { currency: "CAD" },
    );
    // 500.00 stays, 200.00 is replaced by 220.00, 90.00 is cancelled, 75.00 (HOLD) and 60.00
    // (pending list) are not posted yet.
    expect(totals.months).toEqual([
      { periodStart: "2026-02-01", periodEnd: "2026-02-28", amountCents: 72000, rows: 2 },
    ]);
    const reason = (fitid: string) =>
      totals.leftOut.find((l) => l.id === byFitid(statement.rows, fitid).id)?.reason;
    expect(reason("P0002")).toBe("corrected");
    expect(reason("P0004")).toBe("corrected");
    expect(reason("P0005")).toBe("corrected");
    expect(reason("P0006")).toBe("pending");
    expect(countLeftOut(totals.leftOut).pending).toBe(2);
  });

  it("treats a correction with no usable action as a cancellation, never as a guess", () => {
    const file = smallFile({
      start: "20260101000000",
      end: "20260201000000",
      transactions: [
        txn({ FITID: "A1", TRNAMT: "100.00" }),
        txn({ FITID: "A2", TRNAMT: "150.00", CORRECTFITID: "A1" }),
      ].join("\n"),
    });
    const [s] = statementsOf(readOfx(file));
    expect(s.rows[1].corrects).toEqual({ fitid: "A1", action: "delete" });
  });
});

describe("readOfx — a credit card download (QFX)", () => {
  const result = readOfx(fixture("card-statement.qfx"));
  const [statement] = statementsOf(result);

  it("reads it as a card statement, with the Intuit tags and a dotted tag name", () => {
    expect(statement.kind).toBe("card");
    expect(statement.currency).toBe("CAD");
    expect(statement.rows.map((r) => [r.day, r.cents])).toEqual([
      ["2026-03-04", 30000],
      ["2026-03-05", -4567],
    ]);
  });

  it("covers March 1 to 31 when the end is the last second of the 31st", () => {
    expect(statement.coverage).toEqual([{ from: "2026-03-01", to: "2026-03-31" }]);
  });

  it("blanks the card number printed in a description and keeps it out of the result", () => {
    expect(statement.rows[1].description).toBe("CORNER STORE - CARD [hidden]");
    expect(JSON.stringify(result)).not.toContain("9990001112223333");
    expect(JSON.stringify(result)).not.toContain("invented-user");
  });

  it("adds up in a month", () => {
    const totals = bankMonthlyTotals(
      statement.rows,
      idsOf(statement.rows, (r) => r.cents > 0),
      statement.coverage,
      TODAY,
      { currency: "CAD" },
    );
    expect(totals.months).toEqual([
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", amountCents: 30000, rows: 1 },
    ]);
  });
});

describe("readOfx — a file with two accounts", () => {
  const result = readOfx(fixture("two-accounts.ofx"));
  const statements = statementsOf(result);

  it("returns one statement per account, told apart only by position, each in its own currency", () => {
    expect(statements.map((s) => [s.kind, s.currency, s.rows.length])).toEqual([
      ["bank", "CAD", 1],
      ["bank", "USD", 1],
    ]);
  });

  it("gives every row an id that is unique across the whole file, though both banks used the id A0001", () => {
    const ids = statements.flatMap((s) => s.rows.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(statements.map((s) => s.rows[0].fitid)).toEqual(["A0001", "A0001"]);
  });

  it("keeps both account numbers out of the result", () => {
    for (const invented of ["000123456789", "000987654321", "SAVINGS", "CHECKING"]) {
      expect(JSON.stringify(result)).not.toContain(invented);
    }
  });
});

describe("readOfx — a transfer between the person's own accounts names the OTHER account", () => {
  // Account 1 (000123456789) has memos and a transaction id naming account 2 (000987654321), a
  // "transfer to" account (000555666777) and an investment account (000777888999); account 2's
  // memos name account 1, once with spaces between the groups. Each account's number appears in
  // the other's text, so a scrubber that knew only its own statement's numbers would leak.
  const result = readOfx(fixture("two-accounts-transfer.ofx"));
  const statements = statementsOf(result);
  const NUMBERS = [
    "000123456789",
    "0001 2345 6789",
    "000987654321",
    "000555666777",
    "000777888999",
    "04567",
  ];

  it("leaves none of the numbers anywhere in the result, in either statement", () => {
    const everything = JSON.stringify(result);
    for (const number of NUMBERS) expect(everything, `found ${number}`).not.toContain(number);
    // Nor in the ids the totals would carry.
    for (const statement of statements) {
      const totals = bankMonthlyTotals(
        statement.rows,
        idsOf(statement.rows, () => true),
        statement.coverage,
        TODAY,
        { currency: statement.currency },
      );
      for (const number of NUMBERS) expect(JSON.stringify(totals)).not.toContain(number);
    }
  });

  it("blanks the other account's number in descriptions and in the transaction id", () => {
    expect(statements[0].rows.map((r) => r.description)).toEqual([
      "SAMPLE TRANSFER - TFR TO [hidden] SAVINGS",
      "SAMPLE E-TRANSFER - SENT TO [hidden]",
      "SAMPLE BROKERAGE - TO [hidden] TFSA",
    ]);
    expect(statements[0].rows[0].fitid).toBe("T[hidden]-1");
    expect(statements[1].rows[0].description).toBe("SAMPLE TRANSFER - TFR FROM [hidden] CHEQUING");
    expect(statements[1].rows[0].fitid).toBe("T[hidden]-1");
  });

  it("still reads every row and its amount", () => {
    expect(statements.map((s) => s.rows.map((r) => r.cents))).toEqual([
      [-5000, -2500, -1000],
      [5000],
    ]);
  });

  it("refuses a file that names an unreasonable number of distinct account numbers", () => {
    const transactions = Array.from({ length: 60 }, (_, i) =>
      txn({ FITID: `N${i}` }).replace(
        "</STMTTRN>",
        `<BANKACCTTO>${NL}<ACCTID>77${String(i).padStart(8, "0")}${NL}</BANKACCTTO>${NL}</STMTTRN>`,
      ),
    ).join(NL);
    const read = readOfx(smallFile({ start: "20260101", end: "20260201", transactions }));
    expect(read.ok ? "ok" : read.reason).toBe("too-many-entries");
  });
});

describe("readOfx — the result has nowhere to put an account", () => {
  // Every key that appears anywhere in a result, across all the fixtures.
  const ALLOWED_KEYS = new Set([
    "ok",
    "statements",
    "ignoredInvestment",
    "kind",
    "currency",
    "rows",
    "coverage",
    "id",
    "day",
    "cents",
    "description",
    "pending",
    "fitid",
    "corrects",
    "action",
    "from",
    "to",
    "toIsUnsure",
  ]);

  function keysOf(value: unknown, into = new Set<string>()): Set<string> {
    if (Array.isArray(value)) value.forEach((v) => keysOf(v, into));
    else if (typeof value === "object" && value !== null) {
      for (const [key, inner] of Object.entries(value)) {
        into.add(key);
        keysOf(inner, into);
      }
    }
    return into;
  }

  it("uses only the fields of the shared bank types, in every fixture", () => {
    const names = readdirSync(FIXTURES).filter((f) => /\.(ofx|qfx)$/.test(f));
    expect(names.length).toBeGreaterThanOrEqual(6);
    for (const name of names) {
      const result = readOfx(fixture(name));
      for (const key of keysOf(result)) {
        if (!result.ok) continue;
        expect(ALLOWED_KEYS.has(key), `${name} has a "${key}" field`).toBe(true);
      }
    }
  });
});

describe("readOfx — what it refuses, with a fixed sentence", () => {
  const refused = (result: OfxReadResult) => {
    if (result.ok) throw new Error("expected a refusal");
    expect(result.error).toBe(OFX_REFUSAL_TEXT[result.reason]);
    return result.reason;
  };

  it("refuses a document-type or entity declaration, however it is spelled", () => {
    expect(refused(readOfx(fixture("declares-entity.ofx")))).toBe("declares-types");
    for (const spelling of [
      "<!DOCTYPE OFX>",
      "<!doctype ofx>",
      "<! DOCTYPE OFX>",
      '<!ENTITY a "b">',
    ]) {
      const file = smallFile({ transactions: "" }).replace("<OFX>", `${spelling}\n<OFX>`);
      expect(refused(readOfx(file)), spelling).toBe("declares-types");
    }
  });

  it("refuses a file over the size limit without reading it, and one over a smaller limit", () => {
    expect(refused(readOfx(new Uint8Array(OFX_MAX_BYTES + 1)))).toBe("too-big");
    const file = fixture("canadian-chequing-sgml.ofx");
    expect(refused(readOfx(file, { maxBytes: file.length - 1 }))).toBe("too-big");
    expect(readOfx(file, { maxBytes: file.length }).ok).toBe(true);
  });

  it("refuses an empty file and one of only spaces", () => {
    expect(refused(readOfx(new Uint8Array(0)))).toBe("empty");
    expect(refused(readOfx("  \n\t "))).toBe("empty");
  });

  it("refuses what is not an OFX file at all", () => {
    expect(refused(readOfx("Date,Description,Amount\n2026-01-05,Sample,10.00\n"))).toBe("not-ofx");
    expect(refused(readOfx("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\n"))).toBe("not-ofx");
    expect(refused(readOfx("<html><body>Please sign in</body></html>"))).toBe("not-ofx");
  });

  it("refuses two downloads pasted into one file, which ofx-js alone would read as the first only", () => {
    const one = fixtureText("two-accounts.ofx");
    const two = `${one}\n${one}`;
    expect(refused(readOfx(two))).toBe("several-downloads");
    // The finding in the review: the package drops everything after a second <OFX>, silently.
    expect(parseSync(two).OFX).toEqual(parseSync(one).OFX);
  });

  it("refuses a file that was cut short", () => {
    const text = fixtureText("canadian-chequing-sgml.ofx");
    expect(refused(readOfx(text.slice(0, Math.floor(text.length / 2))))).toBe("unreadable");
    const xml = fixtureText("canadian-chequing-xml.ofx");
    expect(refused(readOfx(xml.slice(0, xml.length - 40)))).toBe("unreadable");
  });

  it("refuses markup it can't read with certainty instead of guessing (an empty value, a stray <)", () => {
    // An SGML tag with nothing after it: ofx-js can't tell where it ends, and says so.
    expect(refused(readOfx(smallFile({ transactions: txn({ MEMO: "" }) })))).toBe("unreadable");
    expect(refused(readOfx(smallFile({ transactions: txn({ MEMO: "A < B" }) })))).toBe(
      "unreadable",
    );
    expect(refused(readOfx(smallFile({ transactions: txn({ MEMO: "<![CDATA[x]]>" }) })))).toBe(
      "unreadable",
    );
  });

  it("refuses a tag with attributes, which an OFX body never has and ofx-js reads without limit", () => {
    const xml = fixtureText("canadian-chequing-xml.ofx");
    // The "<?OFX ...?>" line and the XML header carry "=" legitimately; only tags in the body count.
    expect(readOfx(xml).ok).toBe(true);
    expect(refused(readOfx(xml.replace("<STMTRS>", '<STMTRS flag="1">')))).toBe("unreadable");
    expect(
      refused(readOfx(smallFile({ transactions: "" }).replace("<OFX>", "<OFX a=1 b=2>"))),
    ).toBe("unreadable");
    // A "=" in a value is not an attribute.
    expect(readOfx(smallFile({ transactions: txn({ MEMO: "A=B" }) })).ok).toBe(true);
  });

  it("refuses a statement that doesn't say its currency", () => {
    expect(refused(readOfx(smallFile({ currency: null, transactions: txn({}) })))).toBe(
      "no-currency",
    );
    expect(refused(readOfx(smallFile({ currency: "ca", transactions: txn({}) })))).toBe(
      "no-currency",
    );
  });

  it("refuses a file with no bank or card statement, and says an investment account is not read", () => {
    const empty =
      "<OFX>\n<SIGNONMSGSRSV1>\n<SONRS>\n<LANGUAGE>ENG\n</SONRS>\n</SIGNONMSGSRSV1>\n</OFX>";
    expect(refused(readOfx(empty))).toBe("no-statement");
    const investment =
      "<OFX>\n<INVSTMTMSGSRSV1>\n<INVSTMTTRNRS>\n<TRNUID>1\n</INVSTMTTRNRS>\n</INVSTMTMSGSRSV1>\n</OFX>";
    expect(refused(readOfx(investment))).toBe("no-statement");

    // Bank plus investment: the bank is read and the screen is told something was left out.
    const both = smallFile({ transactions: txn({}) }).replace(
      "</OFX>",
      "<INVSTMTMSGSRSV1>\n<INVSTMTTRNRS>\n<TRNUID>1\n</INVSTMTTRNRS>\n</INVSTMTMSGSRSV1>\n</OFX>",
    );
    const read = readOfx(both);
    expect(read.ok && read.ignoredInvestment).toBe(true);
    expect(statementsOf(read)).toHaveLength(1);
  });

  it("refuses a file with more tags or more transactions than a bank download has", () => {
    const file = fixture("canadian-chequing-sgml.ofx");
    expect(refused(readOfx(file, { maxTags: 50 }))).toBe("too-many-entries");
    expect(refused(readOfx(file, { maxRows: 9 }))).toBe("too-many-entries");
    expect(readOfx(file, { maxRows: 10 }).ok).toBe(true);
  });

  it("refuses, with the clock it is given, a file that takes longer than the time limit", () => {
    let ticks = 0;
    // A clock that moves 1 ms every time it is read, with no time allowed: the first check trips.
    const slow = readOfx(fixture("canadian-chequing-sgml.ofx"), {
      maxMillis: 0,
      now: () => (ticks += 1),
    });
    expect(refused(slow)).toBe("too-slow");
    // A clock that doesn't move never trips.
    expect(readOfx(fixture("canadian-chequing-sgml.ofx"), { maxMillis: 0, now: () => 0 }).ok).toBe(
      true,
    );
  });

  it("never puts any of the file's own text into a refusal", () => {
    const hostile = `<!DOCTYPE secret-name>\n${fixtureText("canadian-chequing-sgml.ofx")}`;
    const result = readOfx(hostile);
    expect(JSON.stringify(result)).not.toContain("secret-name");
    expect(JSON.stringify(result)).not.toContain("SAMPLE");
  });
});

describe("readOfx — values it won't guess at", () => {
  /** The rows of a file made of these transactions. */
  const rowsOf = (...transactions: string[]) =>
    statementsOf(
      readOfx(
        smallFile({ start: "20260101", end: "20260201", transactions: transactions.join("\n") }),
      ),
    )[0].rows;

  it("keeps a row it can't read, marked unreadable, instead of dropping it", () => {
    const rows = rowsOf(
      txn({ FITID: "B1", DTPOSTED: "20260230" }), // not a real day
      txn({ FITID: "B2", TRNAMT: "12.345" }), // a fraction of a cent
      txn({ FITID: "B3", TRNAMT: "1,234.56" }), // thousands separator: ambiguous
      txn({ FITID: "B4", TRNAMT: "ten" }),
      txn({ FITID: "B5", DTPOSTED: null }),
      txn({ FITID: "B6", TRNAMT: null }),
      txn({ FITID: "B7" }),
    );
    expect(rows).toHaveLength(7);
    const totals = bankMonthlyTotals(
      rows,
      idsOf(rows, () => true),
      [{ from: "2026-01-01", to: "2026-01-31" }],
      TODAY,
      { currency: "CAD" },
    );
    expect(countLeftOut(totals.leftOut).unreadable).toBe(6);
    expect(totals.months).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 1000, rows: 1 },
    ]);
  });

  it("reads signs, zeros and trailing zeros in amounts exactly", () => {
    const rows = rowsOf(
      txn({ FITID: "C1", TRNAMT: "+5.00" }),
      txn({ FITID: "C2", TRNAMT: "-0" }),
      txn({ FITID: "C3", TRNAMT: "12.500" }),
      txn({ FITID: "C4", TRNAMT: "7" }),
      txn({ FITID: "C5", TRNAMT: "-12345678901234.99" }),
      txn({ FITID: "C6", TRNAMT: "123456789012345.99" }), // more cents than a number holds exactly
    );
    expect(rows.map((r) => r.cents)).toEqual([500, 0, 1250, 700, -1234567890123499, Number.NaN]);
    expect(Object.is(rows[1].cents, 0)).toBe(true); // never -0
  });

  it("won't read a comma followed by exactly three digits, which is a thousands separator or a decimal", () => {
    const rows = rowsOf(
      txn({ FITID: "E1", TRNAMT: "1,000" }), // $1,000 or $1.000? Not ours to pick.
      txn({ FITID: "E2", TRNAMT: "-12,500" }),
      txn({ FITID: "E3", TRNAMT: "1,00" }), // a decimal comma, two digits
      txn({ FITID: "E4", TRNAMT: "1,5" }),
      txn({ FITID: "E5", TRNAMT: "1.000" }), // a decimal point is unambiguous: one dollar
    );
    expect(rows.map((r) => r.cents)).toEqual([Number.NaN, Number.NaN, 100, 150, 100]);
  });

  it("makes a row unreadable when its transaction id is longer than the format allows", () => {
    const [long, edge] = rowsOf(txn({ FITID: "F".repeat(256) }), txn({ FITID: "G".repeat(255) }));
    expect(long.cents).toBeNaN();
    expect(long.fitid).toBeUndefined();
    expect(edge.cents).toBe(1000);
    expect(edge.fitid).toBe("G".repeat(255));
  });

  it("turns a repeated tag inside one transaction into an unreadable row, not into a guess", () => {
    const doubled = txn({ FITID: "D1" }).replace("<TRNAMT>10.00", "<TRNAMT>10.00\n<TRNAMT>99.00");
    const [row] = rowsOf(doubled);
    expect(row.cents).toBeNaN();
  });

  it("keeps an empty transaction (an XML self-closing tag) as an unreadable row", () => {
    const xml = fixtureText("canadian-chequing-xml.ofx").replace(
      "<BANKTRANLIST>",
      "<BANKTRANLIST><STMTTRN/>",
    );
    const [statement] = statementsOf(readOfx(xml));
    expect(statement.rows).toHaveLength(11);
    expect(statement.rows[0].day).toBe("");
    expect(statement.rows[0].cents).toBeNaN();
  });

  it("cuts a long description and flattens line breaks in it", () => {
    const [row] = rowsOf(txn({ NAME: "A".repeat(500), MEMO: "line one&#10;line two" }));
    expect(row.description.length).toBe(200);
    // Past what the format allows for a name and memo, the description is left empty rather than
    // cut where half an account number might sit; the amount and day are still read.
    const [huge] = rowsOf(txn({ NAME: "A".repeat(700) }));
    expect(huge.description).toBe("");
    expect(huge.cents).toBe(1000);
    const [flat] = rowsOf(txn({ NAME: "ONE\tTWO\rTHREE", MEMO: null }));
    expect(flat.description).toBe("ONE TWO THREE");
  });
});

describe("readOfx — coverage from the start and end dates", () => {
  const coverage = (start?: string, end?: string) =>
    statementsOf(readOfx(smallFile({ start, end, transactions: txn({}) })))[0].coverage;

  it("says the end day is unsure when the end date has no time", () => {
    expect(coverage("20260101", "20260331")).toEqual([
      { from: "2026-01-01", to: "2026-03-31", toIsUnsure: true },
    ]);
  });

  it("takes an end at midnight as exclusive, so the day before is the last day", () => {
    expect(coverage("20260101", "20260401000000")).toEqual([
      { from: "2026-01-01", to: "2026-03-31" },
    ]);
  });

  it("takes an end at the last second of a day as that day", () => {
    expect(coverage("20260101", "20260331235959")).toEqual([
      { from: "2026-01-01", to: "2026-03-31" },
    ]);
    expect(coverage("20260101", "20260331235959.000[-5:EST]")).toEqual([
      { from: "2026-01-01", to: "2026-03-31" },
    ]);
  });

  it("doesn't count an end day that stops at noon, nor a start day that begins at noon", () => {
    expect(coverage("20260101", "20260331120000")).toEqual([
      { from: "2026-01-01", to: "2026-03-30" },
    ]);
    expect(coverage("20260101120000", "20260401")).toEqual([
      { from: "2026-01-02", to: "2026-04-01", toIsUnsure: true },
    ]);
  });

  it("covers nothing when the file gives no start or end, or they are not days, or they are backwards", () => {
    expect(coverage(undefined, undefined)).toEqual([]);
    expect(coverage("20260101", undefined)).toEqual([]);
    expect(coverage("20260101", "20260231")).toEqual([]);
    expect(coverage("20260301", "20260201000000")).toEqual([]);
  });

  it("holds back a month whose last day the file can't settle", () => {
    const [statement] = statementsOf(
      readOfx(
        smallFile({
          start: "20260101",
          end: "20260131",
          transactions: txn({ DTPOSTED: "20260115", TRNAMT: "50.00", FITID: "E1" }),
        }),
      ),
    );
    const totals = bankMonthlyTotals(
      statement.rows,
      idsOf(statement.rows, () => true),
      statement.coverage,
      TODAY,
      { currency: "CAD" },
    );
    expect(totals.months).toEqual([]);
    expect(totals.heldBack).toEqual([{ month: "2026-01", reason: "end-day-unsure", rows: 1 }]);
  });
});

describe("readOfx — account numbers written other ways", () => {
  const description = (account: string, name: string, memo: string | null = null) =>
    statementsOf(readOfx(smallFile({ account, transactions: txn({ NAME: name, MEMO: memo }) })))[0]
      .rows[0].description;

  it("blanks the number with spaces or dashes in it, and wherever it falls in the text", () => {
    expect(description("000123456789", "FROM 000123456789")).toBe("FROM [hidden]");
    expect(description("000123456789", "FROM 0001-2345-6789 X")).toBe("FROM [hidden] X");
    expect(description("000123456789", "A", "TO 0001 2345 6789.")).toBe("A - TO [hidden].");
    expect(description("000123456789", "A", "000123456789000123456789")).toBe(
      "A - [hidden][hidden]",
    );
  });

  it("blanks the number when a tab, a double space or a spaced dash sits between its groups", () => {
    // The text is flattened to single spaces before the scrub, so none of these slips past.
    expect(description("000123456789", "A", "FROM 0001\t2345\t6789")).toBe("A - FROM [hidden]");
    expect(description("000123456789", "A", "FROM 0001  2345  6789")).toBe("A - FROM [hidden]");
    expect(description("000123456789", "A", "FROM 0001 - 2345 - 6789 X")).toBe(
      "A - FROM [hidden] X",
    );
  });

  it("blanks the number when an XML memo breaks the line between its groups", () => {
    // In XML a value may run over several lines (the SGML form can't), so a real line break and a
    // carriage return can sit inside the number.
    const xml = fixtureText("canadian-chequing-xml.ofx").replace(
      "<MEMO>Invoice 101 &amp; thanks</MEMO>",
      "<MEMO>FROM 0001\n  2345\r\n6789 X</MEMO>",
    );
    const [statement] = statementsOf(readOfx(xml));
    expect(statement.rows[0].description).toBe("SAMPLE CUSTOMER ONE - FROM [hidden] X");
    expect(JSON.stringify(statement)).not.toContain("0001 2345 6789");
  });

  it("blanks a number made of letters and digits, matched exactly and without regard to case", () => {
    expect(description("AB-12.34+56", "paid ab-12.34+56 now")).toBe("paid [hidden] now");
  });

  it("leaves alone a number shorter than four characters, which would match everywhere", () => {
    expect(description("123", "ORDER 123")).toBe("ORDER 123");
  });

  it("does not build a slow pattern from a huge account number", () => {
    const huge = "9".repeat(5000);
    const started = Date.now();
    // Past what a bank's account number is, it is matched as plain text, not built into a pattern;
    // a number that long can't fit in a description anyway, but its pattern is still built.
    expect(description(huge, "X Y")).toBe("X Y");
    expect(Date.now() - started).toBeLessThan(2000);
    // Long, but still a description: matched exactly.
    const long = "7".repeat(100);
    expect(description(long, `X ${long} Y`)).toBe("X [hidden] Y");
  });
});

describe("readOfx — account numbers written with other spaces, dashes and invisible marks", () => {
  const description = (account: string, name: string, memo: string | null = null) =>
    statementsOf(readOfx(smallFile({ account, transactions: txn({ NAME: name, MEMO: memo }) })))[0]
      .rows[0].description;

  // The same invented number, 0001 2345 6789, with each kind of gap between its groups. A person sees
  // an ordinary space or dash in every one of these; a pattern for the plain one does not.
  const GAPS: [string, string][] = [
    ["no-break space U+00A0", "\u00A0"],
    ["figure space U+2007", "\u2007"],
    ["narrow no-break space U+202F", "\u202F"],
    ["en space U+2002", "\u2002"],
    ["thin space U+2009", "\u2009"],
    ["ideographic space U+3000", "\u3000"],
    ["line separator U+2028", "\u2028"],
    ["next line U+0085", "\u0085"],
    ["several no-break spaces", "\u00A0\u00A0\u00A0\u00A0\u00A0"],
    ["en dash U+2013", "\u2013"],
    ["em dash U+2014", "\u2014"],
    ["minus sign U+2212", "\u2212"],
    ["non-breaking hyphen U+2011", "\u2011"],
    ["full-width hyphen U+FF0D", "\uFF0D"],
    ["space, en dash, space", " \u2013 "],
    ["zero-width space U+200B", "\u200B"],
    ["soft hyphen U+00AD", "\u00AD"],
  ];

  it.each(GAPS)("blanks the number with a %s between the groups of a memo", (_label, gap) => {
    const memo = ["FROM 0001", "2345", "6789 X"].join(gap);
    expect(description("000123456789", "A", memo)).toBe("A - FROM [hidden] X");
  });

  it.each(GAPS)("blanks the number with a %s between the groups of a name", (_label, gap) => {
    expect(description("000123456789", ["0001", "2345", "6789"].join(gap), null)).toBe("[hidden]");
  });

  it("blanks the number written in full-width digits", () => {
    expect(
      description(
        "000123456789",
        "A",
        "FROM \uFF10\uFF10\uFF10\uFF11\uFF12\uFF13\uFF14\uFF15\uFF16\uFF17\uFF18\uFF19 X",
      ),
    ).toBe("A - FROM [hidden] X");
  });

  it("finds a number the bank itself wrote with such a space or dash in its account block", () => {
    // ACCTID is "0001<NBSP>2345<NBSP>6789": looked for as its bare digits, so the plain and the
    // spaced forms in a memo are both found.
    for (const memo of [
      "TO 000123456789",
      "TO 0001 2345 6789",
      "TO 0001\u202F2345\u202F6789",
      "TO 0001\u20132345\u20136789",
    ]) {
      expect(description("0001\u00A02345\u00A06789", "A", memo)).toBe("A - TO [hidden]");
    }
  });

  it("blanks it in a transaction id, and in the id a correction points at, without leaking", () => {
    const file = smallFile({
      start: "20260101",
      end: "20260201",
      transactions: [
        txn({ FITID: "T0001\u00A02345\u00A06789-1", TRNAMT: "10.00" }),
        txn({
          FITID: "C1",
          TRNAMT: "12.00",
          CORRECTFITID: "T0001\u00A02345\u00A06789-1",
          CORRECTACTION: "REPLACE",
        }),
      ].join(NL),
    });
    const result = readOfx(file);
    const [statement] = statementsOf(result);
    expect(statement.rows[0].fitid).toBe("T[hidden]-1");
    expect(statement.rows[1].corrects).toEqual({ fitid: "T[hidden]-1", action: "replace" });
    expect(JSON.stringify(result)).not.toMatch(/6789|2345/);
  });

  it("leaves an id with nothing of an account in it exactly as the file wrote it", () => {
    const file = smallFile({
      transactions: txn({ FITID: "REF\u00A0123\u00A0X" }),
    });
    expect(statementsOf(readOfx(file))[0].rows[0].fitid).toBe("REF\u00A0123\u00A0X");
  });
});

describe("readOfx — two different transaction ids that both contain an account number", () => {
  // Account 000123456789 is the statement's own; 000987654321 is a "transfer to" account named in
  // the second transaction. Blanking both ids gives the same text, but the bank listed two ids.
  const OTHER = "000987654321";
  const withOther = (transaction: string) =>
    transaction.replace(
      "</STMTTRN>",
      `<BANKACCTTO>${NL}<ACCTID>${OTHER}${NL}</BANKACCTTO>${NL}</STMTTRN>`,
    );
  const month = { start: "20260101", end: "20260201" };
  const totalOf = (rows: readonly BankRow[], coverage: OfxStatement["coverage"]) =>
    bankMonthlyTotals(
      rows,
      idsOf(rows, () => true),
      coverage,
      TODAY,
      { currency: "CAD" },
    );

  it("counts both when they share a day and an amount", () => {
    const file = smallFile({
      ...month,
      transactions: [
        txn({ FITID: "000123456789", TRNAMT: "10.00", NAME: "ONE" }),
        withOther(txn({ FITID: OTHER, TRNAMT: "10.00", NAME: "TWO" })),
      ].join(NL),
    });
    const result = readOfx(file);
    const [statement] = statementsOf(result);
    // The totals count both, and call neither a duplicate...
    const totals = totalOf(statement.rows, statement.coverage);
    expect(totals.months).toEqual([
      { periodStart: "2026-01-01", periodEnd: "2026-01-31", amountCents: 2000, rows: 2 },
    ]);
    expect(totals.leftOut).toEqual([]);
    // ...because two different ids stay two different ids, with the numbers blanked.
    expect(statement.rows[0].fitid).toBe("[hidden]");
    expect(statement.rows[1].fitid).toBe("[hidden]#2");
    // And no part of either number comes out.
    expect(JSON.stringify(result)).not.toMatch(/123456789|987654321/);
  });

  it("counts both when one spelling of the number has spaces and the other dashes", () => {
    const file = smallFile({
      ...month,
      transactions: [
        txn({ FITID: "T-0001 2345 6789", TRNAMT: "10.00" }),
        txn({ FITID: "T-0001-2345-6789", TRNAMT: "10.00" }),
      ].join(NL),
    });
    const [statement] = statementsOf(readOfx(file));
    expect(totalOf(statement.rows, statement.coverage).months[0].amountCents).toBe(2000);
  });

  it("still counts a transaction listed twice once, ids with a number in them or not", () => {
    for (const fitid of ["000123456789", "X1"]) {
      const file = smallFile({
        ...month,
        transactions: [txn({ FITID: fitid }), txn({ FITID: fitid })].join(NL),
      });
      const [statement] = statementsOf(readOfx(file));
      const totals = totalOf(statement.rows, statement.coverage);
      expect(totals.months[0].amountCents).toBe(1000);
      expect(totals.leftOut.map((l) => l.reason)).toEqual(["duplicate"]);
    }
  });

  it("lets a correction cancel the one row it names and not the other", () => {
    const file = smallFile({
      ...month,
      transactions: [
        txn({ FITID: "000123456789", TRNAMT: "100.00", NAME: "ONE" }),
        withOther(txn({ FITID: OTHER, TRNAMT: "200.00", NAME: "TWO" })),
        txn({
          FITID: "C1",
          TRNAMT: "150.00",
          CORRECTFITID: "000123456789",
          CORRECTACTION: "REPLACE",
        }),
      ].join(NL),
    });
    const [statement] = statementsOf(readOfx(file));
    const totals = totalOf(statement.rows, statement.coverage);
    // Row 1 is replaced by the 150.00; row 2 (200.00) stands.
    expect(totals.months[0].amountCents).toBe(35000);
    expect(totals.leftOut).toEqual([{ id: statement.rows[0].id, reason: "corrected" }]);
  });

  it("does not let a correction that names an id the file doesn't have cancel a row that blanks to the same text", () => {
    const file = smallFile({
      ...month,
      transactions: [
        withOther(txn({ FITID: "000123456789", TRNAMT: "100.00", NAME: "ONE" })),
        // The id this one corrects is the other account's number: not an id anywhere in the file.
        txn({ FITID: "C1", TRNAMT: "5.00", CORRECTFITID: OTHER, CORRECTACTION: "DELETE" }),
      ].join(NL),
    });
    const [statement] = statementsOf(readOfx(file));
    const totals = totalOf(statement.rows, statement.coverage);
    expect(totals.months[0].amountCents).toBe(10000);
    expect(totals.leftOut.map((l) => l.reason)).toEqual(["corrected"]);
    expect(totals.leftOut[0].id).toBe(statement.rows[1].id);
  });

  it("gives the same id to the same original, in a row and in a correction", () => {
    const file = smallFile({
      ...month,
      transactions: [
        txn({ FITID: "000123456789" }),
        withOther(txn({ FITID: OTHER })),
        txn({ FITID: "C1", CORRECTFITID: OTHER, CORRECTACTION: "DELETE" }),
      ].join(NL),
    });
    const [statement] = statementsOf(readOfx(file));
    expect(statement.rows[2].corrects?.fitid).toBe(statement.rows[1].fitid);
    expect(statement.rows[1].fitid).not.toBe(statement.rows[0].fitid);
  });
});

describe("readOfx — tags named like JavaScript's own properties", () => {
  it("reads the same transactions and pollutes nothing", () => {
    const clean = readOfx(fixture("canadian-chequing-xml.ofx"));
    const hostile = fixtureText("canadian-chequing-xml.ofx").replace(
      "<STMTTRN>",
      "<STMTTRN><__proto__><polluted>yes</polluted></__proto__><constructor>1</constructor><toString>2</toString><hasOwnProperty>3</hasOwnProperty>",
    );
    expect(readOfx(hostile)).toEqual(clean);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(Object.prototype)).toEqual([]);
  });
});

describe("readOfx — character sets", () => {
  const withName = (name: string) => smallFile({ transactions: txn({ NAME: name }) });

  it("reads Windows-1252 when the header says CHARSET:1252 (accented names from Canadian banks)", () => {
    const text = withName("CAFé RÉSUMÉ").replace("DATA:OFXSGML", "DATA:OFXSGML\nCHARSET:1252");
    // Windows-1252 bytes: é is 0xE9 and É is 0xC9, which are not valid UTF-8.
    const bytes = Uint8Array.from(
      Array.from(text, (ch) => (ch.charCodeAt(0) < 256 ? ch.charCodeAt(0) : 63)),
    );
    expect(statementsOf(readOfx(bytes))[0].rows[0].description).toBe("CAFé RÉSUMÉ");
  });

  it("reads UTF-8, with or without a byte-order mark, and UTF-16", () => {
    const text = withName("CAFé");
    const utf8 = new TextEncoder().encode(text);
    expect(statementsOf(readOfx(utf8))[0].rows[0].description).toBe("CAFé");
    expect(
      statementsOf(readOfx(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8])))[0].rows[0].description,
    ).toBe("CAFé");
    const utf16 = new Uint8Array(2 + text.length * 2);
    utf16.set([0xff, 0xfe]);
    for (let i = 0; i < text.length; i += 1) {
      utf16[2 + i * 2] = text.charCodeAt(i) & 0xff;
      utf16[3 + i * 2] = text.charCodeAt(i) >> 8;
    }
    expect(statementsOf(readOfx(utf16))[0].rows[0].description).toBe("CAFé");
  });
});

describe("readOfx — large and hostile files", () => {
  it("reads a few tens of thousands of transactions in well under the time limit", () => {
    const many = Array.from({ length: 20_000 }, (_, i) =>
      txn({ FITID: `L${i}`, DTPOSTED: `2026010${(i % 9) + 1}`, TRNAMT: "1.00" }),
    ).join("\n");
    const started = Date.now();
    const [statement] = statementsOf(
      readOfx(smallFile({ start: "20260101", end: "20260201", transactions: many })),
    );
    expect(statement.rows).toHaveLength(20_000);
    expect(Date.now() - started).toBeLessThan(8000);
  });

  it("turns away a file that is nothing but tags, before the parser runs", () => {
    const flood = `<OFX>${"<A>1".repeat(600_000)}`;
    const started = Date.now();
    const result = readOfx(flood);
    expect(result.ok ? "ok" : result.reason).toBe("too-many-entries");
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it("turns away an attribute flood whatever the tag's name starts with", () => {
    // ofx-js reads a tag name that starts with "_", "-", ".", ":" or a digit as well as a letter; a
    // refusal that looked only for a letter left these ten-megabyte floods to cost it about a second.
    const attributes = " a=1".repeat(2_400_000);
    for (const name of ["A", "_A", "1A", "-A", ".A", ":A", "A.B", "_", "9"]) {
      const flood = `<OFX><${name}${attributes}>1</${name}></OFX>`;
      const started = Date.now();
      const result = readOfx(flood);
      expect(result.ok ? "ok" : result.reason, name).toBe("unreadable");
      expect(Date.now() - started, name).toBeLessThan(1000);
    }
    // A line break, a tab or a no-break space instead of a space, a self-closing tag, an <OFX> that
    // carries one, and a processing instruction inside the body.
    for (const flood of [
      `<OFX><_A${"\na=1".repeat(2_400_000)}>1</_A></OFX>`,
      `<OFX><_A${"\ta=1".repeat(2_400_000)}>1</_A></OFX>`,
      `<OFX><_A${"\u00A0a=1".repeat(2_400_000)}>1</_A></OFX>`,
      `<OFX><_A${" a=1".repeat(2_400_000)}/></OFX>`,
      `<OFX${" a=1".repeat(2_400_000)}><A>1</A></OFX>`,
      `<OFX><?A${" a=1".repeat(2_400_000)}?></OFX>`,
    ]) {
      expect(readOfx(flood).ok).toBe(false);
    }
  });

  it("reads the worst file the tag cap lets through in a few seconds at most", () => {
    // Just under the cap on "<": the parser's cost follows the tag count, and this shape (names that
    // start with "_", unclosed SGML leaves) is the slowest of the shapes tried. Measured: about 0.65 s
    // here (docs/connectors/ofx-reader-review.md); the bound is loose so a slow machine passes.
    const flood = `<OFX>${"<_A>1".repeat(490_000)}</OFX>`;
    const started = Date.now();
    const result = readOfx(flood);
    expect(result.ok ? "ok" : result.reason).toBe("no-statement");
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it("turns away one huge tag stuffed with attributes, which counting the < characters would not see", () => {
    const flood = `<OFX><A ${Array.from({ length: 200_000 }, (_, i) => `a${i}=1`).join(" ")}>1</A></OFX>`;
    const started = Date.now();
    const result = readOfx(flood);
    expect(result.ok ? "ok" : result.reason).toBe("unreadable");
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("skips a name and memo of millions of near-miss digits instead of grinding through them", () => {
    // The account number is 39 zeros and a 1; the memo is zeros that match 39 digits and then fail,
    // the worst case for the pattern. The text is far past what a description reads, so it is skipped.
    const account = `${"0".repeat(39)}1`;
    const memo = "0".repeat(2_000_000);
    const file = smallFile({ account, transactions: txn({ NAME: memo, MEMO: memo }) });
    const started = Date.now();
    const [statement] = statementsOf(readOfx(file));
    expect(statement.rows[0].description).toBe("");
    expect(statement.rows[0].cents).toBe(1000);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("gives up on a tree nested far deeper than any bank file, without crashing", () => {
    const deep = `<OFX>${"<A>".repeat(100_000)}${"</A>".repeat(100_000)}</OFX>`;
    const result = readOfx(deep);
    expect(result.ok ? "ok" : result.reason).toBe("unreadable");
  });
});

// ---- the second review: a tag written twice, number forms a bank prints, many colliding ids ----

type Fields = [tag: string, value: string][];
type Format = "sgml" | "xml";
const FORMATS: Format[] = ["sgml", "xml"];

const escapeXml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** One aggregate (`<TAG> ... </TAG>`) holding these fields, a tag that is listed twice appearing twice. */
function aggregate(format: Format, tag: string, fields: Fields): string {
  if (format === "sgml") {
    return [`<${tag}>`, ...fields.map(([t, v]) => `<${t}>${v}`), `</${tag}>`].join(NL);
  }
  return `<${tag}>${fields.map(([t, v]) => `<${t}>${escapeXml(v)}</${t}>`).join("")}</${tag}>`;
}

/**
 * The fields of one transaction: the usual ones (a null removes one), then `extra`, which can
 * write a tag a second time (inside the same transaction, which no bank does).
 */
function fieldsOf(overrides: Record<string, string | null> = {}, extra: Fields = []): Fields {
  const base: Record<string, string | null> = {
    TRNTYPE: "CREDIT",
    DTPOSTED: "20260105",
    TRNAMT: "10.00",
    FITID: "X1",
    NAME: "SAMPLE",
    ...overrides,
  };
  const fields: Fields = [];
  for (const [tag, value] of Object.entries(base)) if (value !== null) fields.push([tag, value]);
  return [...fields, ...extra];
}

/** A one-account bank download in either format, built from explicit field lists. */
function builtFile(
  format: Format,
  parts: {
    /** The fields inside BANKACCTFROM. */
    block?: Fields;
    /** Each transaction: its fields, and the fields of a BANKACCTTO inside it, if any. */
    transactions: { fields: Fields; to?: Fields }[];
  },
): string {
  const block = parts.block ?? [
    ["BANKID", "003"],
    ["ACCTID", "000123456789"],
  ];
  const transactions = parts.transactions.map(({ fields, to }) => {
    const text = aggregate(format, "STMTTRN", fields);
    if (!to) return text;
    return text.replace(/<\/STMTTRN>$/, `${aggregate(format, "BANKACCTTO", to)}${NL}</STMTTRN>`);
  });
  const leaf = (tag: string, value: string) =>
    format === "sgml" ? `<${tag}>${value}` : `<${tag}>${value}</${tag}>`;
  const body = [
    "<OFX>",
    "<BANKMSGSRSV1>",
    "<STMTTRNRS>",
    "<STMTRS>",
    leaf("CURDEF", "CAD"),
    aggregate(format, "BANKACCTFROM", block),
    "<BANKTRANLIST>",
    leaf("DTSTART", "20260101"),
    leaf("DTEND", "20260201"),
    ...transactions,
    "</BANKTRANLIST>",
    "</STMTRS>",
    "</STMTTRNRS>",
    "</BANKMSGSRSV1>",
    "</OFX>",
    "",
  ].join(NL);
  return format === "sgml"
    ? ["OFXHEADER:100", "DATA:OFXSGML", "VERSION:102", "", body].join(NL)
    : `<?xml version="1.0"?>${NL}<?OFX OFXHEADER="200" VERSION="211"?>${NL}${body}`;
}

/** What the totals make of a read statement with every row ticked. */
function totalsOfAll(statement: OfxStatement) {
  return bankMonthlyTotals(
    statement.rows,
    idsOf(statement.rows, () => true),
    statement.coverage,
    TODAY,
    { currency: "CAD" },
  );
}

describe("readOfx — a tag written twice inside one transaction (no bank does this)", () => {
  // A tag the reader needs to see exactly once. ofx-js turns a repeated tag into a list and the
  // reader used to read a list as "not there": a HOLD counted as money, a duplicate not noticed,
  // a correction forgotten. Now a row that repeats any tag it depends on is unreadable (listed,
  // never counted), and a file whose CORRECTFITID is repeated is refused, because the rows that
  // correction should have changed would still be counted at their old amounts.
  const statementWith = (format: Format, extra: Fields, overrides = {}) => {
    const file = builtFile(format, {
      transactions: [{ fields: fieldsOf(overrides, extra) }],
    });
    return statementsOf(readOfx(file))[0];
  };

  for (const format of FORMATS) {
    describe(format, () => {
      it("does not count a HOLD that is written twice", () => {
        const statement = statementWith(format, [["TRNTYPE", "HOLD"]], { TRNTYPE: "HOLD" });
        expect(statement.rows).toHaveLength(1);
        expect(statement.rows[0].cents).toBeNaN();
        const totals = totalsOfAll(statement);
        expect(totals.months).toEqual([]);
        expect(totals.rowsCounted).toBe(0);
        expect(totals.leftOut.map((l) => l.reason)).toEqual(["unreadable"]);
      });

      it("does not count a transaction type that is written twice, whatever the two say", () => {
        const statement = statementWith(format, [["TRNTYPE", "CREDIT"]]);
        expect(statement.rows[0].cents).toBeNaN();
        expect(totalsOfAll(statement).rowsCounted).toBe(0);
      });

      it("does not count a transaction id that is written twice, so a duplicate is not missed", () => {
        const file = builtFile(format, {
          transactions: [
            { fields: fieldsOf({ FITID: "Z1" }) },
            { fields: fieldsOf({ FITID: "Z1" }, [["FITID", "Z1"]]) },
          ],
        });
        const [statement] = statementsOf(readOfx(file));
        const totals = totalsOfAll(statement);
        // The first counts; the second (the same money listed again, with its id doubled) does not.
        expect(totals.months[0].amountCents).toBe(1000);
        expect(totals.rowsCounted).toBe(1);
        expect(totals.leftOut.map((l) => l.reason)).toEqual(["unreadable"]);
      });

      it("refuses the file when the id a correction points at is written twice", () => {
        const file = builtFile(format, {
          transactions: [
            { fields: fieldsOf({ FITID: "A1", TRNAMT: "100.00" }) },
            {
              fields: fieldsOf(
                { FITID: "C1", TRNAMT: "150.00", CORRECTFITID: "A1", CORRECTACTION: "REPLACE" },
                [["CORRECTFITID", "A1"]],
              ),
            },
          ],
        });
        const result = readOfx(file);
        expect(result.ok ? "ok" : result.reason).toBe("unreadable");
      });

      it("makes a correction whose action is written twice unreadable, and still cancels the row it names", () => {
        const file = builtFile(format, {
          transactions: [
            { fields: fieldsOf({ FITID: "A1", TRNAMT: "100.00" }) },
            {
              fields: fieldsOf(
                { FITID: "C1", TRNAMT: "150.00", CORRECTFITID: "A1", CORRECTACTION: "REPLACE" },
                [["CORRECTACTION", "REPLACE"]],
              ),
            },
          ],
        });
        const [statement] = statementsOf(readOfx(file));
        expect(statement.rows[1].cents).toBeNaN();
        const totals = totalsOfAll(statement);
        // Nothing is counted on a guess: A1 is out (the correction names it) and the doubled
        // correction is listed, not counted.
        expect(totals.rowsCounted).toBe(0);
        expect(totals.leftOut.map((l) => l.reason).sort()).toEqual(["corrected", "unreadable"]);
      });

      it("keeps a day or an amount written twice unreadable (these two already failed closed)", () => {
        for (const extra of [[["TRNAMT", "10.00"]], [["DTPOSTED", "20260105"]]] as Fields[]) {
          const totals = totalsOfAll(statementWith(format, extra));
          expect(totals.rowsCounted).toBe(0);
          expect(totals.leftOut.map((l) => l.reason)).toEqual(["unreadable"]);
        }
      });
    });
  }

  it("does not count a transaction type that holds more tags instead of text (XML)", () => {
    const file = builtFile("xml", { transactions: [{ fields: fieldsOf() }] }).replace(
      "<TRNTYPE>CREDIT</TRNTYPE>",
      "<TRNTYPE><CODE>HOLD</CODE></TRNTYPE>",
    );
    const [statement] = statementsOf(readOfx(file));
    expect(statement.rows[0].cents).toBeNaN();
    expect(totalsOfAll(statement).rowsCounted).toBe(0);
  });

  it("leaves a normal transaction alone", () => {
    for (const format of FORMATS) {
      const [statement] = statementsOf(
        readOfx(builtFile(format, { transactions: [{ fields: fieldsOf() }] })),
      );
      expect(statement.rows[0].cents).toBe(1000);
      expect(totalsOfAll(statement).rowsCounted).toBe(1);
    }
  });
});

describe("readOfx — an identifying tag written twice in an account block", () => {
  // The first number is the real account; the second is another the same block names. Neither may
  // come out of the reader, in a description or in an id, however many times the tag is written.
  const FIRST = "7770001234";
  const SECOND = "8880004321";
  const memo = `FROM ${FIRST} AND ${SECOND}`;

  for (const format of FORMATS) {
    describe(format, () => {
      for (const tag of ["BANKID", "BRANCHID", "ACCTID", "ACCTKEY"]) {
        it(`blanks both values of a repeated ${tag} of the statement's own account`, () => {
          const block: Fields = [
            ["ACCTID", "000123456789"],
            [tag, FIRST],
            [tag, SECOND],
          ];
          const file = builtFile(format, {
            block,
            transactions: [{ fields: fieldsOf({ NAME: "T", MEMO: memo, FITID: `R${FIRST}` }) }],
          });
          const result = readOfx(file);
          const [statement] = statementsOf(result);
          expect(statement.rows[0].description).toBe("T - FROM [hidden] AND [hidden]");
          expect(statement.rows[0].fitid).toBe("R[hidden]");
          expect(JSON.stringify(result)).not.toMatch(/777000|888000|1234|4321/);
        });

        it(`blanks both values of a repeated ${tag} of a transfer's other account`, () => {
          const file = builtFile(format, {
            transactions: [
              {
                fields: fieldsOf({ NAME: "T", MEMO: memo }),
                to: [
                  ["ACCTID", "000555666777"],
                  [tag, FIRST],
                  [tag, SECOND],
                ],
              },
            ],
          });
          const result = readOfx(file);
          const [statement] = statementsOf(result);
          expect(statement.rows[0].description).toBe("T - FROM [hidden] AND [hidden]");
          expect(JSON.stringify(result)).not.toMatch(/777000|888000|1234|4321|555666/);
        });
      }

      it("blanks a number written twice in ACCTID, in a description and in an id", () => {
        const file = builtFile(format, {
          block: [
            ["ACCTID", "000123456789"],
            ["ACCTID", "000555666777"],
          ],
          transactions: [
            {
              fields: fieldsOf({
                NAME: "A",
                MEMO: "000123456789 000555666777",
                FITID: "000555666777-1",
              }),
            },
          ],
        });
        const result = readOfx(file);
        const [statement] = statementsOf(result);
        expect(statement.rows[0].description).toBe("A - [hidden] [hidden]");
        expect(statement.rows[0].fitid).toBe("[hidden]-1");
        const everything = JSON.stringify(result);
        expect(everything).not.toContain("123456789");
        expect(everything).not.toContain("555666777");
      });
    });
  }

  it("blanks a number inside an ACCTID that holds more tags instead of text (XML)", () => {
    const file = builtFile("xml", {
      transactions: [{ fields: fieldsOf({ NAME: "A", MEMO: "TO 000555666777" }) }],
    }).replace(
      "<ACCTID>000123456789</ACCTID>",
      "<ACCTID>000123456789</ACCTID><ACCTID><PART>000555666777</PART></ACCTID>",
    );
    const result = readOfx(file);
    const [statement] = statementsOf(result);
    expect(statement.rows[0].description).toBe("A - TO [hidden]");
    expect(JSON.stringify(result)).not.toContain("555666777");
  });

  it("blanks both values of a repeated card number", () => {
    const card = fixtureText("card-statement.qfx");
    const doubled = card
      .replace("<ACCTID>9990001112223333", "<ACCTID>9990001112223333\n<ACCTID>8880004445556666")
      .replace("CARD 9990001112223333", "CARD 8880004445556666");
    const result = readOfx(doubled);
    const [statement] = statementsOf(result);
    expect(statement.rows[1].description).toBe("CORNER STORE - CARD [hidden]");
    expect(JSON.stringify(result)).not.toMatch(/8880004445556666|9990001112223333/);
  });

  it("blanks both values of a repeated investment account number", () => {
    const investment = [
      "<INVSTMTMSGSRSV1><INVSTMTTRNRS><INVSTMTRS><INVACCTFROM>",
      "<BROKERID>broker.example",
      "<ACCTID>5550001234",
      "<ACCTID>5550004321",
      "</INVACCTFROM></INVSTMTRS></INVSTMTTRNRS></INVSTMTMSGSRSV1>",
    ].join(NL);
    const file = smallFile({
      transactions: txn({ NAME: "A", MEMO: "TO 5550001234 AND 5550004321" }),
    }).replace("</OFX>", `${investment}${NL}</OFX>`);
    const result = readOfx(file);
    const [statement] = statementsOf(result);
    expect(statement.rows[0].description).toBe("A - TO [hidden] AND [hidden]");
    expect(JSON.stringify(result)).not.toMatch(/5550001234|5550004321/);
  });
});

describe("readOfx — account numbers as a bank really prints them", () => {
  const description = (account: string, name: string, memo: string | null = null) =>
    statementsOf(readOfx(smallFile({ account, transactions: txn({ NAME: name, MEMO: memo }) })))[0]
      .rows[0].description;

  describe("with its leading zeros dropped", () => {
    it("blanks the number when five or more digits remain", () => {
      expect(description("000123456789", "A", "FROM 123456789")).toBe("A - FROM [hidden]");
      expect(description("000123456789", "A", "FROM 1234-5678-9")).toBe("A - FROM [hidden]");
      expect(description("0000012345", "A", "FROM 12345 X")).toBe("A - FROM [hidden] X");
    });

    it("blanks it in a transaction id and leaks no digits", () => {
      const file = smallFile({ transactions: txn({ FITID: "T123456789-1", NAME: "A" }) });
      const result = readOfx(file);
      expect(statementsOf(result)[0].rows[0].fitid).toBe("T[hidden]-1");
      expect(JSON.stringify(result)).not.toContain("123456789");
    });

    it("does not blank four digits or fewer, which are an amount or a year as often as an account", () => {
      // The account is 0001234: with the zeros gone that is 1234, which is also a plain amount.
      expect(description("0001234", "A", "PAID 1234")).toBe("A - PAID 1234");
      expect(description("0001234", "A", "FROM 0001234")).toBe("A - FROM [hidden]");
      expect(description("000123456789", "A", "TOTAL 1234 AND 5678")).toBe(
        "A - TOTAL 1234 AND 5678",
      );
    });
  });

  describe("an ACCTID that holds the transit and the account together", () => {
    for (const joiner of [" ", "-", "  ", " - "]) {
      it(`blanks each part on its own, and the two together, when joined by "${joiner}"`, () => {
        const account = `04567${joiner}0001234567`;
        expect(description(account, "A", "FROM 0001234567")).toBe("A - FROM [hidden]");
        expect(description(account, "A", "FROM 04567")).toBe("A - FROM [hidden]");
        expect(description(account, "A", "FROM 045670001234567")).toBe("A - FROM [hidden]");
        expect(description(account, "A", "FROM 04567 0001234567")).toBe("A - FROM [hidden]");
        // The account part with its zeros dropped, as a memo prints it.
        expect(description(account, "A", "FROM 1234567")).toBe("A - FROM [hidden]");
      });
    }

    it("does not blank a part shorter than five digits on its own", () => {
      // 1234 is the transit, 123456789 the account; 1234 on its own is an amount.
      expect(description("1234 123456789", "A", "PAID 1234")).toBe("A - PAID 1234");
      expect(description("1234 123456789", "A", "FROM 123456789")).toBe("A - FROM [hidden]");
    });

    it("leaks no digit of either part in a result", () => {
      const file = smallFile({
        account: "04567-0001234567",
        transactions: [
          txn({ FITID: "A1", NAME: "X", MEMO: "TO 0001234567" }),
          txn({ FITID: "04567-1", NAME: "Y", MEMO: "BRANCH 04567" }),
        ].join(NL),
      });
      const result = readOfx(file);
      expect(JSON.stringify(result)).not.toMatch(/04567|0001234567|1234567/);
    });
  });

  describe("with a dot, a slash, an underscore or a middle dot between the groups", () => {
    const SEPARATORS: [string, string][] = [
      ["a dot", "."],
      ["a slash", "/"],
      ["an underscore", "_"],
      ["a middle dot", "\u00B7"],
      ["a full-width dot", "\uFF0E"],
      ["a dot and a space", ". "],
      ["a slash between spaces", " / "],
    ];
    it.each(SEPARATORS)("blanks the number written with %s between its groups", (_label, sep) => {
      const memo = ["FROM 0001", "2345", "6789 X"].join(sep);
      expect(description("000123456789", "A", memo)).toBe("A - FROM [hidden] X");
    });

    it("finds a dotted or slashed ACCTID as bare digits in a memo, and the other way round", () => {
      for (const account of ["0001.2345.6789", "0001/2345/6789", "0001_2345_6789"]) {
        expect(description(account, "A", "TO 000123456789")).toBe("A - TO [hidden]");
        expect(description(account, "A", "TO 0001-2345-6789")).toBe("A - TO [hidden]");
        expect(description(account, "A", "TO 0001.2345.6789")).toBe("A - TO [hidden]");
      }
    });

    it("blanks a dotted number in a transaction id, and keeps two ids that blank alike apart", () => {
      const file = smallFile({
        start: "20260101",
        end: "20260201",
        transactions: [
          txn({ FITID: "T-0001.2345.6789", TRNAMT: "10.00" }),
          txn({ FITID: "T-0001/2345/6789", TRNAMT: "10.00" }),
        ].join(NL),
      });
      const result = readOfx(file);
      const [statement] = statementsOf(result);
      expect(statement.rows.map((r) => r.fitid)).toEqual(["T-[hidden]", "T-[hidden]#2"]);
      expect(JSON.stringify(result)).not.toMatch(/6789|2345/);
    });

    it("leaves an amount and a date alone", () => {
      expect(description("000123456789", "A", "PAID 1234.56 ON 2026/01/05")).toBe(
        "A - PAID 1234.56 ON 2026/01/05",
      );
      expect(description("000123456789", "A", "REF 12.34/56.78")).toBe("A - REF 12.34/56.78");
    });
  });
});

describe("readOfx — many ids that blank to the same text", () => {
  // 14 bits of choice between two invisible characters after the account number: 16,384 different
  // ids that all read "[hidden]" once the number is blanked and the invisible marks are dropped.
  const collidingIds = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const marks = i.toString(2).padStart(14, "0").replace(/0/g, "\u200B").replace(/1/g, "\u200C");
      return `000123456789${marks}`;
    });

  it("reads 10,000 of them well inside the time limit, each kept apart", () => {
    const ids = collidingIds(10_000);
    const transactions = ids.map((fitid) => txn({ FITID: fitid, TRNAMT: "1.00" })).join(NL);
    const file = smallFile({ start: "20260101", end: "20260201", transactions });
    const started = performance.now();
    const result = readOfx(file);
    const millis = performance.now() - started;
    const [statement] = statementsOf(result);
    expect(statement.rows).toHaveLength(10_000);
    // All different, so none is taken for a repeat of another: the first is "[hidden]", then "#2"...
    expect(new Set(statement.rows.map((r) => r.fitid)).size).toBe(10_000);
    expect(statement.rows[0].fitid).toBe("[hidden]");
    expect(statement.rows[9_999].fitid).toBe("[hidden]#10000");
    expect(totalsOfAll(statement).rowsCounted).toBe(10_000);
    expect(JSON.stringify(result)).not.toContain("123456789");
    // Linear: a few dozen milliseconds. Searching for the next free suffix from 2 every time took
    // seconds here (the review has both numbers).
    expect(millis).toBeLessThan(1000);
  });

  it("skips a suffix that another id already has, once, and still keeps all apart", () => {
    const file = smallFile({
      start: "20260101",
      end: "20260201",
      transactions: [
        txn({ FITID: "[hidden]#2" }),
        txn({ FITID: "000123456789" }),
        txn({ FITID: "0001 2345 6789" }),
        txn({ FITID: "0001-2345-6789" }),
        txn({ FITID: "000123456789\u200B" }),
      ].join(NL),
    });
    const [statement] = statementsOf(readOfx(file));
    expect(statement.rows.map((r) => r.fitid)).toEqual([
      "[hidden]#2",
      "[hidden]",
      "[hidden]#3",
      "[hidden]#4",
      "[hidden]#5",
    ]);
  });
});

describe("readOfx — the known limits are as the review lists them", () => {
  // docs/connectors/ofx-reader-review.md ("Known limits of the account number filter") and the
  // header of read-ofx.ts say exactly which characters between or in place of the digits of a
  // number are looked through and which are not. This pins both lists, so the words and the code
  // cannot drift apart: a limit that is fixed later fails here and the lists are updated together.
  const char = (code: number) => String.fromCodePoint(code);
  const memoWith = (gap: string) => ["FROM 0001", "2345", "6789 X"].join(gap);
  const blanked = (memo: string) =>
    statementsOf(readOfx(smallFile({ transactions: txn({ NAME: "A", MEMO: memo }) })))[0].rows[0]
      .description;

  const LOOKED_THROUGH: [string, string][] = [
    ["no-break space", char(0xa0)],
    ["ideographic space", char(0x3000)],
    ["zero-width space", char(0x200b)],
    ["zero-width joiner", char(0x200d)],
    ["word joiner", char(0x2060)],
    ["byte-order mark", char(0xfeff)],
    ["soft hyphen", char(0xad)],
    ["left-to-right mark", char(0x200e)],
    ["tag character", char(0xe0041)],
    ["Mongolian vowel separator U+180E", char(0x180e)],
    ["en dash", char(0x2013)],
    ["full-width dot", char(0xff0e)],
    ["one-dot leader", char(0x2024)],
    ["middle dot", char(0xb7)],
  ];
  it.each(LOOKED_THROUGH)("looks through a %s between the groups", (_label, gap) => {
    expect(blanked(memoWith(gap))).toBe("A - FROM [hidden] X");
  });

  const NOT_LOOKED_THROUGH: [string, string][] = [
    ["combining acute accent", char(0x301)],
    ["emoji variation selector", char(0xfe0f)],
    ["keycap", char(0x20e3)],
    ["Mongolian free variation selector U+180B", char(0x180b)],
    ["Hangul filler U+3164", char(0x3164)],
    ["Hangul choseong filler U+115F", char(0x115f)],
    ["braille blank", char(0x2800)],
    ["private-use character", char(0xe000)],
    ["hyphenation point", char(0x2027)],
    ["bullet", char(0x2022)],
    ["bullet operator", char(0x2219)],
    ["Katakana middle dot", char(0x30fb)],
    ["comma", ","],
    ["colon", ":"],
    ["backslash", "\\"],
    ["asterisk", "*"],
    ["four dashes (a gap wider than three)", "----"],
  ];
  it.each(NOT_LOOKED_THROUGH)(
    "does not find a number with a %s between the groups",
    (_label, gap) => {
      expect(blanked(memoWith(gap))).not.toContain("[hidden]");
    },
  );

  it("folds full-width, superscript and circled digits, and not the digits of other scripts", () => {
    // 000123456789 written with the ten digits of a script that starts at this code point.
    const spelled = (zero: number) =>
      "000123456789"
        .split("")
        .map((d) => char(zero + Number(d)))
        .join("");
    expect(blanked(`FROM ${spelled(0xff10)} X`)).toBe("A - FROM [hidden] X"); // full-width
    expect(blanked(`FROM ${spelled(0x1d7ce)} X`)).toBe("A - FROM [hidden] X"); // mathematical bold
    expect(blanked(`FROM 000${char(0xb9)}${char(0xb2)}${char(0xb3)}456789 X`)).toBe(
      "A - FROM [hidden] X",
    ); // superscript 1 2 3
    expect(blanked(`FROM ${spelled(0x660)} X`)).not.toContain("[hidden]"); // Arabic-Indic
    expect(blanked(`FROM ${spelled(0x966)} X`)).not.toContain("[hidden]"); // Devanagari
  });
});

describe("readOfx — the slowest files the caps let through", () => {
  // The scrubber looks for up to 30 numbers in every description and id. A text that nearly spells
  // them all is the worst case: a pattern that retried from every character took 10 s (and was
  // refused as too slow) on the first file below. The figures are in the review.
  const zeros = (count: number) => "0".repeat(count);
  /** A download of about this many megabytes, every row carrying the same memo. */
  const crowded = (numbers: string[], memo: string, megabytes: number, extra: Fields = []) => {
    const rows = Math.floor((megabytes * 1024 * 1024) / 745);
    return builtFile("sgml", {
      block: [["BANKID", "003"], ...numbers.map((n): [string, string] => ["ACCTID", n]), ...extra],
      transactions: Array.from({ length: rows }, (_, i) => ({
        fields: fieldsOf({ NAME: null, MEMO: memo, FITID: `F${i}` }),
      })),
    });
  };

  it("reads 10 MB of dashed zeros that stop one digit short of 30 different numbers", () => {
    // Numbers 0...01 of 10 to 39 zeros. Each memo is 296 zeros joined by dashes and then a gap too
    // wide to belong to a number, then the 1: every number is "there" digit for digit and none matches.
    const numbers = Array.from({ length: 30 }, (_, k) => `${zeros(10 + k)}1`);
    const file = crowded(numbers, `${"0-".repeat(295)}0----1`, 9.9);
    const started = performance.now();
    const result = readOfx(file);
    const millis = performance.now() - started;
    const [statement] = statementsOf(result);
    expect(statement.rows.length).toBeGreaterThan(13_000);
    expect(statement.rows[0].description).not.toContain("[hidden]");
    expect(millis).toBeLessThan(6000);
  }, 30_000);

  it("reads the same kind of file when the numbers are made of letters and digits", () => {
    // Numbers with a letter in them are matched as plain text, one pass of the text each.
    const letters = Array.from({ length: 15 }, (_, k) => `${"q".repeat(10 + k)}z`);
    const digits = Array.from({ length: 15 }, (_, k) => `${zeros(10 + k)}1`);
    const memo = `${letters.join(" ")} ${"0-".repeat(100)}0----1`.slice(0, 595);
    const file = crowded([...digits, ...letters], memo, 5);
    const started = performance.now();
    const [statement] = statementsOf(readOfx(file));
    const millis = performance.now() - started;
    expect(statement.rows[0].description).toContain("[hidden]");
    expect(statement.rows[0].description).not.toContain("qqqq");
    expect(millis).toBeLessThan(6000);
  }, 30_000);
});

describe("readOfx — the last cases from the third check", () => {
  for (const format of FORMATS) {
    describe(format, () => {
      const read = (transactions: { fields: Fields; to?: Fields }[]) =>
        statementsOf(readOfx(builtFile(format, { transactions })))[0];

      it("doesn't count a correction notice that names no row (it would add a deletion as money)", () => {
        for (const action of ["DELETE", "REPLACE"]) {
          const statement = read([
            { fields: fieldsOf({ FITID: "A1", TRNAMT: "100.00" }) },
            { fields: fieldsOf({ FITID: "C1", TRNAMT: "150.00" }, [["CORRECTACTION", action]]) },
          ]);
          expect(Number.isNaN(byFitid(statement.rows, "C1").cents), action).toBe(true);
          expect(totalsOfAll(statement).months.map((m) => m.amountCents), action).toEqual([10000]);
        }
      });

      it("keeps a row in another currency apart from the statement's own (OFX's CURRENCY inside a row)", () => {
        const withBlock = (tag: string, fields: Fields) => {
          const text = builtFile(format, {
            transactions: [
              { fields: fieldsOf({ FITID: "A1", TRNAMT: "50.00" }) },
              { fields: fieldsOf({ FITID: "U1", TRNAMT: "100.00" }) },
            ],
          });
          // Put the block inside the second transaction only.
          const at = text.lastIndexOf("</STMTTRN>");
          return statementsOf(
            readOfx(text.slice(0, at) + aggregate(format, tag, fields) + NL + text.slice(at)),
          )[0];
        };
        const usd = withBlock("CURRENCY", [["CURRATE", "1.37"], ["CURSYM", "USD"]]);
        expect(byFitid(usd.rows, "U1").currency).toBe("USD");
        expect(totalsOfAll(usd).months.map((m) => m.amountCents)).toEqual([5000]);
        // ORIGCURRENCY means the amount was already converted into the statement's currency.
        const converted = withBlock("ORIGCURRENCY", [["CURRATE", "1.37"], ["CURSYM", "USD"]]);
        expect(byFitid(converted.rows, "U1").currency).toBe("CAD");
        expect(totalsOfAll(converted).months.map((m) => m.amountCents)).toEqual([15000]);
        // A CURRENCY block with no readable symbol leaves the row unread, never counted as CAD.
        const unclear = withBlock("CURRENCY", [["CURRATE", "1.37"]]);
        expect(Number.isNaN(byFitid(unclear.rows, "U1").cents)).toBe(true);
      });

      it("reads an amount written with no whole part, like -.50", () => {
        const statement = read([
          { fields: fieldsOf({ FITID: "A1", TRNAMT: "-.50" }) },
          { fields: fieldsOf({ FITID: "A2", TRNAMT: ".75" }) },
          { fields: fieldsOf({ FITID: "A3", TRNAMT: "-." }) },
          { fields: fieldsOf({ FITID: "A4", TRNAMT: "-" }) },
        ]);
        expect(byFitid(statement.rows, "A1").cents).toBe(-50);
        expect(byFitid(statement.rows, "A2").cents).toBe(75);
        expect(Number.isNaN(byFitid(statement.rows, "A3").cents)).toBe(true);
        expect(Number.isNaN(byFitid(statement.rows, "A4").cents)).toBe(true);
      });
    });
  }

  describe("an account number with letters in it", () => {
    const description = (account: string, memo: string) =>
      statementsOf(readOfx(smallFile({ account, transactions: txn({ NAME: "A", MEMO: memo }) })))[0]
        .rows[0].description;

    it("blanks the digit run of a credit union's share number (123456789S01)", () => {
      expect(description("123456789S01", "TRANSFER FROM 123456789")).toBe("A - TRANSFER FROM [hidden]");
      expect(description("123456789-S01", "TRANSFER FROM 1234 5678 9")).toBe(
        "A - TRANSFER FROM [hidden]",
      );
    });

    it("blanks it in a transaction id and leaks no digits", () => {
      const file = smallFile({
        account: "123456789-S01",
        transactions: txn({ FITID: "123456789-20260105-1", NAME: "A" }),
      });
      const result = readOfx(file);
      expect(JSON.stringify(result)).not.toContain("123456789");
    });

    it("blanks the digits of an IBAN-style number however they are spaced", () => {
      const result = readOfx(
        smallFile({
          account: "GB29NWBK60161331926819",
          transactions: txn({ NAME: "A", MEMO: "FROM GB29 NWBK 6016 1331 9268 19" }),
        }),
      );
      expect(JSON.stringify(result).replace(/\s/g, "")).not.toContain("60161331926819");
    });

    it("still leaves four-digit numbers alone (an amount or a year)", () => {
      expect(description("123456789S01", "TOTAL 1234 IN 2026")).toBe("A - TOTAL 1234 IN 2026");
    });
  });
});

describe("looksLikeOfx", () => {
  const head = (name: string) => fixture(name).subarray(0, 4096);

  it("recognises an OFX 1.x header, an OFX 2.x processing instruction and a bare <OFX>", () => {
    for (const name of [
      "canadian-chequing-sgml.ofx",
      "canadian-chequing-xml.ofx",
      "card-statement.qfx",
    ]) {
      expect(looksLikeOfx(head(name)), name).toBe(true);
    }
    expect(looksLikeOfx(new TextEncoder().encode("<OFX><BANKMSGSRSV1/></OFX>"))).toBe(true);
  });

  it("doesn't take a spreadsheet, a PDF or ordinary text for one", () => {
    expect(looksLikeOfx(new TextEncoder().encode("Date,Amount\n2026-01-05,10.00\n"))).toBe(false);
    expect(looksLikeOfx(new TextEncoder().encode("%PDF-1.4"))).toBe(false);
    expect(looksLikeOfx(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0, 0]))).toBe(false);
  });
});

describe("an OFX file on the spreadsheet path", () => {
  // Until the bank screen exists, "Add from a file" asks where a file is from and turns a bank
  // file away. If someone answers wrongly ("accounting software"), an OFX file must still not come
  // out as a revenue proposal. lib/figures/file/sniff.ts therefore needs no change.
  it("is read as plain text and produces no totals and no proposal", async () => {
    for (const name of [
      "canadian-chequing-sgml.ofx",
      "canadian-chequing-xml.ofx",
      "card-statement.qfx",
    ]) {
      const preview = await previewFile(name, fixture(name), TODAY);
      expect(preview.guess, name).toBeNull();
      expect(preview.state, name).not.toBe("ready");
      expect(preview.result, name).toBeNull();
    }
  });
});

describe("the package underneath", () => {
  const manifest = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(path.join(process.cwd(), "package-lock.json"), "utf8"));

  it("is pinned to exactly the version that was reviewed (no ^ or ~)", () => {
    expect(manifest.dependencies["ofx-js"]).toBe("1.1.2");
    expect(lock.packages[""].dependencies["ofx-js"]).toBe("1.1.2");
    expect(lock.packages["node_modules/ofx-js"].version).toBe("1.1.2");
  });

  it("is the same file that was read: a change to it fails here until it is read again", () => {
    // sha-256 of ofx-js 1.1.2's ofx.js as published to npm, recorded in the review. A newer
    // version, or an edited copy, changes it. Re-read the new code (the package is 220 lines) and
    // update this and the review together.
    const code = readFileSync(path.join(process.cwd(), "node_modules", "ofx-js", "ofx.js"));
    expect(createHash("sha256").update(code).digest("hex")).toBe(
      "06056641e8d850005df9617382e306141132ebb07af401346ad88fea211d34e6",
    );
    expect(lock.packages["node_modules/ofx-js"].integrity).toBe(
      "sha512-aKGgu+/vF70vvPpjSuAiTy+jroSb2JVtKDf72U9ZgCf8/zZk/lOuzRbOc73Fn9xdecolBOBW5i1c6uVkj0r1zw==",
    );
  });

  it("is imported by the wrapper alone, so every use of it goes through the filter", () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (
          /\.(ts|tsx|mts|js|jsx|mjs)$/.test(entry) &&
          /from\s+["']ofx-js/.test(readFileSync(full, "utf8"))
        ) {
          importers.push(path.relative(process.cwd(), full).split(path.sep).join("/"));
        }
      }
    };
    for (const folder of ["app", "components", "lib", "desktop"])
      walk(path.join(process.cwd(), folder));
    expect(importers).toEqual(["lib/figures/bank/read-ofx.ts"]);
  });
});
