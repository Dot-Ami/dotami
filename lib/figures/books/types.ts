/**
 * [8h] Books on the person's own computer — the shared shapes.
 *
 * A "book" is a set of accounts and the amounts posted to them, kept by a program (GnuCash today;
 * hledger journals, Sage 50 and QuickBooks Desktop later). Every reader turns its own format into
 * the same two lists — accounts and posted lines — and everything after that (which accounts count
 * as revenue, the monthly totals) is done once, in totals.ts, the same way for every kind of book.
 *
 * Readers run inside the app's window, in memory, like the spreadsheet reader ([8c]): the book's
 * bytes never go to the server or the disk, and nothing in lib/figures/books logs an account, a
 * line or an amount (docs/architecture/figures-privacy-review.md). Nothing here writes back to a
 * book — there is no way to.
 */

/** Which kind of book a reader read. More are appended as their readers are built. */
export type BookFormat = "gnucash-xml";

/**
 * An amount exactly as a book writes it, as a fraction. GnuCash writes "12500/100"; a journal's
 * "12.50" is 1250/100. Kept as a fraction (never a float) so "is this whole cents?" has an exact
 * answer. `den` is always above zero.
 */
export interface BookAmount {
  num: bigint;
  den: bigint;
}

/**
 * Which way an account naturally runs. Books record every amount as a debit (positive) or a credit
 * (negative); revenue is a credit, so a revenue account's amounts are flipped to read as positive
 * income. A bank account (a debit account) is not flipped: money in is already positive.
 */
export type AccountSide = "credit" | "debit";

export interface BookAccount {
  /** The book's own id for the account (GnuCash: a GUID). Opaque; only ever compared, never shown. */
  id: string;
  /** The account's path as the person knows it, e.g. "Income:Consulting". */
  fullName: string;
  /** The account's type exactly as the book writes it, e.g. "INCOME". */
  bookType: string;
  /** Null when DotAmi can't tell which way the account runs; such an account can't be ticked. */
  side: AccountSide | null;
  /** ISO 4217 code of the account's own currency; null when it holds something else (shares, say). */
  currency: string | null;
  /**
   * True when the BOOK itself marks the account as income. Only a suggestion for what to tick first:
   * the person still sees every tick, and an income account can hold interest or sales tax that
   * isn't business revenue.
   */
  markedAsRevenue: boolean;
}

/** One amount posted to one account on one day. */
export interface BookLine {
  accountId: string;
  /** The calendar day it was posted, YYYY-MM-DD; null when the book's date can't be read with certainty. */
  day: string | null;
  /**
   * The amount in the account's OWN currency, debit positive and credit negative; null when the
   * book's text for it can't be read as a fraction.
   */
  amount: BookAmount | null;
  /**
   * True for a line from a scheduled or template transaction (something the book plans to post,
   * not something that happened). Such a line is never counted, whatever account it points at.
   */
  scheduled: boolean;
}

/** What a reader hands over: the accounts to choose from and every line posted to them. */
export interface BookData {
  format: BookFormat;
  accounts: BookAccount[];
  lines: BookLine[];
}

/** A reader's outcome. `error` is a plain sentence for the person; it never quotes the book's amounts or text. */
export type BookReadResult = { ok: true; book: BookData } | { ok: false; error: string };

/**
 * Why lines of a ticked account were left out of the totals. Every such line is accounted for in
 * the result — none is dropped silently.
 *
 * scheduled    — from a scheduled or template transaction: planned, not real
 * not-currency — the account holds something that isn't a currency (shares, say)
 * no-date      — a date DotAmi can't read with certainty
 * not-over     — its month hasn't ended yet, so there is no total for it yet
 * bad-amount   — an amount DotAmi can't read with certainty
 * not-cents    — an amount that isn't a whole number of cents (DotAmi never rounds)
 */
export type BookSkipReason =
  "scheduled" | "not-currency" | "no-date" | "not-over" | "bad-amount" | "not-cents";

/** A group of left-out lines that share a reason, an account and a month. */
export interface BookSkip {
  reason: BookSkipReason;
  accountId: string;
  /** YYYY-MM when the line's day is readable, otherwise null. */
  month: string | null;
  /** How many lines. */
  lines: number;
}
