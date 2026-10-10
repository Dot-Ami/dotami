/**
 * The refund rule, shared by every place DotAmi adds rows up into monthly revenue: a spreadsheet's
 * refunds column ([8c], lib/figures/file/totals.ts) and a bank or card statement's ticked rows
 * ([8g], lib/figures/bank/totals.ts). One rule, so the two screens can't drift apart (the
 * maintainer's decision, 2026-10-07: an optional refunds pick, the same rule on both screens).
 *
 * The rule:
 *  - money in raises its month;
 *  - money going out counts only when the person said refunds count (picked a refunds column, or
 *    allowed refunds on a statement), and then it LOWERS the month the money left: the row's own
 *    date, never the month of the sale it pays back. A row only knows when money moved, so a refund
 *    paid in April for a March sale lowers April, and the screen says so;
 *  - zero moves nothing, so it never counts.
 * A month can come out negative when its refunds outweigh its sales; the agree prompt accepts that.
 *
 * Pure: no logging, no I/O, and nothing here ever sees a description or a name, only cents.
 */

/**
 * What a row adds to its month's revenue under the rule above, in signed integer cents, or null
 * when the row doesn't count (zero, or money out while refunds don't count).
 *
 * `signedCents` is positive for money in and negative for money out.
 */
export function revenueEffect(signedCents: number, refundsCount: boolean): number | null {
  if (signedCents === 0) return null;
  if (signedCents < 0 && !refundsCount) return null;
  return signedCents;
}

/**
 * A refunds column's amount as money out. The column holds what was paid back, so its SIZE is what
 * leaves, whichever sign the file wrote: a ledger's Debit column writes 40.00, a sheet someone keeps
 * may write -40.00 or (40.00), and both mean 40.00 went back to a customer. Reading the sign
 * literally would turn "-40.00" into a sale.
 */
export function refundPaidOut(cents: number): number {
  return -Math.abs(cents);
}
