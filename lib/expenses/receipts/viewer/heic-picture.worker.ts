/**
 * [8i] The receipt viewer's HEIC worker: a HEIC photo's bytes in, the finished picture out.
 *
 * Its own file, beside the PDF worker (pdf-pages.worker.ts), so it loads no pdf.js. Like that one it
 * is served by DotAmi from /_next/static under the policy that refuses every connection
 * (next.config.mjs, workerPolicy, unchanged: no WebAssembly, no eval), so nothing in a file can fetch
 * anything. It reads the container with DotAmi's own code and hands the HEVC tiles to the browser's
 * video decoder (draw-heic.ts). The page sends one message per file and gets one labelled reply; the
 * picture is transferred, not copied. The page ends this worker when the viewer closes, after any
 * failure, and after 20 seconds.
 */

import { browserEnvironment, drawHeic } from "./draw-heic";
import { HEIC_REPLY_LABEL, type HeicDrawResult, type HeicReply } from "./types";

/** The bits of a dedicated worker's global scope this file uses (the project's TypeScript setup has the window's types). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<{ bytes: Uint8Array }>) => void) | null;
  postMessage(message: HeicReply, transfer?: Transferable[]): void;
  location: { origin: string };
}

const scope = globalThis as unknown as WorkerScope;

const reply = (result: HeicDrawResult) => scope.postMessage({ label: HEIC_REPLY_LABEL, result }, result.ok ? [result.picture] : []);

scope.onmessage = (event) => {
  // A dedicated worker only hears from the page that started it; anything naming another origin isn't DotAmi's page.
  if (event.origin && event.origin !== scope.location.origin) return;
  const bytes = event.data?.bytes;
  if (!(bytes instanceof Uint8Array)) return;
  drawHeic(bytes, browserEnvironment()).then(reply, () => reply({ ok: false, code: "failed" }));
};
