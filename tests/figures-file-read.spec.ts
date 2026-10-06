/**
 * [8c] Drop a file — the readers: bytes → rows of cells (lib/figures/file/sniff, decode, read-csv,
 * read-xlsx, read-file). Nothing here touches the disk or the network; the workbooks are built in
 * memory by tests/helpers/make-xlsx.ts.
 */
import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { decodeText } from "@/lib/figures/file/decode";
import { readSpreadsheet } from "@/lib/figures/file/read-file";
import { readCsv } from "@/lib/figures/file/read-csv";
import { checkWorkbookEntries, readXlsx } from "@/lib/figures/file/read-xlsx";
import {
  MACROS_MESSAGE,
  NOT_SHEET_MESSAGE,
  XLSB_MESSAGE,
  sniffFile,
} from "@/lib/figures/file/sniff";
import { MAX_FILE_BYTES } from "@/lib/figures/file/types";
import { makeXlsx } from "./helpers/make-xlsx";

const bytesOf = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => new TextEncoder().encode(s);
const MB = 1024 * 1024;

/** Rewrite one part of an .xlsx, for tests that need XML the helper doesn't produce. */
function editPart(xlsx: Uint8Array, part: string, edit: (xml: string) => string): Uint8Array {
  const files = unzipSync(xlsx);
  files[part] = strToU8(edit(new TextDecoder().decode(files[part])));
  return zipSync(files);
}

/** Pull the error out of a failed result (fails the test if the read succeeded). */
function errorOf(result: Awaited<ReturnType<typeof readXlsx>>): string {
  if (result.ok) throw new Error("expected the read to be refused");
  return result.error;
}

describe("sniffFile", () => {
  const plain = text("date,amount\n2026-01-05,10\n");

  it("refuses an empty file", () => {
    expect(sniffFile("a.csv", 0, new Uint8Array())).toEqual({
      ok: false,
      error: "That file is empty.",
    });
  });

  it("refuses a file over 10 MB, judged by the size passed in and not the bytes", () => {
    const r = sniffFile("big.csv", MAX_FILE_BYTES + 1, plain);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("over 10 MB");
    // Exactly the limit is still fine.
    expect(sniffFile("ok.csv", MAX_FILE_BYTES, plain)).toEqual({ ok: true, format: "csv" });
  });

  it("refuses macro workbooks by name, whatever the case", () => {
    for (const n of ["a.xlsm", "A.XLSM", "t.xltm", "add-in.xlam"]) {
      expect(sniffFile(n, 100, bytesOf(0x50, 0x4b, 3, 4))).toEqual({
        ok: false,
        error: MACROS_MESSAGE,
      });
    }
  });

  it("refuses .xlsb by name", () => {
    expect(sniffFile("a.XLSB", 100, bytesOf(0x50, 0x4b, 3, 4))).toEqual({
      ok: false,
      error: XLSB_MESSAGE,
    });
  });

  it("refuses the old Office container (.xls, or a password-locked workbook), even when named .xlsx", () => {
    const head = bytesOf(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0);
    for (const n of ["old.xls", "locked.xlsx"]) {
      const r = sniffFile(n, 5000, head);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("older Excel file (.xls) or one locked with a password");
    }
  });

  it("sends a zip on to the xlsx reader, which looks inside", () => {
    expect(sniffFile("a.xlsx", 100, bytesOf(0x50, 0x4b, 3, 4, 0, 0))).toEqual({
      ok: true,
      format: "xlsx",
    });
    // The name doesn't matter, the content does.
    expect(sniffFile("export.dat", 100, bytesOf(0x50, 0x4b, 3, 4))).toEqual({
      ok: true,
      format: "xlsx",
    });
  });

  it("refuses pictures, PDFs and video even when renamed .xlsx or .csv", () => {
    const heads: Record<string, Uint8Array> = {
      png: bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      jpeg: bytesOf(0xff, 0xd8, 0xff, 0xe0),
      gif: text("GIF89a......"),
      pdf: text("%PDF-1.7\n"),
      webp: new Uint8Array([...text("RIFF"), 1, 2, 3, 4, ...text("WEBP")]),
      heic: new Uint8Array([0, 0, 0, 0x18, ...text("ftypheic")]),
      emptyZip: bytesOf(0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0),
    };
    for (const [kind, head] of Object.entries(heads)) {
      for (const n of ["sales.xlsx", "sales.csv"]) {
        expect(sniffFile(n, 5000, head), `${kind} named ${n}`).toEqual({
          ok: false,
          error: NOT_SHEET_MESSAGE,
        });
      }
    }
  });

  it("accepts UTF-16 text (full of NUL bytes) as a CSV", () => {
    expect(sniffFile("u.csv", 20, bytesOf(0xff, 0xfe, 0x61, 0, 0x2c, 0))).toEqual({
      ok: true,
      format: "csv",
    });
    expect(sniffFile("u.csv", 20, bytesOf(0xfe, 0xff, 0, 0x61, 0, 0x2c))).toEqual({
      ok: true,
      format: "csv",
    });
  });

  it("refuses anything with a NUL byte that isn't UTF-16", () => {
    expect(sniffFile("data.csv", 100, bytesOf(0x61, 0x2c, 0x00, 0x62))).toEqual({
      ok: false,
      error: NOT_SHEET_MESSAGE,
    });
  });

  it("treats ordinary text as a CSV whatever its name", () => {
    expect(sniffFile("export.xlsx", 100, plain)).toEqual({ ok: true, format: "csv" });
    expect(sniffFile("export.txt", 100, plain)).toEqual({ ok: true, format: "csv" });
  });
});

