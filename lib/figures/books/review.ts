/**
 * [8h] What the "Add from a file" screen shows for a book, worked out here so it can be tested
 * without drawing anything: which accounts start ticked, which can't be ticked and why, the words
 * for each kind of left-out line, and the body sent to /api/figures/propose.
 *
 * Nothing here changes a number: the totals come from totals.ts, the one place a book is added up.
 */
import type { CurrencyTotals } from "./totals";
import type { BookAccount, BookSkip, BookSkipReason } from "./types";

/**
 * The accounts ticked when the book opens: the ones the book itself marks as income (the
 * maintainer's decision, 2026-10-07: income accounts pre-ticked, any can be ticked or unticked).
 * Only a starting point the person sees and changes: an income account can hold interest or
 * GST/HST collected, so every account stays on the list and every tick stays theirs.
 */
export function initialTicks(accounts: readonly BookAccount[]): string[] {
  return accounts.filter((a) => a.markedAsRevenue && tickable(a) === null).map((a) => a.id);
}

/**
 * Null when the account can be ticked; otherwise the plain reason it can't, shown beside it.
 * totals.ts refuses an account whose direction it can't tell, and could only leave out every line
 * of one that holds shares, so neither is offered as a tick.
 */
export function tickable(account: BookAccount): string | null {
  if (account.side === null) return "GnuCash doesn't say which way this account counts";
  if (account.currency === null) return "holds shares or something else that isn't money";
  return null;
}

/**
 * The note shown beside a ticked account the book doesn't mark as income. A sale is posted on two
 * sides (the income account and the bank, say), so ticking the bank or an expense account next to
 * the income ones can add the same sale up twice. Information only, never a verdict: the tick is
 * the person's and stays as they left it; nothing is unticked or blocked.
 */
export const NOT_INCOME_NOTE =
  "This isn't an income account in your book. If a sale also lands here, it may be counted twice.";

/**
 * NOT_INCOME_NOTE for an account that can be ticked but isn't marked as income; null otherwise.
 * The screen shows it only while the account is ticked. An account that can't be ticked already
 * has its own reason beside it (tickable), so it gets no second note.
 */
export function notIncomeNote(account: BookAccount): string | null {
  if (account.markedAsRevenue || tickable(account) !== null) return null;
  return NOT_INCOME_NOTE;
}

/** GnuCash's account types in plain words. An unknown type never reaches here (the reader refuses it). */
const TYPE_WORDS: Readonly<Record<string, string>> = {
  INCOME: "Income",
  EXPENSE: "Expense",
  ASSET: "Asset",
  BANK: "Bank",
  CASH: "Cash",
  CHECKING: "Chequing",
  SAVINGS: "Savings",
  MONEYMRKT: "Money market",
  CREDIT: "Credit card",
  CREDITLINE: "Line of credit",
  LIABILITY: "Liability",
  PAYABLE: "Accounts payable",
  RECEIVABLE: "Accounts receivable",
  EQUITY: "Equity",
  STOCK: "Stock",
  MUTUAL: "Mutual fund",
  CURRENCY: "Currency",
  TRADING: "Trading",
  NONE: "No type",
};

export function accountTypeWords(bookType: string): string {
  return TYPE_WORDS[bookType] ?? bookType;
}

const lineWord = (n: number) => (n === 1 ? "line" : "lines");

/** One left-out reason in words, e.g. "2 lines in a month that isn't over yet". */
export function skipWords(reason: BookSkipReason, n: number): string {
  switch (reason) {
    case "scheduled":
      return `${n} ${lineWord(n)} from scheduled transactions (planned, not posted)`;
    case "not-currency":
      return `${n} ${lineWord(n)} in an account that doesn't hold money`;
    case "no-date":
      return `${n} ${lineWord(n)} without a date DotAmi can read`;
    case "not-over":
      return `${n} ${lineWord(n)} in a month that isn't over yet`;
    case "bad-amount":
      return `${n} ${lineWord(n)} with an amount DotAmi can't read`;
    case "not-cents":
      return `${n} ${lineWord(n)} with an amount that isn't whole cents (DotAmi never rounds)`;
  }
}

/**
 * The things that matter most come first. Scheduled lines aren't in it: the screen has its own line
 * for them, counted over the whole book (totals.ts scheduledLines), so they aren't told twice.
 */
const SKIP_ORDER: BookSkipReason[] = ["no-date", "bad-amount", "not-cents", "not-currency", "not-over"];

/** Left-out lines added up by reason, in SKIP_ORDER, leaving out reasons with none. */
export function skipSummary(skips: readonly BookSkip[]): { reason: BookSkipReason; lines: number }[] {
  return SKIP_ORDER.map((reason) => ({
    reason,
    lines: skips.filter((s) => s.reason === reason).reduce((sum, s) => sum + s.lines, 0),
  })).filter((group) => group.lines > 0);
}

/** One currency's months: those to propose and those already in DotAmi (totals.ts splitKnownByCurrency). */
export interface CurrencySplit {
  currency: string;
  fresh: CurrencyTotals["months"];
  known: CurrencyTotals["months"];
}

/**
 * The body for /api/figures/propose: one gross-revenue figure per fresh month, each in its own
 * account currency (never converted), under the source kind "books" with the file's name as its
 * label. `rows` is how many posted lines went into the figures proposed.
 */
export function bookProposal(ventureId: string, label: string, splits: readonly CurrencySplit[]) {
  const figures = splits.flatMap(({ currency, fresh }) =>
    fresh.map((m) => ({
      kind: "gross-revenue" as const,
      periodStart: m.periodStart,
      periodEnd: m.periodEnd,
      amountCents: m.amountCents,
      currency,
      rows: m.rows,
    })),
  );
  return {
    ventureId,
    source: { kind: "books" as const, label, rows: figures.reduce((sum, f) => sum + f.rows, 0) },
    figures,
  };
}
