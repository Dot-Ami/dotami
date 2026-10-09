/**
 * [8c] Drop a file — .xlsx bytes → rows of cells.
 *
 * Reads inside the app's own window, in memory. Two safety looks happen BEFORE the workbook is
 * opened for real: a cheap listing of what is inside the zip (macros? really a workbook? absurdly
 * large?), then the actual read with read-excel-file.
 *
 * Imports read-excel-file/universal on purpose: it parses the XML on the page's own thread, where
 * its /browser and /web-worker entries rebuild the parser inside workers from the source text of
 * its functions — more moving parts for no gain at these file sizes. Unzipping still uses one
 * worker for a large, well-compressed part (fflate's rule: over 512 KB unpacked); the app's
 * Content-Security-Policy allows that through 'strict-dynamic', and e2e/app.spec.ts "a large
 * workbook reads without freezing" proves it. Nothing here keeps the bytes or logs a cell, and no
 * library error text is ever shown (it could echo something from the file).
 *
 * What the library does, found by reading it and by the tests in tests/figures-file-read.spec.ts:
 *  - leading empty rows and columns are kept as empty cells, so rows[i][j] is Excel row i+1, column
 *    j+1; only trailing empty rows and columns are cut off;
 *  - a merged range gives its value in the top-left cell only, the rest come back empty (DotAmi
 *    never fills down);
 *  - a formula gives its cached value (the number Excel last saved); one with none is empty, and
 *    findUnsavedFormulas below says where each such cell is, so it isn't taken for an empty one;
 *  - an error cell (#DIV/0!) is empty;
 *  - the 1904 date system (some old Mac files) is honoured.
 */

import { unzipSync } from "fflate";
import readXlsxFile from "read-excel-file/universal";
import { MACROS_MESSAGE, XLSB_MESSAGE } from "./sniff";
import type { Cell, CellPlace, ReadResult } from "./types";
import { sheetPartPaths, unsavedFormulaPlaces } from "./unsaved-formulas";

const NOT_A_WORKBOOK_ZIP =
  "That looks like a compressed file, but DotAmi can't open it as an Excel workbook. Save it again as .xlsx or .csv and drop that.";
const NOT_XLSX = "That isn't an Excel .xlsx workbook. Save it as .xlsx or .csv and drop that.";
const ODS_MESSAGE =
  "That's an OpenDocument spreadsheet (.ods). Save a copy as .xlsx or .csv and drop that.";
const TOO_LARGE_INSIDE =
  "Opened up, that workbook is too large for DotAmi to read safely. Export just the period you need and drop that.";
const LIBRARY_FAILED =
  "DotAmi couldn't read that workbook. Save it again as .xlsx or .csv and drop that.";

/** What the zip says it holds: an entry's path and its size once unpacked. */
export interface ZipEntry {
  name: string;
  originalSize: number;
}

// Zip-bomb limits, applied to the XML parts only (those are what actually get unpacked and parsed;
// pictures and the like are skipped). A real 10 MB workbook unpacks to a few tens of MB of XML.
const MAX_XML_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_XML_ENTRY_BYTES = 100 * 1024 * 1024;

/**
 * Decide from the zip's entry list alone whether this is a workbook DotAmi will open. Returns the
 * message to show, or null when it is fine. Pure so it can be tested with a made-up list (a real
 * zip bomb is hard to build in a test).
 */
export function checkWorkbookEntries(entries: ZipEntry[]): string | null {
  const names = new Set(entries.map((e) => e.name));

  // A macro workbook, however it was named. Macros live in vbaProject.bin.
  if (entries.some((e) => /(^|\/)vbaproject\.bin$/i.test(e.name))) return MACROS_MESSAGE;

  // Not an .xlsx: say what it is when we can tell, since the person can't see inside a zip.
  if (!names.has("xl/workbook.xml")) {
    if (names.has("xl/workbook.bin")) return XLSB_MESSAGE;
    if (names.has("content.xml") && names.has("mimetype")) return ODS_MESSAGE;
    return NOT_XLSX;
  }

  // Zip-bomb guard, from the sizes the zip declares.
  let total = 0;
  for (const e of entries) {
    if (!/\.(xml|rels)$/i.test(e.name)) continue;
    if (e.originalSize > MAX_XML_ENTRY_BYTES) return TOO_LARGE_INSIDE;
    total += e.originalSize;
  }
  if (total > MAX_XML_TOTAL_BYTES) return TOO_LARGE_INSIDE;

  return null;
}

