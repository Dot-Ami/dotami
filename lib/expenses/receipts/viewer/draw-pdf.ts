/**
 * [8i] Draws a PDF receipt's pages as pictures, inside the receipt viewer's own worker
 * (pdf-pages.worker.ts). The security design is § 8 of docs/architecture/expense-records.md, rule 4.
 *
 * pdf.js is set up exactly as the return reader sets it up (PDF_OPTIONS in
 * lib/figures/return/extract.ts: no eval, no XFA, no font loaded into a page, no data files fetched,
 * no WebAssembly), and drawing adds only what drawing needs:
 *   - each page is drawn on an OffscreenCanvas here in the worker and handed back as an ImageBitmap,
 *     a finished picture: the page never gets anything from the PDF but pixels;
 *   - the canvases pdf.js makes for itself are OffscreenCanvases too (the worker has no document),
 *     and the SVG filters it would add to a document are switched off (NoFilters);
 *   - no annotation layer and no text layer are built, so nothing in a PDF is clickable, and pdf.js's
 *     scripting sandbox (the only part of it that runs a PDF's JavaScript) is never loaded;
 *   - pictures inside the PDF are capped at MAX_IMAGE_PIXELS, a page at MAX_PAGE_PIXELS, all drawn
 *     pages together at MAX_PDF_TOTAL_PIXELS, and at most MAX_PDF_PAGES pages are drawn.
 */

import { PDF_OPTIONS, type PdfJs } from "@/lib/figures/return/extract";

import { MAX_IMAGE_PIXELS } from "../types";
import { MAX_PAGE_PIXELS, MAX_PDF_PAGES, MAX_PDF_TOTAL_PIXELS, PAGE_TARGET_WIDTH, type PdfDrawResult } from "./types";

/** Chromium's largest canvas side is 32,767 pixels; staying well under it keeps every page drawable. */
const MAX_PAGE_SIDE = 16_384;

/**
 * The scale a page is drawn at: PAGE_TARGET_WIDTH pixels wide, lowered until the page is at most
 * MAX_PAGE_PIXELS and no side is over MAX_PAGE_SIDE. Width and height are in PDF points (scale 1).
 * 0 for a page with no size. Pure, so the tests check it directly.
 */
export function pageScale(width: number, height: number, target = PAGE_TARGET_WIDTH, maxPixels = MAX_PAGE_PIXELS): number {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return 0;
  let scale = target / width;
  if (width * scale * height * scale > maxPixels) scale = Math.sqrt(maxPixels / (width * height));
  return Math.min(scale, MAX_PAGE_SIDE / width, MAX_PAGE_SIDE / height);
}

/** pdf.js's canvases, made without a document. Same shape as pdf.js's own canvas factories. */
class OffscreenCanvasFactory {
  constructor(_options: unknown) {}
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    const canvas = new OffscreenCanvas(width, height);
    return { canvas, context: canvas.getContext("2d", { willReadFrequently: true }) };
  }
  reset(target: { canvas: OffscreenCanvas | null }, width: number, height: number) {
    if (!target.canvas || width <= 0 || height <= 0) throw new Error("Invalid canvas size");
    target.canvas.width = width;
    target.canvas.height = height;
  }
  destroy(target: { canvas: OffscreenCanvas | null; context: unknown }) {
    if (target.canvas) target.canvas.width = target.canvas.height = 0;
    target.canvas = null;
    target.context = null;
  }
}

/**
 * pdf.js adds SVG filters to a document for some colour effects (transfer functions, high contrast);
 * there is no document here, and a receipt is drawn without them. Every method answers "none".
 */
class NoFilters {
  constructor(_options: unknown) {}
  addFilter() {
    return "none";
  }
  addHCMFilter() {
    return "none";
  }
  addAlphaFilter() {
    return "none";
  }
  addLuminosityFilter() {
    return "none";
  }
  addKnockoutFilter() {
    return "none";
  }
  addHighlightHCMFilter() {
    return "none";
  }
  addSelectionHCMFilter() {
    return "none";
  }
  addSelectionFilter() {
    return "none";
  }
  createSelectionStyle() {
    return null;
  }
  destroy() {}
}

/** pdf.js reports a locked PDF as an exception with this name. */
const isPasswordError = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { name?: unknown }).name === "PasswordException";

/** Every page up to MAX_PDF_PAGES, drawn. Never throws, and never passes on an exception's text. */
export async function drawPdfPages(pdfjs: PdfJs, bytes: Uint8Array): Promise<PdfDrawResult> {
  const task = pdfjs.getDocument({
    data: bytes,
    ...PDF_OPTIONS,
    maxImageSize: MAX_IMAGE_PIXELS,
    CanvasFactory: OffscreenCanvasFactory,
    FilterFactory: NoFilters,
  } as unknown as Parameters<PdfJs["getDocument"]>[0]);
  try {
    const doc = await task.promise;
    const pages: ImageBitmap[] = [];
    let drawnPixels = 0;
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PDF_PAGES); n += 1) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = pageScale(base.width, base.height);
      if (scale === 0) return { ok: false, code: "failed" };
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.floor(viewport.width));
      const height = Math.max(1, Math.floor(viewport.height));
      // Every page drawn so far is held until the window takes them, so stop before the total passes
      // the budget (the first page always fits: it is at most MAX_PAGE_PIXELS). The window says how
      // many of the PDF's pages it shows.
      if (pages.length > 0 && drawnPixels + width * height > MAX_PDF_TOTAL_PIXELS) {
        page.cleanup();
        break;
      }
      drawnPixels += width * height;
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) return { ok: false, code: "failed" };
      await page.render({
        canvasContext: context as unknown as CanvasRenderingContext2D,
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
        background: "white",
      }).promise;
      pages.push(canvas.transferToImageBitmap());
      page.cleanup();
    }
    return { ok: true, pageCount: doc.numPages, pages };
  } catch (error) {
    return { ok: false, code: isPasswordError(error) ? "password" : "failed" };
  } finally {
    await task.destroy();
  }
}
