/**
 * [8g] Bank and card statements — shared types for the pure logic.
 *
 * A statement is read in the app's window, in memory, like an [8c] spreadsheet. A statement holds
 * far more than business totals, so these types are shaped by what must NEVER travel with a row:
 *
 *   - There is no field for an account number, a card number, a transit or institution number or
 *     a branch. A reader (CSV today, OFX later) simply has nowhere to put one, so nothing
 *     downstream can send, show or store one by accident. tests/figures-bank-logic.spec.ts fails
 *     if a field like that is ever added to a type in this folder.
 *   - The results (`BankTotalsResult`) carry no text from the file at all: no description, no
 *     payer name, no bank id. A left-out row is named only by the opaque id the caller gave it,
 *     and the screen looks the row up in its own memory to show it.
 *
 * Nothing in lib/figures/bank logs, stores or sends anything.
 */
import type { MonthTotal } from "../file/types";

// The same shape lib/brain/records.ts adds up and the propose route takes, so a bank month needs
// no translating — and splitAlreadyKnown ([8c]) works on it as it is.
export type { MonthTotal };

/** What an OFX correction says to do to an earlier transaction (OFX Banking 2.3, § 11.4.4.1). */
export interface BankCorrection {
  /** The bank's id (FITID) of the earlier transaction this one corrects. */
  fitid: string;
  /** "replace": this row stands in for the earlier one. "delete": the earlier one is cancelled. */
  action: "replace" | "delete";
}

/**
 * One transaction from a statement, as the screen shows it and the totals add it up.
 * Money in is positive, money out is negative, whatever the bank's own sign convention was —
 * the reader that built the row has already turned the bank's convention into this one.
 */
export interface BankRow {
  /**
   * The caller's own key for this row, unique among the rows passed in (a CSV row number, a
   * counter). Everything DotAmi says about a row says only this. Never put a bank id, a name or
   * any text from the file in it.
   */
  id: string;
  /** The day the bank posted it, YYYY-MM-DD, exactly as the file wrote it — never moved by a time zone. */
  day: string;
  /** Whole cents. Positive is money in, negative is money out. */
  cents: number;
  /** ISO 4217, the currency `cents` is in (see "other-currency" below). */
  currency: string;
  /**
   * What the bank printed next to the transaction. Shown on screen so the person can tell what a
   * deposit was; it can hold names and even digits of other people's accounts, so it never goes
   * into a result and never leaves the page.
   */
  description: string;
  /** True for a transaction that hasn't posted yet (OFX STMTTRNP, a hold); it may still change. */
  pending?: boolean;
  /**
   * The bank's id for the transaction (OFX FITID). Used only to count one transaction once when
   * two downloads overlap, and to find the row a correction points at. Absent for CSV rows.
   */
  fitid?: string;
  /** Set when this row corrects or cancels an earlier one (OFX CORRECTFITID + CORRECTACTION). */
  corrects?: BankCorrection;
}

/**
 * A stretch of calendar days a statement covers in full: the days between where the download
 * started and where it stopped. A CSV carries no such dates, so for a CSV these are the months
 * the person says they downloaded in full; an OFX file states its own start and end.
 */
export interface CoverageRange {
  /** First day covered, YYYY-MM-DD. */
  from: string;
  /** Last day covered, YYYY-MM-DD. */
  to: string;
  /**
   * True when `to` was written as a bare date, with no time of day. OFX calls its end date
   * "exclusive" (§ 3.2.7) but also warns that a bare end date is easy to misread (§ 3.2.8), so
   * the file alone can't say whether `to` itself is included. The person is asked; until they
   * answer, a month ending on `to` isn't treated as complete.
   */
  toIsUnsure?: boolean;
}

/** The first and last day with a row in a file, as the screen shows them ("2026-01-15 to 2026-03-31"). */
export interface DaySpan {
  first: string;
  last: string;
}

/**
 * Why a row is in no total. Each row gets exactly one reason — the first of these that applies, in
 * this order — so the counts on screen add up to every row the person didn't see counted.
 *
 * unreadable     — its date or amount isn't one DotAmi can read with certainty
 * corrected      — the bank replaced or cancelled it with a later correction
 * pending        — not posted yet, so the bank may still change or drop it
 * duplicate      — the same transaction listed twice (two overlapping downloads); counted once
 * not-ticked     — the person didn't tick it: nothing counts as revenue until it is ticked
 * not-money-in   — ticked, but it is money going out (or zero) and only money in can count
 * other-currency — in a different currency from the statement; DotAmi never converts
 * not-over       — its month hasn't ended yet (checked before coverage: no download can complete it today)
 * partial-month  — its month isn't fully covered by what was downloaded, so that month has no total
 * end-day-unsure — its month's last day might not be in the file (an end date with no time)
 */
export const LEFT_OUT_REASONS = [
  "unreadable",
  "corrected",
  "pending",
  "duplicate",
  "not-ticked",
  "not-money-in",
  "other-currency",
  "not-over",
  "partial-month",
  "end-day-unsure",
] as const;
export type LeftOutReason = (typeof LEFT_OUT_REASONS)[number];

/**
 * The plain sentence shown beside each reason's count. A Record, so adding a reason above fails
 * the type check until it has its sentence here.
 */
export const LEFT_OUT_REASON_TEXT: Record<LeftOutReason, string> = {
  unreadable: "DotAmi couldn't read its date or amount with certainty.",
  corrected: "The bank later replaced or cancelled it.",
  pending: "It hasn't posted yet, so the bank may still change it.",
  duplicate: "The same transaction was listed twice. The other copy is the one counted.",
  "not-ticked": "You didn't tick it.",
  "not-money-in": "It isn't money in, and only money in can be counted.",
  "other-currency":
    "It is in a different currency from this statement. DotAmi doesn't convert currencies.",
  "not-over": "Its month isn't over yet, so that month has no total yet.",
  "partial-month":
    "What you downloaded doesn't cover all of its month, so that month has no total.",
  "end-day-unsure":
    "The file doesn't say whether its month's last day is included, so that month has no total yet.",
};

export interface LeftOutRow {
  /** The caller's id for the row (BankRow.id) — never any text from the file. */
  id: string;
  reason: LeftOutReason;
}

/** Why a month with rows in it got no total. These are the month-level reasons from LEFT_OUT_REASONS. */
export type HeldBackReason = "partial-month" | "end-day-unsure" | "not-over";

export interface HeldBackMonth {
  /** YYYY-MM */
  month: string;
  reason: HeldBackReason;
  /** How many rows the file has in that month (ticked or not), so the screen can say "12 rows". */
  rows: number;
}

export interface BankTotalsOptions {
  /** ISO 4217. The statement's currency; rows in any other are left out, never converted. */
  currency: string;
  /**
   * Whether a ticked row of money going OUT is subtracted from its month (a refund paid back to a
   * customer, counted in the month the money left). The maintainer allowed it as an optional pick
   * (2026-10-07), under the same rule as the spreadsheet screen's refunds column
   * (lib/figures/refunds.ts). Off unless the caller turns it on; while off, a ticked money-out row is
   * left out as "not-money-in".
   */
  allowRefunds?: boolean;
}

export interface BankTotalsResult {
  /** Oldest first; only complete months that have ended and have at least one counted row. */
  months: MonthTotal[];
  /** The currency every figure in `months` is in. */
  currency: string;
  /** Rows added into `months`. */
  rowsCounted: number;
  /** Every other row, once each, in the order they were given, with the one reason it was left out. */
  leftOut: LeftOutRow[];
  /** Months that have rows but got no total, with why. Oldest first. */
  heldBack: HeldBackMonth[];
}
