/**
 * [8c] Drop a file — what kind of file is this?
 *
 * Looks at the file's first bytes (plus its size and name) BEFORE anything is read, so an image
 * renamed "sales.xlsx", an old .xls, a macro workbook or a 2 GB export is turned away with a plain
 * sentence instead of being fed to a parser. The CONTENT decides the format; the name is only
 * consulted for the two extensions that can't be told apart by content alone (.xlsm / .xlsb), and
 * even then it can only refuse a file, never accept one.
 *
 * Runs in the browser and keeps nothing: the bytes are never sent or stored.
 */

import { MAX_FILE_BYTES } from "./types";

export type Sniffed = { ok: true; format: "csv" | "xlsx" } | { ok: false; error: string };

// The refusals are exported because read-xlsx.ts says the same things when it looks inside a zip.
export const MACROS_MESSAGE =
  "That workbook has macros. DotAmi never runs macros — open it in Excel, save a copy as .xlsx (Excel removes the macros), and drop that copy.";
export const XLSB_MESSAGE =
  "That's an Excel binary workbook (.xlsb). Save a copy as .xlsx or .csv and drop that.";
export const NOT_SHEET_MESSAGE = "That isn't a spreadsheet. DotAmi reads .xlsx and .csv files.";
// A PDF here is most likely a tax return: point to the button that reads one ([8f]).
export const PDF_MESSAGE =
  "That's a PDF. This reads .xlsx and .csv files. For last year's tax return, press Cancel and use Add from last year's return.";

const EMPTY_MESSAGE = "That file is empty.";
const TOO_BIG_MESSAGE =
  "That file is over 10 MB, more than DotAmi reads. Export just the period you need, or save it as CSV, and drop that.";
const XLS_MESSAGE =
  "That's an older Excel file (.xls) or one locked with a password. Open it in Excel, save a copy as .xlsx without a password, and drop that copy.";

/** True when `head` begins with exactly these bytes (at `offset`). */
function hasBytes(head: Uint8Array, bytes: number[], offset = 0): boolean {
  if (head.length < offset + bytes.length) return false;
  return bytes.every((b, i) => head[offset + i] === b);
}

/** True when `head` holds this ASCII text at `offset`. */
function hasAscii(head: Uint8Array, text: string, offset = 0): boolean {
  return hasBytes(
    head,
    Array.from(text, (c) => c.charCodeAt(0)),
    offset,
  );
}

/** Signatures of files that are definitely not a spreadsheet, however they were named. */
function looksLikeAnotherFormat(head: Uint8Array): boolean {
  return (
    hasBytes(head, [0x89, 0x50, 0x4e, 0x47]) || // PNG
    hasBytes(head, [0xff, 0xd8, 0xff]) || // JPEG
    hasAscii(head, "GIF8") || // GIF
    (hasAscii(head, "RIFF") && hasAscii(head, "WEBP", 8)) || // WEBP
    hasAscii(head, "ftyp", 4) || // HEIC / MP4 / MOV
    hasBytes(head, [0x50, 0x4b, 0x05, 0x06]) // a zip with nothing in it
  );
}

/**
 * @param name file name as the person's computer gave it
 * @param size the file's full size in bytes (not just `head`)
 * @param head the first bytes of the file, up to 8192 of them
 */
export function sniffFile(name: string, size: number, head: Uint8Array): Sniffed {
  const refuse = (error: string): Sniffed => ({ ok: false, error });
  const lowerName = name.toLowerCase();

  if (size === 0) return refuse(EMPTY_MESSAGE);
  if (size > MAX_FILE_BYTES) return refuse(TOO_BIG_MESSAGE);

  // Macro-enabled and binary workbooks are zips (or OLE files) like any other; only the name says so.
  if (/\.(xlsm|xltm|xlam)$/.test(lowerName)) return refuse(MACROS_MESSAGE);
  if (lowerName.endsWith(".xlsb")) return refuse(XLSB_MESSAGE);

  // D0 CF 11 E0 A1 B1 1A E1: the old Office container. Both .xls and password-locked .xlsx use it.
  if (hasBytes(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return refuse(XLS_MESSAGE);

  // "PK\3\4": a zip. read-xlsx.ts looks inside to tell a workbook from any other zip.
  if (hasBytes(head, [0x50, 0x4b, 0x03, 0x04])) return { ok: true, format: "xlsx" };

  if (hasAscii(head, "%PDF")) return refuse(PDF_MESSAGE);
  if (looksLikeAnotherFormat(head)) return refuse(NOT_SHEET_MESSAGE);

  // A UTF-16 text file (Excel's "Unicode Text") is full of NUL bytes, so check its byte-order mark
  // before the NUL test below.
  if (hasBytes(head, [0xff, 0xfe]) || hasBytes(head, [0xfe, 0xff])) {
    return { ok: true, format: "csv" };
  }

  // Text never contains a NUL byte; programs and databases do.
  if (head.includes(0)) return refuse(NOT_SHEET_MESSAGE);

  return { ok: true, format: "csv" };
}
