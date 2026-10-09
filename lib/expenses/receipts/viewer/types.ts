/**
 * [8i] Showing a receipt inside DotAmi — the limits and the worker's messages, shared by the window
 * and the PDF worker. The security design these come from is § 8 of
 * docs/architecture/expense-records.md (written before this code).
 */

/** At most this many pages of a PDF receipt are drawn; the viewer says how many more there are. */
export const MAX_PDF_PAGES = 20;

/** A drawn page is at most this many pixels (the scale is lowered to fit): 16 megapixels, about 64 MB of memory. */
export const MAX_PAGE_PIXELS = 16_000_000;

/**
 * All drawn pages together are at most this many pixels: 80 megapixels, about 320 MB. Twenty ordinary
 * pages (Letter or A4, 3.3 to 3.7 megapixels each at PAGE_TARGET_WIDTH) fit; pages drawn at the
 * per-page cap stop after five. The viewer says how many it shows.
 */
export const MAX_PDF_TOTAL_PIXELS = 80_000_000;

/** How wide, in pixels, a page is drawn when it fits under MAX_PAGE_PIXELS: sharp at the viewer's width on a high-density screen. */
export const PAGE_TARGET_WIDTH = 1600;

/** A PDF that takes longer than this to draw is stopped (its worker is ended). */
export const VIEW_TIMEOUT_MS = 20_000;

/** Why a PDF couldn't be drawn. Never an exception's text. */
export type PdfDrawFailure = "password" | "failed";

/** What the worker hands back: each drawn page as a finished picture, or why there is none. */
export type PdfDrawResult =
  | { ok: true; pageCount: number; pages: ImageBitmap[] }
  | { ok: false; code: PdfDrawFailure };

/**
 * The worker's reply, labelled: pdf.js's own parser also talks on the worker's message channel (it
 * says "ready" when it loads), so the page reads only messages carrying this label.
 */
export const DRAW_REPLY_LABEL = "dotami-receipt-pages";
export interface DrawReply {
  label: typeof DRAW_REPLY_LABEL;
  result: PdfDrawResult;
}

/**
 * Why a HEIC receipt wasn't drawn ([8i], option D):
 *   - "unsupported": this computer's (or browser's) video decoder can't decode it; nothing went wrong;
 *   - "not-shown": a HEIC of a kind DotAmi doesn't draw (10-bit, an overlay, a second layer…);
 *   - "damaged" / "too-many-pixels": DotAmi's own reader refused it before any decoding;
 *   - "failed": the decoder reported an error (or drew something other than asked); the page then
 *     doesn't try HEIC again until DotAmi restarts.
 */
export type HeicDrawFailure = "unsupported" | "not-shown" | "damaged" | "too-many-pixels" | "failed";

/** What the HEIC worker hands back: the finished picture, or why there is none. */
export type HeicDrawResult = { ok: true; picture: ImageBitmap; width: number; height: number } | { ok: false; code: HeicDrawFailure };

/** The HEIC worker's reply, labelled like the PDF worker's. */
export const HEIC_REPLY_LABEL = "dotami-receipt-heic";
export interface HeicReply {
  label: typeof HEIC_REPLY_LABEL;
  result: HeicDrawResult;
}
