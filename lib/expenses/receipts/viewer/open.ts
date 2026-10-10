/**
 * [8i] Opening a receipt inside DotAmi — the one entry point the viewer calls: a record's id and the
 * type DotAmi stored for its receipt → something safe to show, or a plain sentence why not.
 *
 * Runs in the window. The rules are § 8 of docs/architecture/expense-records.md:
 *   1. the bytes come from DotAmi's own server (POST /api/expenses/receipt/file, page-only), which
 *      has already checked their size and SHA-256 against the row;
 *   2. they are read again here (sniff.ts) and must be the type the row stored, within the pixel
 *      limits, before anything decodes them;
 *   3. a picture becomes a blob: address of a Blob typed by DotAmi, for an <img> (the caller revokes
 *      it when it closes);
 *   4. a PDF is moved, not copied, into the viewer's own worker (pdf-pages.worker.ts), which hands back
 *      finished pictures of its pages. One worker serves one open viewer; it is ended when the viewer
 *      closes, or at once when a file takes too long.
 *   5. a HEIC photo ([8i], option D) is moved into the HEIC worker (heic-picture.worker.ts), which
 *      checks it with DotAmi's own reader and draws it with the browser's video decoder on the graphics
 *      chip, and hands back the finished picture. Asked only here, when the person clicks Show receipt.
 *      Any failure, or 20 seconds, ends the worker, and no HEIC is tried again until DotAmi restarts
 *      (heic-session.ts); a computer that can't decode HEVC is told so in plain words.
 * Nothing about the receipt goes in an address or a log.
 */

import { RECEIPT_REFUSALS } from "../refusals";
import { sniffReceipt } from "../sniff";
import type { ReceiptType } from "../types";
import { heicFailed, heicStopped } from "./heic-session";
import { VIEW_MESSAGES } from "./messages";
import { DRAW_REPLY_LABEL, HEIC_REPLY_LABEL, VIEW_TIMEOUT_MS, type DrawReply, type HeicDrawResult, type HeicReply, type PdfDrawResult } from "./types";

export type ShownReceipt =
  | { kind: "picture"; url: string; width: number; height: number }
  | { kind: "pdf"; pages: ImageBitmap[]; pageCount: number }
  /** A HEIC photo, drawn in the HEIC worker: a finished picture, never the file's bytes. */
  | { kind: "drawn"; picture: ImageBitmap; width: number; height: number };

/** The sentence for a HEIC that wasn't drawn. */
export function heicMessage(code: Exclude<HeicDrawResult, { ok: true }>["code"]): string {
  if (code === "unsupported") return VIEW_MESSAGES.heicUnsupported;
  if (code === "not-shown") return VIEW_MESSAGES.heicNotShown;
  if (code === "too-many-pixels") return RECEIPT_REFUSALS["too-many-pixels"];
  if (code === "damaged") return VIEW_MESSAGES.unreadable;
  return VIEW_MESSAGES.heicFailed;
}

export type OpenResult = { ok: true; shown: ShownReceipt } | { ok: false; message: string };

/**
 * Rule 2: the bytes DotAmi's server sent, checked against the type the row stored. Pure, so the
 * tests check it directly. A picture's size comes back so the viewer can lay it out before decoding.
 */
export function checkShownBytes(
  bytes: Uint8Array,
  stored: ReceiptType,
): { ok: true; type: ReceiptType; width: number | null; height: number | null } | { ok: false; message: string } {
  const sniffed = sniffReceipt(bytes);
  if (!sniffed.ok) {
    // Over the pixel limits says so in its own words; anything else here means the file was replaced.
    return { ok: false, message: sniffed.code === "too-many-pixels" ? RECEIPT_REFUSALS["too-many-pixels"] : VIEW_MESSAGES.unreadable };
  }
  if (sniffed.type !== stored) return { ok: false, message: VIEW_MESSAGES.replaced };
  return sniffed;
}

