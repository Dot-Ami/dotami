"use client";

import { cockpitWords as words } from "@/lib/cockpit/words";

/**
 * A receipt (docs/architecture/future-cockpit.md § 2, "Cockpit screen as built, part 2"): what one answer
 * changed, as road evaluation's own lines, shown where the answer was given. A status line, so a screen
 * reader says it when it changes. The lines come from two runs of the rules compared; nothing here writes
 * one. With no lines, the answer was kept and nothing on the road moved, which it says (or `empty`).
 */
export function ReceiptLines({ lines, empty }: { lines: readonly string[]; empty?: string }) {
  return (
    <div
      role="status"
      aria-label={words.receipts.region}
      className="rounded-sm border border-sage/40 bg-sage/5 px-2.5 py-2 text-[11.5px] leading-snug text-paper-dim"
    >
      {lines.length === 0 ? (
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