/**
 * The library hands back a date-formatted cell as a Date that still carries the time of day (a
 * cell showing 2025-01-01 may hold 18:00 underneath). DotAmi only wants the day Excel shows, as
 * UTC midnight, so the same day is the same Date whatever the person's time zone.
 */
function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const WORKBOOK_PART = "xl/workbook.xml";
const WORKBOOK_RELS_PART = "xl/_rels/workbook.xml.rels";

/** Unpacks only the named parts (the rest are listed by the zip and skipped, never inflated). */
function unpack(bytes: Uint8Array, names: Set<string>): Record<string, string> {
  const parts = unzipSync(bytes, { filter: (f) => names.has(f.name) });
  const decoder = new TextDecoder();
  return Object.fromEntries(
    Object.entries(parts).map(([name, data]) => [name, decoder.decode(data)]),
  );
}

/**
 * Where each sheet holds a formula saved with no value (unsaved-formulas.ts), one list per sheet in
 * the workbook's order; null when that can't be worked out. Only the workbook's sheet list, its
 * relationships and the sheets themselves are unpacked, all inside the limits checkWorkbookEntries
 * has already applied. Null leaves the sheets as the library read them: such a cell is then
 * "no amount", as before, and still never counted.
 */
function findUnsavedFormulas(bytes: Uint8Array): CellPlace[][] | null {
  try {
    const index = unpack(bytes, new Set([WORKBOOK_PART, WORKBOOK_RELS_PART]));
    const workbook = index[WORKBOOK_PART];
    const rels = index[WORKBOOK_RELS_PART];
    if (workbook === undefined || rels === undefined) return null;
    const paths = sheetPartPaths(workbook, rels);
    const sheets = unpack(bytes, new Set(paths.filter((p): p is string => p !== null)));
    return paths.map((path) => {
      const xml = path === null ? undefined : sheets[path];
      return xml === undefined ? [] : unsavedFormulaPlaces(xml);
    });
  } catch {
    return null;
  }
}

export async function readXlsx(bytes: Uint8Array): Promise<ReadResult> {
  // 1. Look inside first. fflate calls the filter once per entry with the entry's details taken
  //    from the zip's directory, and only unpacks entries the filter accepts. Ours rejects them
  //    all, so this lists names and sizes without inflating anything.
  const entries: ZipEntry[] = [];
  try {
    unzipSync(bytes, {
      filter: (f) => {
        entries.push({ name: f.name, originalSize: f.originalSize });
        return false;
      },
    });
  } catch {
    return { ok: false, error: NOT_A_WORKBOOK_ZIP };
  }

  const refusal = checkWorkbookEntries(entries);
  if (refusal) return { ok: false, error: refusal };

  // 2. Read every sheet. The library wants an ArrayBuffer (or Blob) of exactly the file, so copy
  //    out the viewed range when `bytes` is a slice of a larger buffer.
  try {
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;

    // trim: false keeps text exactly as written, like the CSV reader does.
    const sheets = await readXlsxFile(buffer, { trim: false });
    // 3. Which of the empty cells are formulas Excel never worked out (see findUnsavedFormulas).
    const unsaved = findUnsavedFormulas(bytes);

    return {
      ok: true,
      format: "xlsx",
      sheets: sheets.map((s, index) => ({
        name: s.sheet,
        rows: s.data.map((row) =>
          row.map((value): Cell => {
            // The library's .d.ts types a date cell as `typeof Date` (the constructor); at run time
            // it is a Date, so go through unknown.
            const cell = value as unknown as Cell;
            return cell instanceof Date ? toUtcMidnight(cell) : cell;
          }),
        ),
        // The library returns the sheets in the workbook's order, the order these were found in.
        ...(unsaved ? { unsavedFormulas: unsaved[index] ?? [] } : {}),
      })),
    };
  } catch {
    // Never pass the library's own message on: it can quote part of the file.
    return { ok: false, error: LIBRARY_FAILED };
  }
}
