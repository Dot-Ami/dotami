/**
 * [8a] The figures store — shared types. A "figure" is an amount about one of the person's ideas that
 * the person has agreed to: a total about the business (revenue for a year, say) or, since 2026-10-11,
 * one of the person's own planning numbers for starting it (the savings they'd put toward it, their
 * quote for a start-up cost). See prisma/schema.prisma `Figure` and
 * docs/architecture/figures-privacy-review.md for the rules the store is built under.
 *
 * Kinds are IDs and IDs are forever: add to this list, never rename or reuse one.
 *
 * [8f] The four "business-" kinds are the T2125 totals. They are named for what the amount means,
 * not for a line number, because the CRA can renumber a line (the maintainer's decision,
 * 2026-10-07); the line each goes on, year by year, is in lib/engines/taxlines/. Line 8299 is not
 * "gross-revenue": it leaves out the GST/HST collected, so the GST/HST card never reads it.
 */
export const BUSINESS_TOTAL_KINDS = [
  "gross-revenue",
  "business-gross-income",
  "business-total-expenses",
  "business-net-income-before-adjustments",
  "business-net-income",
] as const;

/**
 * Every kind, the business totals first. The two after them (2026-10-11, the future cockpit's phase 1;
 * docs/architecture/future-cockpit.md § 7) are the person's own planning numbers, each one day's amount,
 * never negative: "savings-for-start" (what they'd put toward starting) and "start-up-cost-line" (their
 * number for one named cost line on the future's road, which names that line and where its amount came
 * from). They are entered from the cockpit's screens, so the Ideas page's form offers only
 * BUSINESS_TOTAL_KINDS.
 */
export const FIGURE_KINDS = [...BUSINESS_TOTAL_KINDS, "savings-for-start", "start-up-cost-line"] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

export const FIGURE_KIND_LABELS: Record<FigureKind, string> = {
  "gross-revenue": "Revenue (gross, before expenses)",
  "business-gross-income": "Business gross income (T2125)",
  "business-total-expenses": "Business total expenses (T2125)",
  "business-net-income-before-adjustments": "Business net income before adjustments (T2125)",
  "business-net-income": "Business net income (T2125)",
  "savings-for-start": "Savings you'd put toward starting",
  "start-up-cost-line": "A start-up cost (your number)",
};

/** The kinds that are one day's planning number, never negative, rather than a total over a period. */
export const PLANNING_KINDS: readonly FigureKind[] = ["savings-for-start", "start-up-cost-line"];

/** Where the amount of a start-up cost line came from, as the person says (2026-10-11). Ids are forever. */
export const COST_LINE_AMOUNT_FROM = ["quote", "link", "receipt", "your-guess"] as const;
export type CostLineAmountFrom = (typeof COST_LINE_AMOUNT_FROM)[number];

export const COST_LINE_AMOUNT_FROM_LABELS: Record<CostLineAmountFrom, string> = {
  quote: "a quote",
  link: "a link",
  receipt: "a receipt",
  "your-guess": "your guess",
};

/** The named cost line on a road that a "start-up-cost-line" figure prices: permanent catalog ids. */
export interface FigureCostLine {
  roadId: string;
  stepId: string;
  lineId: string;
  amountFrom: CostLineAmountFrom;
}

/**
 * proposed  — an importer, the Lens or an outside agent suggested it; nothing relies on it yet.
 * confirmed — the person agreed to it in the agree prompt ([8b]).
 * retracted — the person took a confirmed figure back; kept so the history stays honest.
 * discarded — the person turned a proposal down; hidden from every list.
 */
export const FIGURE_STATUSES = ["proposed", "confirmed", "retracted", "discarded"] as const;
export type FigureStatus = (typeof FIGURE_STATUSES)[number];

/**
 * Where a figure came from: typed by the person, read from a file, suggested by an agent, a tax
 * return, or read from the person's books (a GnuCash book today, journals next; [8h]). "books" was
 * named by the maintainer (2026-10-08): the id is "books", and where the source is named to people
 * it reads "Books / file".
 */
export const FIGURE_SOURCE_KINDS = ["typed", "file", "agent", "tax-return", "books"] as const;
export type FigureSourceKind = (typeof FIGURE_SOURCE_KINDS)[number];

/** What the routes and the screens see. Dates are calendar days; the amount is whole cents. */
export interface FigureView {
  id: string;
  ventureId: string;
  kind: FigureKind;
  /** First day the total covers, YYYY-MM-DD. */
  periodStart: string;
  /** Last day the total covers (inclusive), YYYY-MM-DD. */
  periodEnd: string;
  /** Integer cents; negative means a loss. */
  amountCents: number;
  /** ISO 4217, as given. */
  currency: string;
  sourceKind: FigureSourceKind;
  sourceLabel: string;
  sourceRows: number | null;
  /** [8f] The tax year a tax-form total is for; null for every other kind. */
  taxYear: number | null;
  /**
   * [8f] The form and line as printed on the return it was read from ("T2125 8299"); null when it
   * wasn't read from a return (typed, say). Kept as read so a line the CRA later renumbers still
   * shows what the person's own form said.
   */
  formLine: string | null;
  /** The road line a "start-up-cost-line" figure prices, with where its amount came from; null on every other kind. */
  costLine: FigureCostLine | null;
  status: FigureStatus;
  editedByPerson: boolean;
  /** ISO timestamp. */
  proposedAt: string;
  confirmedAt: string | null;
  retractedAt: string | null;
}
