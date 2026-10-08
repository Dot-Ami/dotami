/**
 * [8f] Read last year's return — PDF bytes → the text on each page, with where it sits.
 *
 * This is the only file that talks to pdf.js (Mozilla's PDF reader, pinned in package.json). It
 * runs inside DotAmi's own worker (pdf-text.worker.ts) in the app, and straight in Node in the
 * tests, so both read a PDF the same way. What it asks pdf.js for is the page TEXT only: no page is
 * drawn, no picture decoded, no font loaded into the page, no form script or annotation read.
 * docs/connectors/pdf-reader-review.md explains each setting below and what is left switched on.
 *
 * Nothing here keeps the bytes, and nothing is logged: pdf.js's own warnings are switched off
 * (they can quote a font's or an object's name from the file) and no exception text is passed on.
 */

import type { ExtractResult, PageText, TextItem } from "./types";
import { MAX_RETURN_PAGES } from "./types";

/** The part of pdf.js's API this file uses; the worker and the tests both hand over the real module. */
export type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

/**
 * pdf.js asks this for character maps, the standard fonts' outlines and its WebAssembly decoders,
 * from addresses DotAmi never gives it. Its own default would fetch them; this one refuses every
 * time, so a PDF that wants one is read without it (a missing font only changes how a page would
 * LOOK, which DotAmi never draws; the cost is spelled out in the review).
 */
class NoDownloads {
  constructor(_urls: unknown) {}
  async fetch(): Promise<never> {
    throw new Error("DotAmi reads PDFs without downloading anything");
  }
}

/**
 * Every option that could make pdf.js reach out, run something or do more than read text, set
 * by hand rather than left to its defaults (some defaults differ between the browser and Node).
 */
export const PDF_OPTIONS = {
  // pdf.js 4.2.67 and later fixed CVE-2024-4367 (a crafted font running JavaScript through this
  // eval path); 6.x removed the eval code outright, so this does nothing there. It stays so that a
  // downgrade to an older pdf.js still runs with it off.
  isEvalSupported: false,
  // XFA forms are drawn as HTML by pdf.js; DotAmi never draws them.
  enableXfa: false,
  // Fonts stay inside pdf.js: none is turned into a font the page could load.
  disableFontFace: true,
  useSystemFonts: false,
  // The two ways pdf.js would fetch data files: from the worker, and through the factory below.
  useWorkerFetch: false,
  BinaryDataFactory: NoDownloads,
  // WebAssembly image decoders are fetched by address; pictures are never decoded here anyway.
  useWasm: false,
  isOffscreenCanvasSupported: false,
  isImageDecoderSupported: false,
  // Errors only. pdf.js's warnings name things from inside the file.
  verbosity: 0,
} as const;

/** pdf.js reports problems as exceptions with a fixed `name`; this is the one that means "locked". */
function isPasswordError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "PasswordException";
}

function isNotPdfError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "InvalidPDFException";
}

/** Keep finite numbers only: a hostile file can put NaN or Infinity in a text matrix. */
function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/**
 * Reads every page's text. `bytes` is handed to pdf.js, which takes it over (in the browser the
 * buffer moves to the reader and is gone from the caller), so pass a copy if it is needed after.
 */
export async function extractPageText(pdfjs: PdfJs, bytes: Uint8Array): Promise<ExtractResult> {
  // No password is given and no onPassword handler is set, so a locked file makes the load fail
  // with pdf.js's PasswordException: DotAmi never asks for a password.
  const task = pdfjs.getDocument({ data: bytes, ...PDF_OPTIONS } as Parameters<PdfJs["getDocument"]>[0]);
  try {
    const doc = await task.promise;
    if (doc.numPages > MAX_RETURN_PAGES) return { ok: false, code: "too-many-pages" };

    const pages: PageText[] = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const item of content.items) {
        // Marked-content markers carry no text; only real text runs have `str`.
        if (!("str" in item)) continue;
        if (item.str.trim() === "") continue;
        items.push({
          text: item.str,
          x: finite(item.transform[4]),
          y: finite(item.transform[5]),
          width: finite(item.width),
          height: finite(item.height),
        });
      }
      pages.push({ page: n, items });
      page.cleanup();
    }
    return { ok: true, pages };
  } catch (error) {
    if (isPasswordError(error)) return { ok: false, code: "password" };
    if (isNotPdfError(error)) return { ok: false, code: "not-pdf" };
    return { ok: false, code: "failed" };
  } finally {
    // Frees everything pdf.js built from the file, including its copy of the bytes.
    await task.destroy().catch(() => {});
  }
}
