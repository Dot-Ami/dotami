/**
 * [8h] Read a GnuCash book in the background — the window's side of the books worker.
 *
 * The file's size is checked before a byte is read here. Then its bytes are read into memory and moved
 * (not copied) into the worker (worker.ts), which hands back the book's accounts and posted lines.
 * Nothing is sent to the server, stored or logged here; only the monthly totals the person later
 * agrees to leave the page, through /api/figures/propose.
 *
 * One worker serves one open "Add from a file" panel. It holds on to nothing once it has answered,
 * and is stopped when the panel closes or the person presses Change or Cancel or picks another file
 * (close()), and at once when a read runs past BOOK_READ_TIMEOUT_MS, so a hostile or enormous file
 * can't keep a thread busy. A read stopped while its bytes are still loading never starts a worker.
 */
import { BOOK_TOO_BIG_MESSAGE, MAX_BOOK_BYTES } from "./detect";
import type { BookReadResult } from "./types";
import {
  BOOK_READ_TIMEOUT_MS,
  BOOK_REPLY_LABEL,
  type BookWorkerReply,
  type BookWorkerRequest,
} from "./worker-protocol";

export const BOOK_READ_FAILED = "DotAmi couldn't read that book. Nothing was kept.";
export const BOOK_READ_TOO_SLOW =
  "DotAmi stopped reading that book after a minute, so nothing was read. Nothing was kept.";
const STOPPED = "Stopped. Nothing was kept.";

/** The parts of a Worker this file uses, so the tests can hand in a stand-in. */
export interface BookWorkerLike {
  postMessage(message: BookWorkerRequest, transfer: Transferable[]): void;
  addEventListener(type: "message" | "error", listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: "message" | "error", listener: (event: MessageEvent<unknown>) => void): void;
  terminate(): void;
}

/** Starts the real worker. The `new URL(…, import.meta.url)` form is what lets the bundler ship the worker as a file of DotAmi's own. */
function startBookWorker(): BookWorkerLike {
  return new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
    name: "dotami-book-reader",
  }) as unknown as BookWorkerLike;
}

export class BookReader {
  private worker: BookWorkerLike | null = null;
  /** Ends the read in flight, if any, with the result given. */
  private finishPending: ((result: BookReadResult) => void) | null = null;
  /** Bumped by every close(), so a read whose bytes were still loading can tell it was stopped meanwhile. */
  private generation = 0;

  constructor(
    private readonly makeWorker: () => BookWorkerLike = startBookWorker,
    private readonly timeoutMs: number = BOOK_READ_TIMEOUT_MS,
  ) {}

  /** Reads one book. Never throws: every failure is a plain sentence. */
  async read(file: Blob): Promise<BookReadResult> {
    try {
      // One read at a time: a read still running is stopped, with its worker, before this one starts.
      this.close();
      const ticket = this.generation;
      // Too big: said without reading a single byte of it.
      if (file.size > MAX_BOOK_BYTES) return { ok: false, error: BOOK_TOO_BIG_MESSAGE };
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Cancel, Change, the panel closing or a newer file came while the bytes loaded: start no worker.
      if (ticket !== this.generation) return { ok: false, error: STOPPED };
      return await this.inWorker(bytes);
    } catch {
      return { ok: false, error: BOOK_READ_FAILED };
    }
  }

  private inWorker(bytes: Uint8Array): Promise<BookReadResult> {
    const worker = this.makeWorker();
    this.worker = worker;

    return new Promise<BookReadResult>((resolve) => {
      const done = (result: BookReadResult) => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        this.finishPending = null;
        resolve(result);
      };
      // Only our labelled reply counts.
      const onMessage = (event: MessageEvent<unknown>) => {
        const data = event.data as Partial<BookWorkerReply> | null;
        if (data?.label === BOOK_REPLY_LABEL && data.result) done(data.result);
      };
      // The worker failed to start, or ran out of memory: say "couldn't read", start afresh next time.
      // (done() first, so close() below finds no read in flight to call "stopped".)
      const onError = () => {
        done({ ok: false, error: BOOK_READ_FAILED });
        this.close();
      };
      const timer = setTimeout(() => {
        done({ ok: false, error: BOOK_READ_TOO_SLOW });
        this.close();
      }, this.timeoutMs);

      this.finishPending = done;
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      // Transferred, not copied: after this the page no longer holds the book's bytes.
      worker.postMessage({ bytes }, [bytes.buffer]);
    });
  }

  /** Stops the worker and whatever it was reading; a read in flight ends as "stopped". */
  close(): void {
    this.generation += 1;
    const pending = this.finishPending;
    this.finishPending = null;
    this.worker?.terminate();
    this.worker = null;
    pending?.({ ok: false, error: STOPPED });
  }
}
