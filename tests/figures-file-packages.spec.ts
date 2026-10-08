import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeText } from "@/lib/figures/file/decode";
import { previewFile as runLikeTheScreen } from "@/lib/figures/file/preview";
import type { FileAnswers as Answers, FilePreview as ScreenRun } from "@/lib/figures/file/preview";
import { isBlankRow } from "@/lib/figures/file/table";
import { isRealCalendarDay } from "@/lib/figures/validate";
import * as quickbooks from "./fixtures/packages/quickbooks-online";
import type { PracticeFile } from "./fixtures/packages/types";
import * as xero from "./fixtures/packages/xero";
import { utf8, utf8Bom, windows1252 } from "./helpers/encode";

// [8c-3] Practice files shaped like each accounting program's export, run through the same steps
// the "Add from a file" screen runs (read, guess the columns, work out the date order and decimal
// style, add up by month): lib/figures/file/preview.ts, which the screen calls too. Every file is INVENTED and built in code; see
// docs/connectors/practice-files.md. A passing test here means "DotAmi reads a file SHAPED like
// this", never "a real export works": each guessed column title is marked `assumed` in its fixture.

/** The person's own calendar day, fixed so "is this month over yet" never depends on the clock. */
const TODAY = "2026-10-06";

/** Every package with practice files. A new package is added here AND in tests/fixtures/packages/. */
const PACKAGES = {
  xero: { sources: xero.sources, files: xero.files },
  "quickbooks-online": { sources: quickbooks.sources, files: quickbooks.files },
};
const ALL_FILES: PracticeFile[] = Object.values(PACKAGES).flatMap((p) => p.files);

/** The answers a person gives on the screen for a file: the columns they pick, and how dates are written. */
function answersFor(file: PracticeFile): Answers {
  return {
    dateColumn: file.expected.picks?.dateColumn,
    amountColumn: file.expected.picks?.amountColumn,
    dateOrder: file.expected.answer,
  };
}

function find(id: string): PracticeFile {
  const file = ALL_FILES.find((f) => f.id === id);
  if (!file) throw new Error(`no practice file called ${id}`);
  return file;
}

/** Rows from just below the column names to the last row with anything in it. */
function rowsBelowHeader(run: ScreenRun): number {
  const header = run.picks.headerRow ?? 0;
  let last = run.rows.length - 1;
  while (last > header && isBlankRow(run.rows[last])) last -= 1;
  return last - header;
}

