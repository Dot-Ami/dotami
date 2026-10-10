/**
 * [8i] The receipt viewer's own worker: PDF bytes in, each page as a finished picture out.
 *
 * Set up like the return reader's worker (lib/figures/return/pdf-text.worker.ts, which explains the
 * details): pdf.js's parser module is handed to pdf.js as `globalThis.pdfjsWorker`, so its parser and
 * its renderer both run in THIS worker and it starts no worker and loads no script of its own. The
 * script is served by DotAmi from /_next/static under a policy that refuses every connection
 * (next.config.mjs, workerPolicy), so nothing a PDF asks for can be fetched. The page sends one
 * message per file and gets one labelled reply; the pictures are transferred, not copied.
 */

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

import { drawPdfPages } from "./draw-pdf";
import { DRAW_REPLY_LABEL, type DrawReply, type PdfDrawResult } from "./types";

(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

/** The bits of a dedicated worker's global scope this file uses (the project's TypeScript setup has the window's types). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<{ bytes: Uint8Array }>) => void) | null;
  postMessage(message: DrawReply, transfer?: Transferable[]): void;
  location: { origin: string };
}

const scope = globalThis as unknown as WorkerScope;

const reply = (result: PdfDrawResult) =>
  scope.postMessage({ label: DRAW_REPLY_LABEL, result }, result.ok ? result.pages : []);

scope.onmessage = (event) => {
  // A dedicated worker only hears from the page that started it; anything naming another origin isn't DotAmi's page.
  if (event.origin && event.origin !== scope.location.origin) return;
  const bytes = event.data?.bytes;
  // Anything else on the channel is pdf.js's own traffic, not a file to draw.
  if (!(bytes instanceof Uint8Array)) return;
  drawPdfPages(pdfjs, bytes).then(reply, () => reply({ ok: false, code: "failed" }));
};
