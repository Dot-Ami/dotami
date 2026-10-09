/**
 * [8h] Is this file a GnuCash book? Told from its first bytes, without loading the book reader.
 *
 * Kept apart from gnucash-xml.ts so the spreadsheet drop's format check (lib/figures/file/sniff.ts)
 * can ask the question without pulling the unpacker and the XML reader into the ideas page: those
 * load only in the books worker, once a book has been chosen.
 */

/**
 * The largest GnuCash book DotAmi reads, compressed or not (the maintainer's decision, 2026-10-07:
 * a larger limit than a spreadsheet's, read by a background worker). A compressed book is also
 * stopped if it unpacks past MAX_UNPACKED_BYTES in gnucash-xml.ts.
 */
export const MAX_BOOK_BYTES = 50 * 1024 * 1024;

export const BOOK_TOO_BIG_MESSAGE = "That GnuCash book is over 50 MB, more than DotAmi reads.";

export const GNUCASH_SQLITE_MESSAGE =
  "That's a GnuCash book saved as a database (SQLite), which DotAmi can't read yet. If you have GnuCash, File > Save As lets you save a copy in the XML format, and DotAmi reads that.";

/** True for a text file whose first real character is "<". */
export function startsLikeXml(bytes: Uint8Array): boolean {
  let i = 0;
  // Skip a UTF-8 byte-order mark and any leading whitespace.
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) i = 3;
  while (
    i < bytes.length &&
    (bytes[i] === 0x20 || bytes[i] === 0x09 || bytes[i] === 0x0a || bytes[i] === 0x0d)
  ) {
    i += 1;
  }
  return bytes[i] === 0x3c;
}

/** 1F 8B: how every gzip file begins. GnuCash compresses its XML books this way by default. */
export const isGzip = (bytes: Uint8Array) =>
  bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b;

/** "SQLite format 3" and a NUL: how every SQLite database file begins. */
export function isSqlite(bytes: Uint8Array): boolean {
  const magic = "SQLite format 3\u0000";
  return (
    bytes.length >= magic.length && Array.from(magic).every((c, i) => bytes[i] === c.charCodeAt(0))
  );
}

/**
 * Could these first bytes be a GnuCash XML book? True for a gzip file (it can only be told for sure
 * once opened, and readGnuCashBook then says plainly if it isn't a book) and for XML that opens a
 * gnc-v2 element early on. The window uses it to send a dropped file to the books reader rather
 * than to the spreadsheet reader.
 */
export function looksLikeGnuCash(head: Uint8Array): boolean {
  if (isGzip(head)) return true;
  if (!startsLikeXml(head)) return false;
  return new TextDecoder("utf-8").decode(head.subarray(0, 2048)).includes("<gnc-v2");
}