describe("encode helpers", () => {
  it("writes plain UTF-8 and UTF-8 with the three-byte mark", () => {
    expect([...utf8("é")]).toEqual([0xc3, 0xa9]);
    const withMark = utf8Bom("é");
    expect([...withMark.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(decodeText(withMark)).toBe("é");
  });

  it("writes Windows-1252 as one byte per letter, and the reader gets the same words back", () => {
    expect([...windows1252("reçu")]).toEqual([...utf8("re"), 0xe7, ...utf8("u")]);
    expect(decodeText(windows1252("Montant reçu"))).toBe("Montant reçu");
    // Every Latin-1 letter and sign has the same byte as its Unicode number.
    const latin1 = Array.from({ length: 0x100 - 0xa0 }, (_, i) =>
      String.fromCharCode(0xa0 + i),
    ).join("");
    expect(new TextDecoder("windows-1252").decode(windows1252(latin1))).toBe(latin1);
    expect(windows1252("a\r\nb").length).toBe(4);
  });

  it("refuses a character it can't write, and the error never repeats the text", () => {
    expect(() => windows1252("5 €")).toThrow(/U\+20AC/);
    expect(() => windows1252("it’s")).toThrow(/U\+2019/);
    let message = "";
    try {
      windows1252("client Atelier Nord €");
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message).not.toContain("Atelier");
  });
});

describe("every package says where its layout came from", () => {
  it("has a fixture module registered here for every file in tests/fixtures/packages", () => {
    const modules = readdirSync(new URL("./fixtures/packages/", import.meta.url))
      .filter((name) => name.endsWith(".ts") && !["types.ts", "csv.ts"].includes(name))
      .map((name) => name.replace(/\.ts$/, ""))
      .sort();
    expect(modules).toEqual(Object.keys(PACKAGES).sort());
  });

  for (const [name, pkg] of Object.entries(PACKAGES)) {
    it(`${name}: lists vendor pages, each with an https address and the day it was read`, () => {
      expect(pkg.sources.length).toBeGreaterThan(0);
      for (const source of pkg.sources) {
        expect(source.url).toMatch(/^https:\/\/[^\s]+$/);
        expect(source.url).not.toMatch(/[?#]/); // an address, never a query that could carry a figure
        expect(source.read).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(isRealCalendarDay(source.read)).toBe(true);
        expect(source.says.length).toBeGreaterThan(10);
      }
    });

    it(`${name}: marks every column title documented or assumed, citing one of its pages`, () => {
      const urls = new Set(pkg.sources.map((s) => s.url));
      expect(pkg.files.length).toBeGreaterThan(0);
      for (const file of pkg.files) {
        expect(file.columns.length).toBeGreaterThan(1);
        for (const column of file.columns) {
          expect(["documented", "assumed"]).toContain(column.status);
          expect(
            urls.has(column.basis),
            `${file.id}: "${column.header}" cites a page not in sources`,
          ).toBe(true);
        }
      }
    });

    it(`${name}: says in its own header that everything is invented`, () => {
      const source = readFileSync(
        new URL(`./fixtures/packages/${name}.ts`, import.meta.url),
        "utf8",
      );
      expect(source).toContain("EVERYTHING HERE IS INVENTED");
    });
  }

  it("gives every practice file its own id", () => {
    const ids = ALL_FILES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(ALL_FILES)("$id", (file) => {
  it("finds the column names row and guesses the columns as recorded", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.guess).not.toBeNull();
    const guess = run.guess!;
    expect({
      headerRow: guess.headerRow,
      dateColumn: guess.dateColumn,
      amountColumn: guess.amountColumn,
    }).toEqual(file.expected.guess);
    // The titles the file really holds are the ones the fixture marks documented or assumed.
    expect(guess.columns.map((c) => c.label)).toEqual(file.columns.map((c) => c.header));
  });

  it("reads the dates and the amounts the way the file writes them", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(run.detectedOrder).toEqual(file.expected.dateOrder);
    expect(run.detectedStyle).toBe(file.expected.decimalStyle);
  });

  it("adds up each month to the cent and lists every row it leaves out", async () => {
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    expect(run.state).toBe("ready");
    const result = run.result!;
    expect(result.months).toEqual(file.expected.months);
    expect(result.skipped).toEqual(file.expected.skipped);
    // Every row below the column names is either in a month or listed, none dropped.
    expect(result.rowsCounted).toBe(result.months.reduce((sum, m) => sum + m.rows, 0));
    expect(result.rowsCounted + result.skipped.length).toBe(rowsBelowHeader(run));
  });
});

describe("Xero", () => {
  it("waits for the person's answer when no date proves the order, then reads it as told", async () => {
    const file = find("xero-ambiguous");
    const asked = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, {
      dateColumn: xero.INVOICE_DATE,
    });
    expect(asked.state).toBe("waiting");
    expect(asked.waitingFor).toBe("date-order-answer");
    expect(asked.result).toBeNull();
  });

  it("files the same rows under other months when the order is read the other way", async () => {
    const file = find("xero-ambiguous");
    const other = xero.AMBIGUOUS_READ_MONTH_FIRST;
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, {
      dateColumn: xero.INVOICE_DATE,
      dateOrder: other.answer,
    });
    expect(run.result!.months).toEqual(other.months);
    expect(run.result!.skipped).toEqual(other.skipped);
    expect(run.result!.months).not.toEqual(file.expected.months);
  });

  it("writes the French file in windows-1252, which is not valid UTF-8, so the reader's fallback is what runs", () => {
    const bytes = find("xero-france").bytes();
    expect(bytes).toContain(0xe9); // é as one byte
    expect(() => new TextDecoder("utf-8", { fatal: true }).decode(bytes)).toThrow();
    expect(decodeText(bytes)).toContain("Société Inventée A");
  });

  it("UnitAmount is a price per item: summing it falls short of what was invoiced", async () => {
    const file = find("xero-dmy");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY, answersFor(file));
    const summed = Object.fromEntries(
      run.result!.months.map((m) => [m.periodStart.slice(0, 7), m.amountCents]),
    );
    const invoiced = xero.invoicedCents(xero.MAIN_LINES);
    // July: 3 x 100.00 + 50.00 was invoiced, but the column holds 100.00 + 50.00.
    expect(invoiced["2026-07"]).toBe(35000);
    expect(summed["2026-07"]).toBe(15000);
    expect(invoiced["2026-08"]).toBe(18000);
    expect(summed["2026-08"]).toBe(10000);
    // A month where every line sold one item is the one place the two agree.
    expect(summed["2026-09"]).toBe(invoiced["2026-09"]);
  });

  it("the true totals written beside the wrong-today figures in the fixture match the line data", () => {
    // French file: July sold 1 x 1100,00 and 2 x 80,50; August sold one item at 250,00.
    expect(xero.invoicedCents(xero.FRANCE_LINES)).toMatchObject({
      "2026-07": 126100,
      "2026-08": 25000,
    });
    // Read month-first, 02/07/2026 is 7 February: put each line in the month its day number names.
    const readMonthFirst = xero.AMBIGUOUS_LINES.map((l) => {
      const [year, month, day] = l.date.split("-");
      return { ...l, date: `${year}-${day}-${month}` };
    });
    expect(xero.invoicedCents(readMonthFirst)).toMatchObject({
      "2026-02": 32500,
      "2026-03": 12000,
      "2026-05": 7500,
      "2026-09": 5000,
    });
  });
});

/*
 * KNOWN GAPS. Each test below states what DotAmi SHOULD do and uses `it.fails`, so it passes only
 * while today's code gets it wrong. The day a fix lands the test errors, which is the signal to
 * turn it into a normal test (and update the matching "WRONG TODAY" value in its fixture). Each
 * names the open decision for the maintainer; nothing here changes lib/ or components/.
 */
describe("known gaps (fail today, by design)", () => {
  // Open decision: should price-per-item columns stop being pre-filled? lib/figures/file/table.ts
  // already says "better an empty dropdown than a wrong income figure"; "UnitAmount" slips past
  // its not-revenue test. Today the amount dropdown arrives pre-filled with UnitAmount.
  it.fails(
    "Xero: does not pre-fill UnitAmount as the amount (a price per item, not a total)",
    async () => {
      const file = find("xero-dmy");
      const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
      expect(run.picks.amountColumn).toBeNull();
    },
  );

  // Open decision: should the date guess prefer the invoice date over the due date? Today neither
  // is pre-filled, because "InvoiceDate" and "DueDate" have no word boundary for the "date" test
  // and both columns are mostly dates.
  it.fails("Xero: pre-fills InvoiceDate as the date column", async () => {
    const file = find("xero-dmy");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.dateColumn).toBe(xero.INVOICE_DATE);
  });

  // Open decision: should group names and "Total for" rows stop counting against a date column?
  // With one line per customer they outnumber the dates, so the Date column is left unguessed.
  // This depends on an ASSUMED layout (names and "Total for" rows in the Date column; no listed
  // source documents it), so it is a gap in the practice file, not yet proven in a real export.
  it.fails("QuickBooks: pre-fills Date when each customer has only one line", async () => {
    const file = find("quickbooks-grouped-sparse");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    expect(run.picks.dateColumn).toBe(0);
  });

  // Open decision: what should happen when a transaction list mixes sales with the payments
  // received for them? (pick a "type" column and skip Payment rows; or warn and name the report to
  // export instead; or only add a line of help.) Today every row is added, so a $47.60 invoice and
  // its $47.60 payment count as $95.20.
  it.fails("QuickBooks: does not count a Payment row as a second sale", async () => {
    const file = find("quickbooks-transaction-list");
    const run = await runLikeTheScreen(file.fileName, file.bytes(), TODAY);
    const july = run.result!.months.find((m) => m.periodStart === "2026-07-01");
    expect(july?.amountCents).toBe(10215); // invoice 47.60 + sales receipt 54.55
  });
});

describe("the practice files stay private and in step with the screen", () => {
  it("the screen takes its steps from lib/figures/file/preview.ts, the code these tests run", () => {
    const screen = readFileSync(
      new URL("../components/ventures/file-drop.tsx", import.meta.url),
      "utf8",
    );
    // If this fails, file-drop.tsx stopped using the shared steps and has its own again, which is
    // the copy that used to drift from what these tests check.
    for (const piece of ["previewSheet(", "guessPicks(", "firstSheetWithRows("]) {
      expect(screen, `file-drop.tsx no longer calls ${piece}`).toContain(piece);
    }
    // The steps themselves must not be repeated in the screen.
    for (const piece of [
      "monthlyTotals(",
      "guessColumns(",
      "detectDateOrder(",
      "detectDecimalStyle(",
    ]) {
      expect(screen, `file-drop.tsx calls ${piece} itself`).not.toContain(piece);
    }
  });

  it("nothing here writes to the console", () => {
    const names = [
      "../tests/figures-file-packages.spec.ts",
      "../tests/helpers/encode.ts",
      ...readdirSync(new URL("./fixtures/packages/", import.meta.url)).map(
        (name) => `../tests/fixtures/packages/${name}`,
      ),
    ];
    for (const name of names) {
      const source = readFileSync(new URL(name, import.meta.url), "utf8");
      expect(source, `${name} writes to the console`).not.toMatch(/console\s*\./);
    }
  });
});