describe("decodeText", () => {
  it("strips a UTF-8 byte-order mark", () => {
    const out = decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...text("Date,Montant")]));
    expect(out).toBe("Date,Montant");
    expect(out.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("reads plain UTF-8 with accents", () => {
    expect(decodeText(text("Montant reçu"))).toBe("Montant reçu");
  });

  it("falls back to windows-1252 for bytes that are not UTF-8 (Excel on Windows)", () => {
    // "Montant reçu" with ç saved as the single byte 0xE7.
    const latin = new Uint8Array([...text("Montant re"), 0xe7, ...text("u")]);
    expect(decodeText(latin)).toBe("Montant reçu");
    // 0x80 is the euro sign in windows-1252.
    expect(decodeText(bytesOf(0x80, 0x35))).toBe("€5");
  });

  it("reads UTF-16 little-endian and big-endian, dropping the mark", () => {
    const le = new Uint8Array([0xff, 0xfe, 0x44, 0x00, 0xe9, 0x00]); // "Dé"
    const be = new Uint8Array([0xfe, 0xff, 0x00, 0x44, 0x00, 0xe9]);
    expect(decodeText(le)).toBe("Dé");
    expect(decodeText(be)).toBe("Dé");
  });

  it("never returns a leading U+FEFF", () => {
    // A mark that survives: UTF-8 bytes of U+FEFF twice (BOM then a real one).
    const out = decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0xef, 0xbb, 0xbf, 0x61]));
    expect(out.charCodeAt(0)).not.toBe(0xfeff);
  });
});

