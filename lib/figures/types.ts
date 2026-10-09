/**
 * [8a] The figures store — shared types. A "figure" is a total about the person's business
 * (revenue for a year, say) that the person has agreed to; see prisma/schema.prisma `Figure`
 * and docs/architecture/figures-privacy-review.md for the rules the store is built under.
 *
 * Kinds are IDs and IDs are forever: add to this list, never rename or reuse one.
 */
export const FIGURE_KINDS = ["gross-revenue"] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

export const FIGURE_KIND_LABELS: Record<FigureKind, string> = {
  "gross-revenue": "Revenue (gross, before expenses)",
};

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
  status: FigureStatus;
  editedByPerson: boolean;
  /** ISO timestamp. */
  proposedAt: string;
  confirmedAt: string | null;
  retractedAt: string | null;
}
