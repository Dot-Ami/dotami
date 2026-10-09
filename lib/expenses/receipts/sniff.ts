/**
 * [8i] What kind of file is this receipt? Decided from its bytes, never from its name or the type
 * the browser reported (expense-records.md § 7, check 1).
 *
 * Runs in the window before a file is sent, so a refused file never leaves it, and again on the
 * server when a receipt is added (the server is the one that decides). Pure: a byte array in, an
 * answer out, nothing kept.
 *
 * Accepted: JPEG, PNG, WebP, HEIC and PDF, each only when its signature is at the very first byte. A file
 * that is two things at once (a "polyglot": a JPEG whose later bytes are also a web page) is taken as
 * what its first bytes say, and the stored type is that one, so whatever shows it later picks its
 * reader from that type and never from anything in the file's other half.
 *
 * For a picture, the width and height are read from its header and checked against the pixel limits
 * BEFORE anything decodes it, so a small file that claims a huge picture is refused unopened.
 *
 * HEIC (the maintainer's choice of option D, 2026-10-09; docs/connectors/heic-decoder-review.md): the
 * first box must be `ftyp` with a major brand of `heic`, `heix` or `mif1` (and `mif1` only with a HEIC
 * brand among the compatible ones), and DotAmi's own container reader (heic/picture.ts, heicHeader)
 * must find one still picture whose size is inside the caps and whose data is inside the file. A file
 * with a HEIC brand that isn't one (the brand, then a JPEG or nothing) is refused as damaged; a burst,
 * animation or layered picture is refused as not one photo. Nothing here decodes the picture.
 */

import { heicHeader } from "./heic/picture";
import { MAX_IMAGE_PIXELS, MAX_IMAGE_SIDE, MAX_RECEIPT_BYTES, type ReceiptRefusalCode, type ReceiptType } from "./types";

export type SniffResult =
  | { ok: true; type: ReceiptType; width: number | null; height: number | null }
  | { ok: false; code: ReceiptRefusalCode };

const startsWith = (bytes: Uint8Array, signature: readonly number[], at = 0) =>
  bytes.length >= at + signature.length && signature.every((b, i) => bytes[at + i] === b);

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, Math.min(to, bytes.length)));

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
// `>>> 0` keeps a value with the top bit set positive.
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u32le = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

type Size = { width: number; height: number } | null;

/**
 * A JPEG's size, from its first frame header (SOF0-SOF15 except the three markers that share the
 * range: DHT C4, JPG C8, DAC CC). Walks the segments from the start; a frame header that never comes
 * before the image data, or a segment that runs off the end, means the file is damaged.
 */
function jpegSize(b: Uint8Array): Size {
  let i = 2;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) return null;
    // A marker may be padded with extra 0xFF bytes.
    while (i < b.length && b[i] === 0xff) i += 1;
    if (i >= b.length) return null;
    const marker = b[i];
    i += 1;
    // Markers with no length: TEM, RST0-7, and a stray SOI.
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // End of image or start of the image data, with no frame header yet.
    if (marker === 0xd9 || marker === 0xda) return null;
    if (i + 1 >= b.length) return null;
    const length = u16be(b, i);
    if (length < 2 || i + length > b.length) return null;
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      if (length < 7) return null;
      // Precision (1 byte), then height and width.
      return { height: u16be(b, i + 3), width: u16be(b, i + 5) };
    }
    i += length;
  }
  return null;
}

