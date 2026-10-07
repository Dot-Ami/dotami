/**
 * [8g] Ticked bank or card rows → one total per complete calendar month.
 *
 * DotAmi never decides which deposits are sales: a deposit can be a transfer between the person's
 * own accounts, a loan, a refund, or money from selling something they own. So nothing counts
 * until the person ticks it, and a total is made only for a month the statement covers in full
 * that has ended. Every row that is NOT in a total is listed with exactly one plain reason, so the
 * person can see what each total leaves out.
 *
 * The result holds ids, reasons, months and cents — never a description, a name or a bank id — so
 * it can't carry a stranger's details or an account number anywhere (see types.ts).
 * Nothing here logs, and the one error message carries no amount.
 */
import { isRealCalendarDay } from "../validate";
import { coverageChecker, lastDayOfMonth, monthOf } from "./coverage";
import { LEFT_OUT_REASONS } from "./types";
import type {
  BankRow,
  BankTotalsOptions,
  BankTotalsResult,
  CoverageRange,
  HeldBackMonth,
  HeldBackReason,
  LeftOutReason,
  LeftOutRow,
  MonthTotal,
} from "./types";

/** A real month is a total only if it is over: its last day is before `today`. */
function monthIsOver(month: string, today: string): boolean {
  // Stricter than the [8c] file totals, which accept a month on its own last day. A statement
  // downloaded on the 31st can't hold what posts that evening, so the month isn't done yet.
  // A `today` that isn't a real day means no month is over — never the other way round.
  return isRealCalendarDay(today) && lastDayOfMonth(month) < today;
}

/** True when the row's day, amount and currency are ones we can use with certainty. */
function isReadable(row: BankRow): boolean {
  return (
    isRealCalendarDay(row.day) &&
    Number.isSafeInteger(row.cents) &&
    typeof row.currency === "string" &&
    /^[A-Z]{3}$/.test(row.currency)
  );
}

/**
 * Adds up the ticked rows by month.
 *
 * `ticks` is the set of row ids the person ticked; an id that matches no row is ignored.
 * `coverage` is what the download(s) cover in full (see coverage.ts), `today` is YYYY-MM-DD, and
 * every row is expected to come from ONE account — a bank id (FITID) is only unique within one.
 */
