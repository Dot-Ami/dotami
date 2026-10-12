"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ALL_FOLDED,
  ALL_OPEN,
  allFolded,
  readFolds,
  writeFolds,
  type FoldRegion,
  type Folds,
} from "@/lib/cockpit/folds";

/**
 * Folding the cockpit's regions (docs/architecture/future-cockpit.md § 2, "Folding and phone width"): the
 * hook that holds and remembers the four answers, and the two buttons every region uses, one to fold it
 * and the narrow strip a folded rail or panel becomes. Their words come from lib/cockpit/words.ts.
 */

export interface FoldControls {
  folds: Folds;
  toggle: (region: FoldRegion) => void;
  /** The header's button: folds all four, or opens all four once they are all folded. */
  toggleAll: () => void;
}

export function useFolds(): FoldControls {
  // Everything open on the first drawing, which the server makes too; the browser's remembered answers
  // are read once the page is in the browser, so the server's HTML and the first client drawing agree.
  const [folds, setFolds] = useState<Folds>(ALL_OPEN);
  useEffect(() => {
    setFolds(readFolds());
  }, []);

  const toggle = useCallback((region: FoldRegion) => {
    setFolds((current) => {
      const next = { ...current, [region]: !current[region] };
      writeFolds(next);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setFolds((current) => {
      const next = allFolded(current) ? ALL_OPEN : ALL_FOLDED;
      writeFolds(next);
      return next;
    });
  }, []);

  return { folds, toggle, toggleAll };
}

/** The small button that folds a region, or shows it again; it says which, and whether the region is open. */
export function FoldButton({
  folded,
  label,
  controls,
  onClick,
  className = "",
}: {
  folded: boolean;
  label: string;
  /** The id of the region it folds. */
  controls: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={!folded}
      aria-controls={controls}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-rule px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-stone transition hover:border-spruce-line hover:text-paper ${className}`}
    >
      <span aria-hidden>{folded ? "+" : "−"}</span>
      {label}
    </button>
  );
}

/**
 * A folded rail or panel on a wide window: a narrow strip that is one tall button, its words running down
 * the strip, so the way back is always where the region was.
 */
export function FoldedStrip({
  label,
  controls,
  onClick,
}: {
  label: string;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-controls={controls}
      onClick={onClick}
      className="flex h-full w-full items-start justify-center px-1 py-4 font-mono text-[10px] uppercase tracking-[0.12em] text-stone transition hover:bg-ink2 hover:text-paper"
    >
      <span className="[writing-mode:vertical-rl]">
        <span aria-hidden>+ </span>
        {label}
      </span>
    </button>
  );
}
