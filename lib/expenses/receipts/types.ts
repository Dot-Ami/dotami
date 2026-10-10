/**
 * [8i] Receipts — the limits and types shared by the server and the window. No node or browser
 * import here, so both sides read the same numbers.
 *
 * The maintainer's decisions (2026-10-07 and 2026-10-08, docs/architecture/expense-records.md § 0):
 * a receipt is a copy of the person's file in DotAmi's data folder, at most 10 MB, shown inside
 * DotAmi. Which files are accepted, and why these limits, is § 7 of that doc.
 */

/** The maintainer's cap (2026-10-08): the same 10 MB as today's file reading. */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/**
 * Largest picture DotAmi keeps or shows, in pixels (width × height): about 50 megapixels covers a
 * 48-megapixel phone photo. A decoded picture takes 4 bytes a pixel, so this caps one at about 200 MB
 * of memory however small the file is (a "decompression bomb" is a small file that claims a huge size).
 */
export const MAX_IMAGE_PIXELS = 50_000_000;

/** Longest side of a picture, in pixels. Larger is refused even under the pixel cap (a 1 × 50,000,000 strip). */
export const MAX_IMAGE_SIDE = 20_000;

/**
 * The only kinds of file a receipt may be, decided from the file's first bytes (sniff.ts). Each
 * can be shown by something that can't run a script: the browser's image decoder for pictures, pdf.js
 * drawing onto a canvas for PDFs. SVG, HTML, GIF, HEIC and everything else are refused.
 */
export const RECEIPT_TYPES = [
  { type: "image/jpeg", extension: "jpg", name: "JPEG picture" },
  { type: "image/png", extension: "png", name: "PNG picture" },
  { type: "image/webp", extension: "webp", name: "WebP picture" },
  { type: "application/pdf", extension: "pdf", name: "PDF" },
] as const;

export type ReceiptType = (typeof RECEIPT_TYPES)[number]["type"];

export const isReceiptType = (value: unknown): value is ReceiptType => RECEIPT_TYPES.some((t) => t.type === value);

export const extensionOf = (type: ReceiptType): string => RECEIPT_TYPES.find((t) => t.type === type)!.extension;

export const typeName = (type: ReceiptType): string => RECEIPT_TYPES.find((t) => t.type === type)!.name;

/**
 * A receipt's id: 32 lowercase hex characters (128 random bits). It is also the stored file's name,
 * so nothing the person or a caller sends ever becomes part of a path.
 */
export const RECEIPT_ID = /^[0-9a-f]{32}$/;

/** Why a file isn't kept or shown; refusals.ts has the sentence for each. */
export type ReceiptRefusalCode =
  | "empty"
  | "too-big"
  | "svg"
  | "html"
  | "heic"
  | "gif"
  | "other-picture"
  | "not-a-receipt-type"
  | "damaged"
  | "too-many-pixels";

/** What the routes and the screen see of a record's receipt. The file's id and hash stay on the server. */
export interface ReceiptView {
  type: ReceiptType;
  bytes: number;
  /** ISO timestamp. */
  addedAt: string;
}