export function bankMonthlyTotals(
  rows: readonly BankRow[],
  ticks: ReadonlySet<string>,
  coverage: readonly CoverageRange[],
  today: string,
  options: BankTotalsOptions,
): BankTotalsResult {
  // One reason per row, by position (so a caller that repeats an id can't make two rows share a fate).
  const reasonAt: (LeftOutReason | null)[] = rows.map(() => null);
  const setReason = (i: number, reason: LeftOutReason) => {
    if (reasonAt[i] === null) reasonAt[i] = reason;
  };

  // 1. Rows we can't read with certainty never get further. A reader shouldn't produce one, but a
  //    wrong date or amount would silently move money between months.
  rows.forEach((row, i) => {
    if (!isReadable(row)) setReason(i, "unreadable");
  });

  // 2. Corrections, applied before anything is added up. A correction names the earlier row by the
  //    bank's id: "replace" swaps it for the correcting row, "delete" just cancels it (the
  //    correcting row is then a notice, not a transaction, so it isn't counted either).
  //    Applied even when the correcting row itself is unreadable, so a stale amount can't survive.
  const byFitid = new Map<string, number[]>();
  rows.forEach((row, i) => {
    if (!row.fitid) return;
    const list = byFitid.get(row.fitid) ?? [];
    list.push(i);
    byFitid.set(row.fitid, list);
  });
  rows.forEach((row, i) => {
    if (!row.corrects) return;
    for (const target of byFitid.get(row.corrects.fitid) ?? []) {
      if (target !== i) setReason(target, "corrected");
    }
    if (row.corrects.action === "delete") setReason(i, "corrected");
  });

  // 3. Pending rows: the bank itself says they may change or vanish (OFX § 11.4.1).
  rows.forEach((row, i) => {
    if (row.pending) setReason(i, "pending");
  });

  // 4. The same transaction twice (two overlapping downloads). The bank's id alone isn't enough —
  //    some banks reuse short ids — so the day, amount and currency must match too. The first copy
  //    stays; a tick on any copy is a tick on it, so the person's choice isn't lost.
  const firstCopy = new Map<string, number>();
  const tickedViaCopy = new Set<number>();
  rows.forEach((row, i) => {
    if (reasonAt[i] !== null || !row.fitid) return;
    const key = `${row.fitid}\u0000${row.day}\u0000${row.cents}\u0000${row.currency}`;
    const kept = firstCopy.get(key);
    if (kept === undefined) {
      firstCopy.set(key, i);
      return;
    }
    if (ticks.has(row.id)) tickedViaCopy.add(kept);
    setReason(i, "duplicate");
  });

  // Months that have at least one row still in play, for the "why has this month no total" list.
  const rowsInMonth = new Map<string, number>();
  rows.forEach((row, i) => {
    if (reasonAt[i] === null)
      rowsInMonth.set(monthOf(row.day), (rowsInMonth.get(monthOf(row.day)) ?? 0) + 1);
  });

  const coverageOf = coverageChecker(coverage);
  const holds = new Map<string, HeldBackReason | null>();
  /** Why a month can't have a total, or null when it is complete and over. Asked once per month. */
  const monthHold = (month: string): HeldBackReason | null => {
    if (holds.has(month)) return holds.get(month)!;
    let hold: HeldBackReason | null;
    if (!monthIsOver(month, today)) {
      hold = "not-over";
    } else {
      const covered = coverageOf(month);
      hold =
        covered === "end-day-unsure"
          ? "end-day-unsure"
          : covered === "partial"
            ? "partial-month"
            : null;
    }
    holds.set(month, hold);
    return hold;
  };

  // 5–8. The person's choices, then the month. Nothing is ticked unless the person ticked it.
  const sums = new Map<string, { cents: bigint; rows: number }>();
  let rowsCounted = 0;
  rows.forEach((row, i) => {
    if (reasonAt[i] !== null) return;
    if (!ticks.has(row.id) && !tickedViaCopy.has(i)) return setReason(i, "not-ticked");
    // Only money in counts. Money out counts only when refunds are allowed, and then it lowers the
    // month it left the account in (a bank statement only knows when money moved).
    if (row.cents === 0 || (row.cents < 0 && !options.allowRefunds))
      return setReason(i, "not-money-in");
    if (row.currency !== options.currency) return setReason(i, "other-currency");
    const month = monthOf(row.day);
    const hold = monthHold(month);
    if (hold !== null) return setReason(i, hold);

    // BigInt, so a very long statement can never silently lose a cent to floating point.
    const sum = sums.get(month) ?? { cents: 0n, rows: 0 };
    sum.cents += BigInt(row.cents);
    sum.rows += 1;
    sums.set(month, sum);
    rowsCounted += 1;
  });

  const months: MonthTotal[] = [];
  for (const month of [...sums.keys()].sort()) {
    const sum = sums.get(month)!;
    const amount = Number(sum.cents);
    if (!Number.isSafeInteger(amount) || BigInt(amount) !== sum.cents) {
      throw new Error("A month's total is too large to hold exactly.");
    }
    months.push({
      periodStart: `${month}-01`,
      periodEnd: lastDayOfMonth(month),
      amountCents: amount,
      rows: sum.rows,
    });
  }

  const heldBack: HeldBackMonth[] = [];
  for (const month of [...rowsInMonth.keys()].sort()) {
    const reason = monthHold(month);
    if (reason !== null) heldBack.push({ month, reason, rows: rowsInMonth.get(month)! });
  }

  const leftOut: LeftOutRow[] = [];
  rows.forEach((row, i) => {
    const reason = reasonAt[i];
    if (reason !== null) leftOut.push({ id: row.id, reason });
  });

  return { months, currency: options.currency, rowsCounted, leftOut, heldBack };
}

/** How many left-out rows have each reason, every reason present (zero when none), ready to list on screen. */
export function countLeftOut(leftOut: readonly LeftOutRow[]): Record<LeftOutReason, number> {
  const counts = Object.fromEntries(LEFT_OUT_REASONS.map((reason) => [reason, 0])) as Record<
    LeftOutReason,
    number
  >;
  for (const { reason } of leftOut) counts[reason] += 1;
  return counts;
}
