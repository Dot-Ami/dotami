/**
 * [8f] Read last year's return — the one entry point the screen calls: a File → what DotAmi found.
 *
 * Runs in the window. The file is checked first (sniff.ts: size and the "%PDF-" signature) without
 * loading the reader; only then are its bytes read into memory and moved, not copied, into the
 * reader's worker (pdf-text.worker.ts), which hands back page text. The T2125 lines are then found
 * here (find-lines.ts). Nothing is sent to the server, stored or logged, and nothing is proposed:
 * this slice only shows what was found.
 *
 * One worker serves one open "Add from last year's return" panel and is stopped when the panel
 * closes (close()), or at once when a read takes too long, so a hostile file can't keep a thread busy.
 */

import { findT2125Copies, isPicturesOnly } from "./find-lines";
import { REFUSALS } from "./refusals";
import { sniffPdf } from "./sniff";
import {
  READ_TIMEOUT_MS,
  REPLY_LABEL,
  type ExtractResult,
  type RefusalCode,
  type ReturnReadResult,
  type WorkerReply,
} from "./types";

/** How much of the file the signature check looks at. */
const HEAD_BYTES = 1024;

export function refuse(code: RefusalCode): ReturnReadResult {
  return { ok: false, code, error: REFUSALS[code] };
}

/** Turns the worker's page text into the screen's answer. Pure, so the tests run it directly. */
export function interpret(extracted: ExtractResult): ReturnReadResult {
  if (!extracted.ok) return refuse(extracted.code in REFUSALS ? extracted.code : "failed");
  if (isPicturesOnly(extracted.pages)) return refuse("pictures-only");
  const copies = findT2125Copies(extracted.pages);
  if (copies.length === 0) return refuse("no-t2125");
  return { ok: true, pageCount: extracted.pages.length, copies };
}

export class ReturnReader {
  private worker: Worker | null = null;

  /** Starts the worker on first use. The `new URL(…, import.meta.url)` form is what lets the bundler ship the worker as a file of DotAmi's own. */
  private start(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./pdf-text.worker.ts", import.meta.url), {
        type: "module",
        name: "dotami-return-reader",
      });
    }
    return this.worker;
  }

  /** Reads one file. Never throws: every failure is one of the plain refusals. */
  async read(file: File): Promise<ReturnReadResult> {
    try {
      // Size and signature first, from the first bytes only, before the reader is started.
      const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
      const sniffed = sniffPdf(file.size, head);
      if (!sniffed.ok) return refuse(sniffed.code);

      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await this.extract(bytes);
      return interpret(extracted);
    } catch {
      return refuse("failed");
    }
  }

  private extract(bytes: Uint8Array): Promise<ExtractResult> {
    const worker = this.start();
    return new Promise<ExtractResult>((resolve) => {
      const done = (result: ExtractResult) => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        resolve(result);
      };
      // Only our labelled reply counts; pdf.js's parser says "ready" on the same channel when it loads.
      const onMessage = (event: MessageEvent<WorkerReply | unknown>) => {
        const data = event.data as Partial<WorkerReply> | null;
        if (data?.label === REPLY_LABEL && data.result) done(data.result);
      };
      // The worker failed to start or threw outside the reader: say "couldn't read", start afresh next time.
      const onError = () => {
        this.close();
        done({ ok: false, code: "failed" });
      };
      const timer = setTimeout(() => {
        this.close();
        done({ ok: false, code: "failed" });
      }, READ_TIMEOUT_MS);
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      // Transferred, not copied: after this the page no longer holds the file's bytes.
      worker.postMessage({ bytes }, [bytes.buffer]);
    });
  }

  /** Stops the worker and everything pdf.js holds in it. */
  close(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