describe("readCsv", () => {
  function rowsOf(csv: string) {
    const r = readCsv(csv, "f.csv");
    if (!r.ok) throw new Error(r.error);
    return r.sheets[0].rows;
  }

  it("names the sheet after the file and reports csv", () => {
    const r = readCsv("a,b\n1,2\n", "ventes.csv");
    expect(r).toEqual({
      ok: true,
      format: "csv",
      sheets: [
        {
          name: "ventes.csv",
          rows: [
            ["a", "b"],
            ["1", "2"],
          ],
        },
      ],
    });
  });

  it("reads a semicolon file with accented headers and decimal commas, as text", () => {
    const rows = rowsOf(
      "Date;Montant reçu;Catégorie\n05/01/2026;1 234,56;Vente\n06/01/2026;-12,50;Remboursement\n",
    );
    expect(rows).toEqual([
      ["Date", "Montant reçu", "Catégorie"],
      ["05/01/2026", "1 234,56", "Vente"],
      ["06/01/2026", "-12,50", "Remboursement"],
    ]);
  });

  it("reads a tab-separated file", () => {
    expect(rowsOf("date\tamount\n2026-01-05\t10.5\n")).toEqual([
      ["date", "amount"],
      ["2026-01-05", "10.5"],
    ]);
  });

  it("reads a quoted field with an embedded comma and an embedded doubled quote", () => {
    const rows = rowsOf('id,note,amount\n1,"Smith, J. said ""hello""",10\n');
    expect(rows[1]).toEqual(["1", 'Smith, J. said "hello"', "10"]);
  });

  it("reads CRLF line endings without leaving a carriage return in a cell", () => {
    const rows = rowsOf("a,b\r\n1,2\r\n3,4\r\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("drops only the single empty row a trailing newline makes", () => {
    expect(rowsOf("a,b\n1,2\n")).toHaveLength(2);
    expect(rowsOf("a,b\n1,2")).toHaveLength(2);
    // A second trailing newline is the person's own blank row and stays.
    expect(rowsOf("a,b\n1,2\n\n")).toEqual([["a", "b"], ["1", "2"], [""]]);
  });

  it("keeps blank lines in the middle so row numbers line up with the file", () => {
    const rows = rowsOf("title\n\ndate,amount\n2026-01-05,10\n");
    expect(rows).toHaveLength(4);
    expect(rows[1]).toEqual([""]);
    expect(rows[2]).toEqual(["date", "amount"]);
  });

  it("keeps empty cells as empty text and values untouched (no number or date guessing)", () => {
    expect(rowsOf("a,b,c\n007,,2026-01-05\n")[1]).toEqual(["007", "", "2026-01-05"]);
  });

  it("reads a one-column file as one column", () => {
    expect(rowsOf("amount\n10\n20\n")).toEqual([["amount"], ["10"], ["20"]]);
  });

  it("works through decodeText for a file with a byte-order mark", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...text("Date,Montant\n2026-01-05,10\n")]);
    expect(rowsOf(decodeText(bytes))[0]).toEqual(["Date", "Montant"]);
  });

  it("refuses a quote that is never closed, saying which row it starts on", () => {
    const r = readCsv('date,amount\n2026-01-05,"10\n2026-01-06,20\n', "f.csv");
    expect(r).toEqual({
      ok: false,
      error:
        "Row 2 has a quote that isn't closed, so DotAmi can't tell where that cell ends. Fix it in the file and drop it again.",
    });
  });

  it("says a file with no rows has no rows", () => {
    expect(readCsv("", "f.csv")).toEqual({ ok: false, error: "That file has no rows." });
    expect(readCsv("\n\n", "f.csv")).toEqual({ ok: false, error: "That file has no rows." });
  });
});

