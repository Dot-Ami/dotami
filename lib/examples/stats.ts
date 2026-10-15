import type { SoftwareCategoryId, SoftwarePlan, ToolPriced } from "./types";

/**
 * The averages behind an example's numbers (docs/ui-spec/example/_index.md, "Where these numbers come
 * from"), worked out here and nowhere else so that no average is ever typed by hand: change a listed price
 * in lib/examples/mara-sources.ts and every average, and Mara's start-up cost, follows.
 *
 * Whole cents in, whole cents out. A mean or a median that falls on half a cent rounds half up
 * (Math.round), and the tools' total adds the rounded averages, so the numbers on the page add up.
 */

export interface PriceSummary {
  count: number;
  meanCents: number;
  medianCents: number;
  lowCents: number;
  highCents: number;
}

/** Count, mean, median, lowest and highest of a list of listed prices. */
export function priceSummary(cents: readonly number[]): PriceSummary {
  // An average of nothing, of a free price or of a fraction of a cent is a bug in the data, never a number.
  if (cents.length === 0) throw new Error("priceSummary: no prices");
  for (const c of cents) if (!Number.isInteger(c) || c <= 0) throw new Error(`priceSummary: ${c} is not a whole, positive number of cents`);
  const sorted = [...cents].sort((a, b) => a - b);
  const sum = sorted.reduce((total, c) => total + c, 0);
  const mid = Math.floor(sorted.length / 2);
  return {
    count: sorted.length,
    meanCents: Math.round(sum / sorted.length),
    medianCents: sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2),
    lowCents: sorted[0],
    highCents: sorted[sorted.length - 1],
  };
}

/** One of each tool at its average listed price, added up. */
export function toolsTotalCents(tools: readonly ToolPriced[]): number {
  return tools.reduce((total, tool) => total + priceSummary(tool.prices.map((p) => p.priceCents)).meanCents, 0);
}

export interface SoftwareSummary {
  category: SoftwareCategoryId;
  /**
   * Over the plans listed by the month only: a yearly price and a monthly one aren't the same kind of
   * number, and turning one into the other would be a number no page printed. Null when none is listed.
   */
  monthly: PriceSummary | null;
  /** The free tiers, listed apart: a $0 would pull an average of prices down. */
  free: SoftwarePlan[];
}

/** Each category's plans, summed up the way the page shows them. */
export function softwareSummaries(plans: readonly SoftwarePlan[], categories: readonly { id: SoftwareCategoryId }[]): SoftwareSummary[] {
  return categories.map(({ id }) => {
    const monthly = plans.filter((p) => p.category === id && p.per === "month").map((p) => p.priceCents);
    return {
      category: id,
      monthly: monthly.length > 0 ? priceSummary(monthly) : null,
      free: plans.filter((p) => p.category === id && p.per === "free"),
    };
  });
}
