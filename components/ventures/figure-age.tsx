import { describeFigureDates, describeFuture, isFuture } from "@/lib/figures/age";
import type { FigureView } from "@/lib/figures/types";

/**
 * [8e] What the ideas page says about how old a figure is. The wording and the day arithmetic live
 * in lib/figures/age.ts (and are tested there); these two only place it on the screen, in the
 * figures list and in the agree prompt, so both say the same thing.
 */

/** "ended 6 months ago · agreed 2026-10-06" — the agreed part appears once the person has agreed. */
export function FigureDates({ figure, today }: { figure: FigureView; today: string }) {
  const text = describeFigureDates(figure.periodEnd, today, figure.confirmedAt);
  return text ? <p className="mt-0.5 text-[11px] text-stone-dim">{text}</p> : null;
}

/**
 * The flag on a figure whose period ends after today. Nothing about it is hidden or blocked — the
 * person may still have it right and the clock wrong — but no card counts it until it has ended.
 */
export function FutureDateNote({ periodEnd, today }: { periodEnd: string; today: string }) {
  if (!isFuture(periodEnd, today)) return null;
  return <p className="mt-0.5 text-[11px] text-amber">{describeFuture(periodEnd, today)}</p>;
}
