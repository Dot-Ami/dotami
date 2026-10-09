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
 * Nothing about the receipt goes in an address or a log.
 */

import { RECEIPT_REFUSALS } from "../refusals";
import { sniffReceipt } from "../sniff";
import type { ReceiptType } from "../types";
import { VIEW_MESSAGES } from "./messages";
import { DRAW_REPLY_LABEL, VIEW_TIMEOUT_MS, type DrawReply, type PdfDrawResult } from "./types";

export type ShownReceipt =
  | { kind: "picture"; url: string; width: number; height: number }
  | { kind: "pdf"; pages: ImageBitmap[]; pageCount: number };

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
      const fetched = await fetchReceipt(expenseId);
      if (!fetched.ok) return fetched;
      const checked = checkShownBytes(fetched.bytes, stored);
      if (!checked.ok) return checked;
      if (checked.type === "application/pdf") {
        const drawn = await this.draw(fetched.bytes);
        if (!drawn.ok) return { ok: false, message: drawn.code === "password" ? VIEW_MESSAGES.pdfLocked : VIEW_MESSAGES.pdfFailed };
        return { ok: true, shown: { kind: "pdf", pages: drawn.pages, pageCount: drawn.pageCount } };
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

  /** Stops the worker and everything pdf.js holds in it. */
  close(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
