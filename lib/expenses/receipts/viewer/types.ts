/**
 * [8i] Showing a receipt inside DotAmi — the limits and the worker's messages, shared by the window
 * and the PDF worker. The security design these come from is § 8 of
 * docs/architecture/expense-records.md (written before this code).
 */

/** At most this many pages of a PDF receipt are drawn; the viewer says how many more there are. */
export const MAX_PDF_PAGES = 20;

/** A drawn page is at most this many pixels (the scale is lowered to fit): 16 megapixels, about 64 MB of memory. */
export const MAX_PAGE_PIXELS = 16_000_000;

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
