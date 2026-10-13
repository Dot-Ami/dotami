"use client";

import { useEffect, useRef } from "react";

import { cockpitWords as words } from "@/lib/cockpit/words";

/** Where a receipt's answer is: still on its way to the data file, kept, or not kept because the save failed. */
export type ReceiptStatus = "saving" | "saved" | "failed";

/** A receipt as the page hands it to a place that shows the waiting and failed states too. */
export interface ShownReceipt {
  lines: readonly string[];
  status: ReceiptStatus;
  /** What to say when the save kept the answer and nothing on the road changed. */
  empty?: string;
  /** New for each new receipt; see `ReceiptLines`. */
  focusKey?: number;
}

/**
 * A receipt (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"): what one answer
 * changed, as road evaluation's own lines, shown where the answer was given. A status line, so a screen
 * reader says it when it changes. The lines come from two runs of the rules compared; nothing here writes
 * one. With no lines, the answer was kept and nothing on the road moved, which it says (or `empty`).
 *
 * Since 2026-10-12 (after review) a receipt can wait on its save ("Saving your answer…") or say the save
 * failed, and never says "Saved" before it is. `focusKey`: where the control the person used is gone once
 * they answer (a row taken back, a box closed), the page passes a new key for each new receipt, and the
 * receipt takes the keyboard focus and scrolls into view, once per key, so a later save finishing never
 * pulls the focus back from wherever the person has moved on to.
 */
export function ReceiptLines({
  lines,
  empty,
  status = "saved",
  focusKey,
}: {
  lines: readonly string[];
  empty?: string;
  status?: ReceiptStatus;
  focusKey?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focusKey === undefined || !box.current) return;
    box.current.focus({ preventScroll: true });
    box.current.scrollIntoView({ block: "nearest" });
  }, [focusKey]);

  return (
    <div
      ref={box}
      role="status"
      aria-label={words.receipts.region}
      // Focusable from script only: it is a message, not a stop in the tab order.
      tabIndex={-1}
      className={`rounded-sm border px-2.5 py-2 text-[11.5px] leading-snug text-paper-dim outline-hidden focus-visible:ring-1 focus-visible:ring-maple-soft ${
        status === "failed" ? "border-amber/40 bg-amber/5" : "border-sage/40 bg-sage/5"
      }`}
    >
      {status === "saving" ? (
        <p>{words.receipts.saving}</p>
      ) : status === "failed" ? (
        <p className="text-amber">{words.receipts.notSaved}</p>
      ) : lines.length === 0 ? (
        <p>{empty ?? words.receipts.nothing}</p>
      ) : (
        // Paragraphs, not a list: a receipt line is not one of the rows it sits beside.
        <div className="space-y-1">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
