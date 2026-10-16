"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * hook that holds and remembers the five answers (lib/cockpit/folds.ts), and the buttons every region uses: one to fold it, the
 * narrow strip a folded rail or panel becomes on a wide window, and the bar a folded panel becomes along the
 * bottom of a narrow one. Their words come from lib/cockpit/words.ts.
 */

export interface FoldControls {
  folds: Folds;
  toggle: (region: FoldRegion) => void;
  /** The header's button: folds every region, or opens them all once they are all folded. */
  toggleAll: () => void;
}

/** Marks every button that folds or shows a region, so focus can follow the person to the one now drawn. */
const FOLD_CONTROL = "data-fold-control";

/**
 * `remember` false (the invented example future, docs/ui-spec/example/_index.md): folding works for this
 * page only, and the browser's storage is neither read nor written.
 */
export function useFolds(remember = true): FoldControls {
  // Everything open on the first drawing, which the server makes too; the browser's remembered answers
  // are read once the page is in the browser, so the server's HTML and the first client drawing agree.
  const [folds, setFolds] = useState<Folds>(ALL_OPEN);
  useEffect(() => {
    if (remember) setFolds(readFolds());
  }, [remember]);
  const keep = useCallback((next: Folds) => {
    if (remember) writeFolds(next);
  }, [remember]);

  // The region the person just folded or showed. The button they pressed is usually gone or hidden after
  // (a folded rail is a strip, a folded goal bar a different line), which would drop keyboard focus to
  // the top of the page; so focus goes to the button that now stands for the region. Only after a press:
  // the remembered answers read on opening move nothing.
  const focusAfter = useRef<FoldRegion | null>(null);
  useEffect(() => {
    const region = focusAfter.current;
    if (!region) return;
    focusAfter.current = null;
    const drawn = [...document.querySelectorAll<HTMLElement>(`[${FOLD_CONTROL}="${region}"]`)].find(
      (el) => el.getClientRects().length > 0,
    );
    drawn?.focus();
  }, [folds]);

  const toggle = useCallback((region: FoldRegion) => {
    focusAfter.current = region;
    setFolds((current) => {
      const next = { ...current, [region]: !current[region] };
      keep(next);
      return next;
    });
  }, [keep]);

  // The header's button stays where it is, and keeps focus, so nothing moves it.
  const toggleAll = useCallback(() => {
    setFolds((current) => {
      const next = allFolded(current) ? ALL_OPEN : ALL_FOLDED;
      keep(next);
      return next;
    });
  }, [keep]);

  return { folds, toggle, toggleAll };
}

/** The small button that folds a region, or shows it again; it says which, and whether the region is open. */
export function FoldButton({
  folded,
  region,
  label,
  controls,
  onClick,
  className = "",
}: {
  folded: boolean;
  /** The region it folds; left out for the header's button, which folds them all. */
  region?: FoldRegion;
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
      {...(region ? { [FOLD_CONTROL]: region } : {})}
      onClick={onClick}
      // At least 32 px tall on a phone, where it is pressed with a finger.
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-rule px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em] text-stone transition hover:border-spruce-line hover:text-paper max-md:min-h-8 ${className}`}
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
  region,
  label,
  controls,
  onClick,
}: {
  region: FoldRegion;
  label: string;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-controls={controls}
      {...{ [FOLD_CONTROL]: region }}
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

/**
 * The folded panel on a window narrower than 1024 px: a bar along the bottom that is one full-width button,
 * 44 px tall, so a finger can't miss it. The page leaves room under its last line for the bar
 * (app/globals.css, `data-cockpit-bottom-bar`).
 */
export function FoldedBar({
  region,
  label,
  controls,
  onClick,
}: {
  region: FoldRegion;
  label: string;
  controls: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-controls={controls}
      {...{ [FOLD_CONTROL]: region }}
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-1 truncate px-3 font-mono text-[10px] uppercase tracking-[0.08em] text-stone transition hover:bg-ink2 hover:text-paper"
    >
      <span aria-hidden>+</span>
      {label}
    </button>
  );
}
