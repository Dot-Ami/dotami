/**
 * [8f] Read last year's return — is this a PDF at all? Looked at BEFORE the reader loads.
 *
 * A PDF starts with "%PDF-" (readers accept it anywhere in the first 1024 bytes, after junk some
 * programs put in front; ISO 32000-1 annex H.3 note). The content decides, never the file's name:
 * a picture renamed "return.pdf" is turned away here, and a PDF without the .pdf ending is read.
 */

import { MAX_RETURN_BYTES, type RefusalCode } from "./types";

/** How far into the file the "%PDF-" signature may sit. */
const SIGNATURE_WINDOW = 1024;

export function sniffPdf(size: number, head: Uint8Array): { ok: true } | { ok: false; code: RefusalCode } {
  if (size === 0) return { ok: false, code: "empty" };
  if (size > MAX_RETURN_BYTES) return { ok: false, code: "too-big" };
  const start = head.subarray(0, SIGNATURE_WINDOW);
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let i = 0; i + signature.length <= start.length; i += 1) {
    if (signature.every((b, k) => start[i + k] === b)) return { ok: true };
  }
  return { ok: false, code: "not-pdf" };
}