describe("readXlsx", () => {
  async function sheetsOf(xlsx: Uint8Array) {
    const r = await readXlsx(xlsx);
    if (!r.ok) throw new Error(r.error);
    return r.sheets;
  }

  it("reads several sheets, in order, with their names", async () => {
    const sheets = await sheetsOf(
      makeXlsx([
        {
          name: "Janvier",
          rows: [
            ["Date", "Montant"],
            ["a", 1],
          ],
        },
        { name: "Février & mars", rows: [["x"]] },
      ]),
    );
    expect(sheets.map((s) => s.name)).toEqual(["Janvier", "Février & mars"]);
    expect(sheets[0].rows).toEqual([
      ["Date", "Montant"],
      ["a", 1],
    ]);
    expect(sheets[1].rows).toEqual([["x"]]);
  });

  it("reports format xlsx", async () => {
    const r = await readXlsx(makeXlsx([{ name: "S", rows: [["a"]] }]));
    expect(r.ok && r.format).toBe("xlsx");
  });

  it("reads shared strings with accents and XML-special characters, untrimmed", async () => {
    const sheets = await sheetsOf(
      makeXlsx([{ name: "S", rows: [["Montant reçu", "A & B <c>", "  padded  ", "Catégorie"]] }]),
    );
    expect(sheets[0].rows[0]).toEqual(["Montant reçu", "A & B <c>", "  padded  ", "Catégorie"]);
  });

  it("reads numbers as numbers, including decimals and negatives", async () => {
    const sheets = await sheetsOf(makeXlsx([{ name: "S", rows: [[1234.5, -12, 0.1]] }]));
    expect(sheets[0].rows[0]).toEqual([1234.5, -12, 0.1]);
  });

  it("returns a date-formatted cell as a Date at UTC midnight of the day Excel shows", async () => {
    const sheets = await sheetsOf(
      makeXlsx([{ name: "S", rows: [[{ date: "2025-01-01" }, { date: "2026-03-31" }]] }]),
    );
    const [a, b] = sheets[0].rows[0];
    expect(a).toBeInstanceOf(Date);
    expect((a as Date).toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect((b as Date).toISOString()).toBe("2026-03-31T00:00:00.000Z");
  });

  it("drops the time of day from a date-time cell (18:00 on 1 Jan is still 1 Jan)", async () => {
    const xlsx = editPart(
      makeXlsx([{ name: "S", rows: [[{ date: "2025-01-01" }]] }]),
      "xl/worksheets/sheet1.xml",
      (xml) => xml.replace("<v>45658</v>", "<v>45658.75</v>"),
    );
    const cell = (await sheetsOf(xlsx))[0].rows[0][0] as Date;
    expect(cell.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("reads the 1904 date system correctly (serial 44196 is 2025-01-01)", async () => {
    const xlsx = makeXlsx([{ name: "S", rows: [[{ date: "2025-01-01" }]] }], { date1904: true });
    // The helper wrote the 1904-system serial; check that, so the test can't pass by accident.
    const sheetXml = new TextDecoder().decode(unzipSync(xlsx)["xl/worksheets/sheet1.xml"]);
    expect(sheetXml).toContain("<v>44196</v>");
    const cell = (await sheetsOf(xlsx))[0].rows[0][0] as Date;
    expect(cell.toISOString()).toBe("2025-01-01T00:00:00.000Z");
  });

  it("keeps cells where they are: a first value at C3 is rows[2][2], with blank rows and columns before it", async () => {
    const sheets = await sheetsOf(
      makeXlsx([
        {
          name: "S",
          origin: "C3",
          rows: [
            ["Date", "Amount"],
            [{ date: "2025-02-03" }, 99],
          ],
        },
      ]),
    );
    const rows = sheets[0].rows;
    expect(rows[2][2]).toBe("Date");
    expect(rows[2][3]).toBe("Amount");
    expect((rows[3][2] as Date).toISOString()).toBe("2025-02-03T00:00:00.000Z");
    expect(rows[3][3]).toBe(99);
    // Everything before C3 is empty, and rows[0] / rows[1] exist as blank rows.
    expect(rows).toHaveLength(4);
    expect(rows[0].every((c) => c === null)).toBe(true);
    expect(rows[1].every((c) => c === null)).toBe(true);
    expect(rows[2][0]).toBeNull();
    expect(rows[2][1]).toBeNull();
  });

  it("keeps a blank row in the middle of a sheet", async () => {
    const sheets = await sheetsOf(makeXlsx([{ name: "S", rows: [["h"], [null], ["x"]] }]));
    expect(sheets[0].rows[1].every((c) => c === null)).toBe(true);
    expect(sheets[0].rows[2][0]).toBe("x");
  });

  it("gives a merged range's value in its top-left cell only; the rest are empty (never filled down)", async () => {
    const sheets = await sheetsOf(
      makeXlsx([
        {
          name: "S",
          rows: [
            ["Region", "Sales"],
            ["", ""],
            ["", ""],
            ["", ""],
            ["West", 100],
            [null, 200],
            [null, 300],
          ],
          merges: ["A5:A7"],
        },
      ]),
    );
    const rows = sheets[0].rows;
    expect(rows[4][0]).toBe("West");
    expect(rows[5][0]).toBeNull();
    expect(rows[6][0]).toBeNull();
    expect(rows[5][1]).toBe(200);
  });

  it("gives a formula cell its cached value", async () => {
    const sheets = await sheetsOf(
      makeXlsx([
        {
          name: "S",
          rows: [
            ["x", "x2"],
            [10, { formula: "A2*2", value: 20 }],
          ],
        },
      ]),
    );
    expect(sheets[0].rows[1]).toEqual([10, 20]);
  });

  it("refuses a workbook that carries vbaProject.bin even though it is named .xlsx", async () => {
    const r = await readXlsx(makeXlsx([{ name: "S", rows: [["a"]] }], { withMacros: true }));
    expect(r).toEqual({ ok: false, error: MACROS_MESSAGE });
  });

  it("spots vbaProject.bin in any folder and in any case", () => {
    expect(
      checkWorkbookEntries([
        { name: "xl/workbook.xml", originalSize: 10 },
        { name: "XL/VBAPROJECT.BIN", originalSize: 10 },
      ]),
    ).toBe(MACROS_MESSAGE);
    expect(
      checkWorkbookEntries([
        { name: "xl/workbook.xml", originalSize: 10 },
        { name: "other/vbaProject.bin", originalSize: 10 },
      ]),
    ).toBe(MACROS_MESSAGE);
  });

  it("recognises an .xlsb-shaped zip", async () => {
    const zip = zipSync({
      "xl/workbook.bin": strToU8("x"),
      "[Content_Types].xml": strToU8("<a/>"),
    });
    expect(await readXlsx(zip)).toEqual({ ok: false, error: XLSB_MESSAGE });
  });

  it("recognises an .ods-shaped zip", async () => {
    const zip = zipSync({
      mimetype: strToU8("application/vnd.oasis.opendocument.spreadsheet"),
      "content.xml": strToU8("<office:document-content/>"),
    });
    const r = await readXlsx(zip);
    expect(errorOf(r)).toContain("OpenDocument spreadsheet (.ods)");
  });

  it("says a .docx-shaped zip isn't an Excel workbook", async () => {
    const zip = zipSync({
      "[Content_Types].xml": strToU8("<Types/>"),
      "word/document.xml": strToU8("<w:document/>"),
    });
    expect(errorOf(await readXlsx(zip))).toBe(
      "That isn't an Excel .xlsx workbook. Save it as .xlsx or .csv and drop that.",
    );
  });

  it("says a zip-signature file that isn't a readable zip is a compressed file it can't open", async () => {
    const r = await readXlsx(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(errorOf(r)).toContain("looks like a compressed file");
  });

  it("refuses a workbook whose parts would unpack too large (a real highly-compressible 101 MB part)", async () => {
    // 101 MB of zeros deflates to roughly 100 KB; only the zip's directory is read to catch it.
    const zip = zipSync(
      {
        "xl/workbook.xml": strToU8("<workbook/>"),
        "xl/worksheets/sheet1.xml": new Uint8Array(101 * MB),
      },
      { level: 1 },
    );
    expect(zip.length).toBeLessThan(2 * MB);
    expect(errorOf(await readXlsx(zip))).toContain("too large for DotAmi to read safely");
  });

  it("applies the zip-bomb limits to a made-up entry list", () => {
    const base = { name: "xl/workbook.xml", originalSize: 1000 };
    // One part over 100 MB.
    expect(
      checkWorkbookEntries([
        base,
        { name: "xl/worksheets/sheet1.xml", originalSize: 100 * MB + 1 },
      ]),
    ).toContain("too large");
    // Exactly 100 MB in one part is allowed.
    expect(
      checkWorkbookEntries([base, { name: "xl/worksheets/sheet1.xml", originalSize: 100 * MB }]),
    ).toBeNull();
    // Three 70 MB parts: each fine, 210 MB together is not.
    const three = [1, 2, 3].map((i) => ({
      name: `xl/worksheets/sheet${i}.xml`,
      originalSize: 70 * MB,
    }));
    expect(checkWorkbookEntries([base, ...three])).toContain("too large");
    // Big pictures aren't unpacked, so they don't count.
    expect(
      checkWorkbookEntries([base, { name: "xl/media/image1.png", originalSize: 900 * MB }]),
    ).toBeNull();
    // .rels parts count like .xml.
    expect(
      checkWorkbookEntries([base, { name: "xl/_rels/workbook.xml.rels", originalSize: 150 * MB }]),
    ).toContain("too large");
  });

  it("answers a corrupt sheet with a plain sentence that doesn't echo the file", async () => {
    const xlsx = editPart(
      makeXlsx([{ name: "S", rows: [["a"]] }]),
      "xl/worksheets/sheet1.xml",
      () =>
        "<worksheet><sheetData><row r='1'><c r='A1' t='s'><v>SECRET-9999</v></c></row></sheetData></worksheet>",
    );
    const r = await readXlsx(xlsx);
    expect(errorOf(r)).toBe(
      "DotAmi couldn't read that workbook. Save it again as .xlsx or .csv and drop that.",
    );
    expect(errorOf(r)).not.toContain("SECRET");
  });

  it("reads from a Uint8Array that is a view into a larger buffer", async () => {
    const xlsx = makeXlsx([{ name: "S", rows: [["in a view"]] }]);
    const big = new Uint8Array(xlsx.length + 100);
    big.set(xlsx, 50);
    const view = big.subarray(50, 50 + xlsx.length);
    expect((await sheetsOf(view))[0].rows[0][0]).toBe("in a view");
  });
});

describe("readSpreadsheet (end to end)", () => {
  it("reads a CSV file", async () => {
    const bytes = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...text("Date;Montant reçu\n05/01/2026;1 234,56\n"),
    ]);
    const r = await readSpreadsheet("ventes.csv", bytes);
    expect(r).toEqual({
      ok: true,
      format: "csv",
      sheets: [
        {
          name: "ventes.csv",
          rows: [
            ["Date", "Montant reçu"],
            ["05/01/2026", "1 234,56"],
          ],
        },
      ],
    });
  });

  it("reads a Windows-1252 CSV file", async () => {
    const bytes = new Uint8Array([...text("Montant re"), 0xe7, ...text("u;Date\n1;2\n")]);
    const r = await readSpreadsheet("a.csv", bytes);
    expect(r.ok && r.sheets[0].rows[0][0]).toBe("Montant reçu");
  });

  it("reads an xlsx file", async () => {
    const r = await readSpreadsheet(
      "sales.xlsx",
      makeXlsx([
        {
          name: "Sales",
          rows: [
            ["Date", "Amount"],
            [{ date: "2026-01-05" }, 10],
          ],
        },
      ]),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.format).toBe("xlsx");
      expect(r.sheets[0].name).toBe("Sales");
      expect((r.sheets[0].rows[1][0] as Date).toISOString()).toBe("2026-01-05T00:00:00.000Z");
    }
  });

  it("turns away a PNG renamed .xlsx, a .xlsm and an empty file", async () => {
    const png = bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
    expect(await readSpreadsheet("sales.xlsx", png)).toEqual({
      ok: false,
      error: NOT_SHEET_MESSAGE,
    });
    const xlsx = makeXlsx([{ name: "S", rows: [["a"]] }]);
    expect(await readSpreadsheet("sales.xlsm", xlsx)).toEqual({ ok: false, error: MACROS_MESSAGE });
    expect(await readSpreadsheet("a.csv", new Uint8Array())).toEqual({
      ok: false,
      error: "That file is empty.",
    });
  });

  it("turns away a macro workbook named .xlsx", async () => {
    const xlsx = makeXlsx([{ name: "S", rows: [["a"]] }], { withMacros: true });
    expect(await readSpreadsheet("sales.xlsx", xlsx)).toEqual({ ok: false, error: MACROS_MESSAGE });
  });

  it("answers anything unexpected with one fixed sentence", async () => {
    const r = await readSpreadsheet("a.csv", null as unknown as Uint8Array);
    expect(r).toEqual({ ok: false, error: "DotAmi couldn't read that file. Nothing was kept." });
  });
});
