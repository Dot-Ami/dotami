/**
 * [8i] The expense records store — shared types. An expense record is ONE business expense (a single
 * record, unlike a figure, which is a total), in one of a figure's states: waiting for the person's
 * click, agreed, turned down or taken back; see
 * prisma/schema.prisma `Expense`, docs/architecture/expense-records.md and the expense section of
 * docs/architecture/figures-privacy-review.md for the rules it is built under.
 *
 * Status and source ids are forever: add to these lists, never rename or reuse one.
 */

/**
 * Same four states, with the same meaning, as a figure's (lib/figures/types.ts):
 * proposed  — the person typed it into the agree prompt, or an importer / the Lens / an outside
 *             agent suggested it; nothing relies on it yet.
 * confirmed — the person agreed to it in the agree prompt.
 * retracted — the person took a confirmed record back; kept so the history stays honest.
 * discarded — the person turned a proposal down; hidden from every list.
 */
export const EXPENSE_STATUSES = ["proposed", "confirmed", "retracted", "discarded"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/**
 * Where a record came from: typed by the person, a row of a spreadsheet they dropped, or an agent
 * (the Lens or an outside one). "bank" (a statement's ticked rows) is appended when the bank and
 * card statements story [8g] exists and the maintainer has ruled on what a bank row may leave behind.
 */
export const EXPENSE_SOURCE_KINDS = ["typed", "file", "agent"] as const;
export type ExpenseSourceKind = (typeof EXPENSE_SOURCE_KINDS)[number];

/** What the routes and the screens see. The date is a calendar day; the amount is whole cents. */
export interface ExpenseView {
  id: string;
  ventureId: string;
  /** The calendar day of the purchase, YYYY-MM-DD. */
  date: string;
  /** Integer cents; always more than zero (a refund is not modelled yet). */
  amountCents: number;
  /** ISO 4217, as given. */
  currency: string;
  paidTo: string;
  whatFor: string;
  /** Only ever what the person picked or agreed to; DotAmi never fills it in. */
  category: string | null;
  sellerAddress: string | null;
  vendorGstNumber: string | null;
  sourceKind: ExpenseSourceKind;
  sourceLabel: string;
  status: ExpenseStatus;
  editedByPerson: boolean;
  /** ISO timestamps. */
  proposedAt: string;
  agreedAt: string | null;
  retractedAt: string | null;
}