/** Asks DotAmi's own server for a record's receipt bytes. */
async function fetchReceipt(expenseId: string): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; message: string }> {
  let res: Response;
  try {
    res = await fetch("/api/expenses/receipt/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });
  } catch {
    return { ok: false, message: VIEW_MESSAGES.unreachable };
  }
  if (!res.ok) {
    let message: unknown = null;
    try {
      message = ((await res.json()) as { error?: unknown } | null)?.error;
    } catch {
      message = null;
    }
    return { ok: false, message: typeof message === "string" && message ? message : VIEW_MESSAGES.unreadable };
  }
  return { ok: true, bytes: new Uint8Array(await res.arrayBuffer()) };
}

export class ReceiptOpener {
  private worker: Worker | null = null;
  // Ends a HEIC drawing still under way when the viewer closes (closing is not a failure).
  private cancelHeic: (() => void) | null = null;
  // Set by close(). The viewer can close while the bytes are still on their way; after that nothing
  // may start a worker, since nothing would ever end it.
  private closed = false;

  /** Starts the PDF worker on first use. The `new URL(…, import.meta.url)` form ships it as a file of DotAmi's own. */
  private start(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("./pdf-pages.worker.ts", import.meta.url), { type: "module", name: "dotami-receipt-viewer" });
    }
    return this.worker;
  }

  /** Never throws: every failure is one of the plain sentences. */
  async open(expenseId: string, stored: ReceiptType): Promise<OpenResult> {
    try {
      // After a HEIC failed (or the graphics process stopped) this session, the graphics chip isn't asked again.
      if (stored === "image/heic" && (await heicStopped())) return { ok: false, message: VIEW_MESSAGES.heicStopped };
      const fetched = await fetchReceipt(expenseId);
      if (!fetched.ok) return fetched;
      // Closed meanwhile: no one is waiting for the receipt any more.
      if (this.closed) return { ok: false, message: VIEW_MESSAGES.unreadable };
      const checked = checkShownBytes(fetched.bytes, stored);
      if (!checked.ok) return checked;
      if (checked.type === "application/pdf") {
        const drawn = await this.draw(fetched.bytes);
        if (!drawn.ok) return { ok: false, message: drawn.code === "password" ? VIEW_MESSAGES.pdfLocked : VIEW_MESSAGES.pdfFailed };
        return { ok: true, shown: { kind: "pdf", pages: drawn.pages, pageCount: drawn.pageCount } };
      }
      if (checked.type === "image/heic") {
        const drawn = await this.drawHeic(fetched.bytes);
        if (!drawn.ok) return { ok: false, message: heicMessage(drawn.code) };
        return { ok: true, shown: { kind: "drawn", picture: drawn.picture, width: drawn.width, height: drawn.height } };
      }
      // The Blob's type is the one DotAmi read, never one taken from the file or the server's answer.
      const url = URL.createObjectURL(new Blob([fetched.bytes as BlobPart], { type: checked.type }));
      return { ok: true, shown: { kind: "picture", url, width: checked.width ?? 0, height: checked.height ?? 0 } };
    } catch {
      return { ok: false, message: VIEW_MESSAGES.unreadable };
    }
  }

  private draw(bytes: Uint8Array): Promise<PdfDrawResult> {
    const worker = this.start();
    return new Promise<PdfDrawResult>((resolve) => {
      const done = (result: PdfDrawResult) => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        resolve(result);
      };
      // Only our labelled reply counts; pdf.js's parser says "ready" on the same channel when it loads.
      const onMessage = (event: MessageEvent<DrawReply | unknown>) => {
        const data = event.data as Partial<DrawReply> | null;
        if (data?.label === DRAW_REPLY_LABEL && data.result) done(data.result);
      };
      const onError = () => {
        this.close();
        done({ ok: false, code: "failed" });
      };
      const timer = setTimeout(() => {
        this.close();
        done({ ok: false, code: "failed" });
      }, VIEW_TIMEOUT_MS);
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      // Transferred, not copied: after this the page no longer holds the file's bytes.
      worker.postMessage({ bytes }, [bytes.buffer]);
    });
  }

  /**
   * The HEIC worker, started for this one picture and ended as soon as it answers, fails or takes over
   * VIEW_TIMEOUT_MS. A failure (not "this computer can't decode HEIC", which is no failure) is
   * recorded so no HEIC is tried again until DotAmi restarts.
   */
  private drawHeic(bytes: Uint8Array): Promise<HeicDrawResult> {
    if (this.closed) return Promise.resolve({ ok: false, code: "failed" });
    const worker = new Worker(new URL("./heic-picture.worker.ts", import.meta.url), { type: "module", name: "dotami-receipt-heic" });
    return new Promise<HeicDrawResult>((resolve) => {
      let settled = false;
      const done = (result: HeicDrawResult, cancelled = false) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate();
        this.cancelHeic = null;
        if (!cancelled && !result.ok && result.code === "failed") heicFailed();
        resolve(result);
      };
      this.cancelHeic = () => done({ ok: false, code: "failed" }, true);
      const timer = setTimeout(() => done({ ok: false, code: "failed" }), VIEW_TIMEOUT_MS);
      worker.addEventListener("message", (event: MessageEvent<Partial<HeicReply> | null>) => {
        if (event.data?.label === HEIC_REPLY_LABEL && event.data.result) done(event.data.result);
      });
      // The worker itself failed (crashed, or its script didn't load): a failure like any other.
      worker.addEventListener("error", () => done({ ok: false, code: "failed" }));
      // Transferred, not copied: after this the page no longer holds the file's bytes.
      worker.postMessage({ bytes }, [bytes.buffer]);
    });
  }

  /** Stops the workers and everything they hold. */
  close(): void {
    this.closed = true;
    this.worker?.terminate();
    this.worker = null;
    this.cancelHeic?.();
  }
}
