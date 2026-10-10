"use client";

import { useEffect, useId, useRef, useState } from "react";

import { typeName, type ReceiptType } from "@/lib/expenses/receipts/types";
import { VIEW_MESSAGES } from "@/lib/expenses/receipts/viewer/messages";
import { ReceiptOpener, type ShownReceipt } from "@/lib/expenses/receipts/viewer/open";

/**
 * [8i] A receipt, shown inside DotAmi (the maintainer's decision of 2026-10-08), by the rules of § 8
 * of docs/architecture/expense-records.md: a picture through the browser's own image decoder from a
 * blob: address, a PDF as pictures of its pages drawn by pdf.js in a worker that can reach nothing,
 * a HEIC photo as one picture drawn in another such worker by the graphics chip (option D of
 * docs/connectors/heic-decoder-review.md). Nothing in the receipt can be clicked, nothing it holds
 * runs, and closing the viewer lets go of everything it held (the blob address is revoked, the
 * workers ended, the pictures closed).
 */

/** One drawn PDF page: the worker's finished picture handed to a <canvas> as it is. */
function PageCanvas({ bitmap, label }: { bitmap: ImageBitmap; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    // Drawn as a copy (not handed over), so drawing the same page again always works.
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  }, [bitmap]);
  return <canvas ref={ref} role="img" aria-label={label} className="h-auto w-full rounded-sm bg-white" />;
}

export function ReceiptViewer({
  expenseId,
  type,
  title,
  onClose,
}: {
  expenseId: string;
  type: ReceiptType;
  /** The record's own title ("day · paid to"), for the dialog's name. */
  title: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<ShownReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pictureFailed, setPictureFailed] = useState(false);

  useEffect(() => {
    const opener = new ReceiptOpener();
    let alive = true;
    let opened: ShownReceipt | null = null;
    void opener.open(expenseId, type).then((result) => {
      if (!alive) {
        if (result.ok) release(result.shown);
        return;
      }
      if (result.ok) {
        opened = result.shown;
        setShown(result.shown);
      } else setError(result.message);
    });
    dialogRef.current?.focus();
    return () => {
      alive = false;
      opener.close();
      if (opened) release(opened);
    };
  }, [expenseId, type]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-rule bg-ink2 p-4 outline-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-serif text-lg font-bold tracking-tight text-paper">
              Receipt: {title}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-stone">
              {typeName(type)}, shown inside DotAmi from its copy on this computer
              {type === "image/heic" ? ", drawn by this computer's graphics chip" : ""}. Nothing in it can be clicked or run.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-stone hover:text-paper">
            Close
          </button>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-auto">
          {error ? (
            <p role="alert" className="text-sm text-amber">
              {error}
            </p>
          ) : !shown ? (
            <p role="status" className="text-sm text-paper-dim">
              Opening the receipt…
            </p>
          ) : shown.kind === "drawn" ? (
            // A HEIC photo: the worker's finished picture in a canvas, like a PDF page.
            <PageCanvas bitmap={shown.picture} label={`The receipt photo (${shown.width} × ${shown.height} pixels)`} />
          ) : shown.kind === "picture" ? (
            pictureFailed ? (
              <p role="alert" className="text-sm text-amber">
                {VIEW_MESSAGES.pictureFailed}
              </p>
            ) : (
              // A blob: address of DotAmi's own Blob, typed by what DotAmi read from the bytes (§ 8, rule 3).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown.url}
                alt={`The receipt picture (${shown.width} × ${shown.height} pixels)`}
                width={shown.width || undefined}
                height={shown.height || undefined}
                decoding="async"
                onError={() => setPictureFailed(true)}
                className="mx-auto h-auto max-w-full rounded-sm bg-white"
              />
            )
          ) : (
            <div className="space-y-3">
              {shown.pages.map((bitmap, i) => (
                <PageCanvas key={i} bitmap={bitmap} label={`Page ${i + 1} of ${shown.pageCount}`} />
              ))}
              {/* Fewer pages than the PDF has: past MAX_PDF_PAGES, or past the memory budget for all pages together. */}
              {shown.pages.length < shown.pageCount ? (
                <p className="text-[11.5px] text-stone">
                  DotAmi shows the first {shown.pages.length === 1 ? "page" : `${shown.pages.length} pages`}; this PDF has{" "}
                  {shown.pageCount}. The rest are kept in the file.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lets go of what an opened receipt holds: the blob address, or the page pictures. */
function release(shown: ShownReceipt) {
  if (shown.kind === "picture") URL.revokeObjectURL(shown.url);
  else if (shown.kind === "drawn") shown.picture.close();
  else for (const page of shown.pages) page.close();
}