/** A PNG's size, from its IHDR chunk, which the format requires to come first and be 13 bytes. */
function pngSize(b: Uint8Array): Size {
  if (b.length < 24 || u32be(b, 8) !== 13 || ascii(b, 12, 16) !== "IHDR") return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

/** A WebP's size, from its first chunk: lossy (VP8), lossless (VP8L) or extended (VP8X). */
function webpSize(b: Uint8Array): Size {
  if (b.length < 30) return null;
  const chunk = ascii(b, 12, 16);
  if (chunk === "VP8 ") {
    // A key frame: 3-byte frame tag, then the start code 9D 01 2A, then 14-bit width and height.
    if (!startsWith(b, [0x9d, 0x01, 0x2a], 23)) return null;
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    // Signature 0x2F, then width - 1 and height - 1 in 14 bits each.
    if (b[20] !== 0x2f) return null;
    const bits = u32le(b, 21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    // Flags and three reserved bytes, then the canvas width - 1 and height - 1 in 24 bits each.
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  }
  return null;
}

/**
 * Every brand an ISO media file ("ftyp" box) uses for HEIF files, still or not. Only for naming a
 * refusal: what is ACCEPTED is decided by heic/picture.ts (heicBrands, from heic/limits.ts), which
 * runs first, so a file reaching this list is a HEIF DotAmi doesn't keep.
 */
const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

/**
 * Names what a refused file most likely is, so the sentence can say what to do. Only looked at
 * after the accepted signatures, so a JPEG is never called a web page because of its later bytes.
 */
function refusalFor(b: Uint8Array): ReceiptRefusalCode {
  if (startsWith(b, [0x47, 0x49, 0x46, 0x38])) return "gif"; // GIF8
  if (ascii(b, 4, 8) === "ftyp") {
    const brand = ascii(b, 8, 12);
    // `mif1` alone is the general image brand (an AVIF carries it too): another kind of picture.
    return HEIF_BRANDS.has(brand) && brand !== "mif1" ? "heif-sequence" : "other-picture";
  }
  if (startsWith(b, [0x42, 0x4d]) || startsWith(b, [0x49, 0x49, 0x2a, 0x00]) || startsWith(b, [0x4d, 0x4d, 0x00, 0x2a])) {
    return "other-picture"; // BMP, TIFF
  }
  // Text formats: skip a UTF-8 byte-order mark and leading white space, then look at the start.
  let i = startsWith(b, [0xef, 0xbb, 0xbf]) ? 3 : 0;
  while (i < b.length && i < 4096 && (b[i] === 0x20 || b[i] === 0x09 || b[i] === 0x0a || b[i] === 0x0d)) i += 1;
  const head = ascii(b, i, i + 4096).toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg";
  if (head.startsWith("<")) return "html"; // a web page, XML, or anything else in angle brackets
  return "not-a-receipt-type";
}

/** Checks a picture's size against the limits; null means it is fine. */
function pixelRefusal(size: Size): ReceiptRefusalCode | null {
  if (!size || size.width <= 0 || size.height <= 0) return "damaged";
  if (size.width > MAX_IMAGE_SIDE || size.height > MAX_IMAGE_SIDE || size.width * size.height > MAX_IMAGE_PIXELS) {
    return "too-many-pixels";
  }
  return null;
}

/** The answer for one file's bytes. Size is checked first, so a huge file is refused before it is read further. */
export function sniffReceipt(bytes: Uint8Array): SniffResult {
  if (bytes.length === 0) return { ok: false, code: "empty" };
  if (bytes.length > MAX_RECEIPT_BYTES) return { ok: false, code: "too-big" };

  const picture = (type: ReceiptType, size: Size): SniffResult => {
    const refused = pixelRefusal(size);
    return refused ? { ok: false, code: refused } : { ok: true, type, width: size!.width, height: size!.height };
  };

  if (startsWith(bytes, JPEG)) return picture("image/jpeg", jpegSize(bytes));
  if (startsWith(bytes, PNG)) return picture("image/png", pngSize(bytes));
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return picture("image/webp", webpSize(bytes));
  // Readers accept "%PDF-" anywhere in the first 1024 bytes; DotAmi only at the start, so nothing
  // else (a web page with a PDF tucked inside) can pass as one.
  if (startsWith(bytes, PDF)) return { ok: true, type: "application/pdf", width: null, height: null };
  if (ascii(bytes, 4, 8) === "ftyp") {
    const heic = heicHeader(bytes);
    if (heic.ok) return picture("image/heic", { width: heic.width, height: heic.height });
    if (heic.code === "sequence") return { ok: false, code: "heif-sequence" };
    if (heic.code === "damaged" || heic.code === "too-many-pixels") return { ok: false, code: heic.code };
    // "not-heic": some other ISO media file (AVIF, a video); refusalFor names it.
  }
  return { ok: false, code: refusalFor(bytes) };
}
