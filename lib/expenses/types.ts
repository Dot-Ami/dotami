/**
 * [8i] The expense records store — shared types. An expense record is ONE business expense (a single
 * record, unlike a figure, which is a total), in one of a figure's states: waiting for the person's
 * click, agreed, turned down or taken back; see
 * prisma/schema.prisma `Expense`, docs/architecture/expense-records.md and the expense section of
 * docs/architecture/figures-privacy-review.md for the rules it is built under.
 *
 * Status and source ids are forever: add to these lists, never rename or reuse one.
 */

import type { ReceiptView } from "./receipts/types";

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

/**
 * What kind of record it is (the maintainer's decision, 2026-10-08, on refunds and credits: the
 * person chooses how each one is kept).
 * expense — a purchase. Its amount is usually more than zero; a refund or credit the person keeps
 *           "as a negative amount" is an expense record with an amount below zero, optionally
 *           pointing at the expense it came from.
 * refund  — a separate refund record: the amount that came back (more than zero), always pointing at
 *           the expense it came from.
 * Either way DotAmi only keeps what the person typed; it never says how a refund is taxed.
 */
export const EXPENSE_RECORD_KINDS = ["expense", "refund"] as const;
export type ExpenseRecordKind = (typeof EXPENSE_RECORD_KINDS)[number];

/** What the routes and the screens see. The date is a calendar day; the amount is whole cents. */
export interface ExpenseView {
  id: string;
  /** The idea it is attached to, or null while it is "not attached yet". */
  ventureId: string | null;
  /** The calendar day of the purchase (of the refund, for a refund), YYYY-MM-DD. */
  date: string;
  /**
   * Integer cents, never zero. Below zero only on an "expense" record that keeps a refund or credit
   * as a negative amount; a "refund" record holds the amount that came back, above zero.
   */
  amountCents: number;
  /** ISO 4217, as given. */
  currency: string;
  paidTo: string;
  whatFor: string;
  /** Only ever what the person picked or agreed to; DotAmi never fills it in. */
  category: string | null;
  sellerAddress: string | null;
  vendorGstNumber: string | null;
  recordKind: ExpenseRecordKind;
  /** The expense a refund or credit came from, when there is one (and it hasn't been deleted). */
  refundOfId: string | null;
  /** The GST/HST part of the amount as the person gave it, whole cents, never negative; null if not given. */
  gstHstCents: number | null;
  /** A refund's credit note details as typed (its number, its date); null if not given. */
  creditNote: string | null;
  /** The person's own business share, a whole percent 1-100, kept beside the full amount; null if not given. */
  businessSharePercent: number | null;
  sourceKind: ExpenseSourceKind;
  sourceLabel: string;
  status: ExpenseStatus;
  editedByPerson: boolean;
  /** ISO timestamps. */
  proposedAt: string;
  agreedAt: string | null;
  retractedAt: string | null;
  /**
   * The receipt file the person added, described (its type as DotAmi read it from the bytes, its
   * size, when it was added), or null. Never the file itself, its id or its hash: the bytes answer
   * only DotAmi's own page (lib/expenses/receipts/).
   */
  receipt: ReceiptView | null;
}
