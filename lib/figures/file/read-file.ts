/**
 * [8c] Drop a file — the one entry point: file name + bytes → rows.
 *
 * This runs in the browser, inside the page. The bytes are read in memory and are never sent
 * anywhere or stored; only the monthly totals the person later agrees to leave the page go through
 * /api/figures/propose. No exception text and nothing from the file is logged or returned.
 */

import { decodeText } from "./decode";
import { readCsv } from "./read-csv";
import { readXlsx } from "./read-xlsx";
import { sniffFile } from "./sniff";
import type { ReadResult } from "./types";

/** How much of the file the format check looks at. */
const HEAD_BYTES = 8192;

const GNUCASH_NOT_HERE =
  "That's a GnuCash book, which is read with the books reader, not as a spreadsheet.";

export async function readSpreadsheet(name: string, bytes: Uint8Array): Promise<ReadResult> {
  try {
    const sniffed = sniffFile(name, bytes.length, bytes.subarray(0, HEAD_BYTES));
    if (!sniffed.ok) return sniffed;
    // A GnuCash book is read by the books reader, never as a spreadsheet. The window sends it there
    // before this is called; this only stops a book reaching the CSV reader by mistake.
    if (sniffed.format === "gnucash") return { ok: false, error: GNUCASH_NOT_HERE };

    if (sniffed.format === "csv") return readCsv(decodeText(bytes), name);
    return await readXlsx(bytes);
  } catch {
    // Anything we didn't foresee: a short fixed sentence, never the exception's own text.
    return { ok: false, error: "DotAmi couldn't read that file. Nothing was kept." };
  }
}
