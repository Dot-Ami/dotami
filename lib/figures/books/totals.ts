/**
 * [8h] Books — accounts the person ticked in, exact monthly totals out, one list per currency.
 *
 * This is the one place the rules for adding a book up live, so every kind of book follows them
 * the same way:
 *  - only the accounts the person ticked are added up, and each tick is theirs to make;
 *  - a scheduled or template line is never counted, whatever account it points at;
 *  - money is exact: whole cents or the line is left out, never rounded;
 *  - currencies are never mixed and never converted — each gets its own list of months;
 *  - a month that hasn't ended has no total yet;
 *  - a revenue (credit) account's amounts are flipped to read as positive income, and a month where
 *    refunds outweigh sales stays negative and is shown.
 * Every line of a ticked account that isn't added is reported with its reason; none is dropped
 * silently. Nothing here logs, and no message carries an amount or an account's name.
 */
import { splitAlreadyKnown } from "../file/totals";
import type { MonthTotal } from "../file/types";
import type { FigureView } from "../types";
import { isRealCalendarDay } from "../validate";
import { amountToCents } from "./amount";
import type { BookData, BookSkip, BookSkipReason } from "./types";

export interface CurrencyTotals {
  /** ISO 4217, as the book's account carries it. */
  currency: string;
  /** Oldest first; only months that have ended by `today`. */
  months: MonthTotal[];
  /** Lines added into `months`. */
  linesCounted: number;
}

export type BooksTotalsResult =
  | {
      ok: true;
      /** One entry per currency, ordered by code. Currencies are never added together. */
      currencies: CurrencyTotals[];
      skipped: BookSkip[];
      /** How many scheduled or template lines the book holds, for a one-line note on the screen. */
      scheduledLines: number;
    }
  | { ok: false; error: string };

const refuse = (error: string): BooksTotalsResult => ({ ok: false, error });

/** The last day of a YYYY-MM month, written YYYY-MM-DD (leap years included). */
function lastDayOfMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/** The YYYY-MM of a day that is a real calendar day, otherwise null. */
function monthOf(day: string | null): string | null {
  return day !== null && isRealCalendarDay(day) ? day.slice(0, 7) : null;
}

/**
 * Adds up the ticked accounts month by month. `today` is YYYY-MM-DD, passed in (not read from the
 * clock) so the caller decides which day counts as today and tests stay deterministic.
 *
 * Refuses the whole job (ok: false) only when the ticks themselves can't be honoured: an id that
 * isn't in the book, or an account whose direction DotAmi can't tell. A line it can't read is
 * left out and listed, like a spreadsheet row ([8c]).
 */
export function booksMonthlyTotals(
  book: BookData,
  tickedIds: readonly string[],
  today: string,
): BooksTotalsResult {
  if (!isRealCalendarDay(today)) return refuse("DotAmi couldn't tell today's date.");

  const accounts = new Map(book.accounts.map((a) => [a.id, a]));
  const ticked = new Set(tickedIds);
  for (const id of ticked) {
    const account = accounts.get(id);
    if (!account) {
      return refuse(
        "One of the accounts picked isn't in this book. Open the book again and pick the accounts again.",
      );
    }
    if (account.side === null) {
      return refuse(
        "DotAmi can't tell which way one of the picked accounts counts, so it can't add it up as revenue. Leave it unticked.",
      );
    }
  }

  // currency -> month (YYYY-MM) -> exact sum of cents and how many lines went into it.
  const sums = new Map<string, Map<string, { cents: bigint; lines: number }>>();
  const skips = new Map<string, BookSkip>();
  let scheduledLines = 0;

  const skip = (reason: BookSkipReason, accountId: string, month: string | null) => {
    const key = `${reason}|${accountId}|${month ?? ""}`;
    const group = skips.get(key);
    if (group) group.lines += 1;
    else skips.set(key, { reason, accountId, month, lines: 1 });
  };

  for (const line of book.lines) {
    // A planned line is not a posted one: out, before anything else is asked of it.
    if (line.scheduled) {
      scheduledLines += 1;
      if (ticked.has(line.accountId)) skip("scheduled", line.accountId, monthOf(line.day));
      continue;
    }
    if (!ticked.has(line.accountId)) continue;

    const account = accounts.get(line.accountId)!; // every tick was checked above
    const month = monthOf(line.day);

    if (account.currency === null) {
      skip("not-currency", account.id, month);
      continue;
    }
    if (month === null) {
      skip("no-date", account.id, null);
      continue;
    }
    // ISO dates compare correctly as text: a month that ends after today isn't over.
    if (lastDayOfMonth(month) > today) {
      skip("not-over", account.id, month);
      continue;
    }
    if (line.amount === null) {
      skip("bad-amount", account.id, month);
      continue;
    }
    const cents = amountToCents(line.amount);
    if (cents === null) {
      skip("not-cents", account.id, month);
      continue;
    }

    // Revenue lives on the credit side, where the book writes it as a negative number.
    const signed = account.side === "credit" ? -cents : cents;

    let months = sums.get(account.currency);
    if (!months) {
      months = new Map();
      sums.set(account.currency, months);
    }
    const sum = months.get(month) ?? { cents: 0n, lines: 0 };
    sum.cents += signed;
    sum.lines += 1;
    months.set(month, sum);
  }

  const currencies: CurrencyTotals[] = [];
  for (const currency of [...sums.keys()].sort()) {
    const months: MonthTotal[] = [];
    let linesCounted = 0;
    const byMonth = sums.get(currency)!;
    for (const month of [...byMonth.keys()].sort()) {
      const sum = byMonth.get(month)!;
      const amountCents = Number(sum.cents);
      if (!Number.isSafeInteger(amountCents) || BigInt(amountCents) !== sum.cents) {
        return refuse("A month's total is too large to hold exactly.");
      }
      months.push({
        periodStart: `${month}-01`,
        periodEnd: lastDayOfMonth(month),
        amountCents,
        rows: sum.lines,
      });
      linesCounted += sum.lines;
    }
    currencies.push({ currency, months, linesCounted });
  }

  return { ok: true, currencies, skipped: [...skips.values()], scheduledLines };
}

/**
 * Splits each currency's months into those the figures store already holds and the fresh ones,
 * using the same rule as a spreadsheet's totals (same month, same amount, same currency): a
 * different amount for a month is something new to look at, never silently merged.
 */
export function splitKnownByCurrency(
  currencies: CurrencyTotals[],
  existing: Pick<
    FigureView,
    "kind" | "periodStart" | "periodEnd" | "amountCents" | "currency" | "status"
  >[],
): { currency: string; fresh: MonthTotal[]; known: MonthTotal[] }[] {
  return currencies.map(({ currency, months }) => ({
    currency,
    ...splitAlreadyKnown(months, existing, currency),
  }));
}
