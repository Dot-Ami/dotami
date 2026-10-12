import type { FigureView } from "@/lib/figures/types";
import type { PersonFigureView } from "@/lib/futures/person-figures";

/**
 * The person's own planning numbers, as road evaluation reads them: only numbers the person agreed to
 * in the agree prompt. A proposed number (from an importer, the Lens or an outside agent), one taken
 * back and one turned down are never counted (docs/architecture/figures-privacy-review.md). Pure: it
 * picks from the lists the storage code returns (lib/figures/store.ts, lib/futures/person-figures.ts)
 * and reads nothing itself.
 */
export interface AgreedPlanning {
  /** The yearly income the person wants, before tax, in whole cents; null when they haven't agreed to one. */
  incomeWantedCents: number | null;
  /** The savings they'd put toward starting this future, in whole cents; null when not given. */
  savingsCents: number | null;
  /** Their number for each named cost line on this future's road. One per line. */
  costLines: { stepId: string; lineId: string; amountCents: number }[];
}

export const NO_AGREED_PLANNING: AgreedPlanning = { incomeWantedCents: null, savingsCents: null, costLines: [] };

/**
 * Picks the agreed planning numbers for one future drawn on `roadId`. The storage keeps one current
 * number per cost line and per idea's savings (agreeing to a new one takes back the old), so there is
 * normally one of each; if a hand-edited file holds two, the one agreed last is used.
 */
export function agreedPlanning(
  roadId: string,
  figures: readonly FigureView[],
  personFigures: readonly PersonFigureView[],
): AgreedPlanning {
  const agreed = figures.filter((f) => f.status === "confirmed");
  const newestFirst = <T extends { confirmedAt: string | null }>(list: T[]) =>
    [...list].sort((a, b) => (b.confirmedAt ?? "").localeCompare(a.confirmedAt ?? ""));

  const income = newestFirst(personFigures.filter((f) => f.kind === "income-wanted" && f.status === "confirmed"))[0];
  const savings = newestFirst(agreed.filter((f) => f.kind === "savings-for-start"))[0];

  const lines = new Map<string, { stepId: string; lineId: string; amountCents: number }>();
  // Oldest first, so the one agreed last is the one left standing for its line.
  for (const f of newestFirst(agreed.filter((f) => f.kind === "start-up-cost-line")).reverse()) {
    // A number for a line on another road stays kept (going back to that road brings it back), but it
    // doesn't price anything on this one.
    if (!f.costLine || f.costLine.roadId !== roadId) continue;
    lines.set(`${f.costLine.stepId}/${f.costLine.lineId}`, {
      stepId: f.costLine.stepId,
      lineId: f.costLine.lineId,
      amountCents: f.amountCents,
    });
  }

  return {
    incomeWantedCents: income ? income.amountCents : null,
    savingsCents: savings ? savings.amountCents : null,
    costLines: [...lines.values()],
  };
}
