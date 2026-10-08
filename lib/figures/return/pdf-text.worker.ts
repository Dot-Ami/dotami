/**
 * [8f] The return reader's own worker: PDF bytes in, each page's text out.
 *
 * pdf.js normally runs its parser in a second worker it starts itself, from an address it is
 * given. Here both halves run in THIS worker instead: handing pdf.js its parser module as
 * `globalThis.pdfjsWorker` makes it use that copy in place (its "fake worker"), so it starts no
 * worker and loads no script of its own. All of pdf.js, the parser included, therefore lives in
 * this one thread, away from the page: it can't touch the window, and parsing a big file never
 * freezes it (finding the lines in the text afterwards runs in the window; find-lines.ts keeps that
 * close to linear). The script itself is served by DotAmi from /_next/static, under a Content-Security-Policy
 * of its own that refuses every connection (next.config.mjs, workerPolicy).
 *
 * The page sends one message per file and gets one labelled reply back; the answer is never an
 * exception's text. When pdf.js's parser module loads inside a worker it also hooks itself up to
 * the worker's own message channel and says "ready" there (pdf.worker.mjs, WorkerMessageHandler's
 * static block). That can't be switched off; it is harmless here because the page sends it nothing
 * in pdf.js's message format, and the page ignores every message that isn't labelled as ours.
 */

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

import { extractPageText } from "./extract";
import { REPLY_LABEL, type ExtractResult, type WorkerReply } from "./types";

(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;

/** The bits of a dedicated worker's global scope this file uses (the project's TypeScript setup has the window's types, not a worker's). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<{ bytes: Uint8Array }>) => void) | null;
  postMessage(message: WorkerReply): void;
  location: { origin: string };
}

const scope = globalThis as unknown as WorkerScope;

const reply = (result: ExtractResult) => scope.postMessage({ label: REPLY_LABEL, result });

scope.onmessage = (event) => {
  // A dedicated worker only hears from the page that started it, and those messages carry an
  // empty origin. Anything that names a different origin isn't from DotAmi's page: ignore it.
  if (event.origin && event.origin !== scope.location.origin) return;
  const bytes = event.data?.bytes;
  // Anything else on the channel is pdf.js's own traffic, not a file to read.
  if (!(bytes instanceof Uint8Array)) return;
  extractPageText(pdfjs, bytes).then(reply, () => reply({ ok: false, code: "failed" }));
};
