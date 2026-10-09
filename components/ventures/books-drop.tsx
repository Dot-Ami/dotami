"use client";

import { useId, useMemo, useState } from "react";

import { Pill } from "@/components/ui";
import {
  accountTypeWords,
  bookProposal,
  initialTicks,
  notIncomeNote,
  skipSummary,
  skipWords,
  tickable,
} from "@/lib/figures/books/review";
import { booksMonthlyTotals, splitKnownByCurrency } from "@/lib/figures/books/totals";
import type { BookData } from "@/lib/figures/books/types";
import type { FigureView } from "@/lib/figures/types";
import { useLocalToday } from "@/lib/figures/use-local-today";

import { describePeriod, formatAmount } from "./agree-prompt";

/**
 * [8h] "Add from a file" for a GnuCash book: the book's accounts to tick, then monthly totals to
 * review. Shown by file-drop.tsx once the books worker (lib/figures/books/read-book.ts) has read
 * the book; this component only holds what the worker handed back, in memory, and never the
 * book's bytes.
 *
 * The accounts GnuCash marks as income start ticked (the maintainer's decision, 2026-10-07) and any
 * account can be ticked or unticked: an income account can hold interest or GST/HST collected, so
 * every account is shown, none hidden. The totals are worked out by lib/figures/books/totals.ts
 * as the ticks change; only the totals the person sends for review leave the page, through
 * /api/figures/propose under the source kind "books", and they wait in the agree prompt.
 */

const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-xs text-amber";
const FIELD_LABEL = "block font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";

/** Same cap as the figures route: how many figures one review may hold. */
const MAX_FIGURES_PER_FILE = 500;
const MAX_LABEL_CHARS = 120;

const lineWord = (n: number) => (n === 1 ? "line" : "lines");

export type BookProposal = ReturnType<typeof bookProposal>;

export function BookReview({
  ventureId,
  fileName,
  book,
  existing,
  busy,
  onReview,
}: {
  ventureId: string;
  fileName: string;
  book: BookData;
  existing: FigureView[];
  busy: boolean;
  onReview: (body: BookProposal) => void;
}) {
  const uid = useId();
  // The person's own calendar day: a month is "over" by their clock, and the screen moves on at
  // midnight without a reload.
  const today = useLocalToday();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(
    () => new Set(initialTicks(book.accounts)),
  );

  const totals = useMemo(
    () => booksMonthlyTotals(book, [...ticked], today),
    [book, ticked, today],
  );
  const splits = useMemo(
    () => (totals.ok ? splitKnownByCurrency(totals.currencies, existing) : []),
    [totals, existing],
  );
  const skipped = useMemo(() => (totals.ok ? skipSummary(totals.skipped) : []), [totals]);
  const freshCount = splits.reduce((sum, s) => sum + s.fresh.length, 0);
  const label = fileName.trim().slice(0, MAX_LABEL_CHARS) || "a GnuCash book";

  function toggle(id: string, on: boolean) {
    setTicked((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="mt-3">
      {/* Focus lands here once the book is read, since the Choose a file button it came from is gone. */}
      <p data-autofocus tabIndex={-1} className="text-xs text-paper-dim outline-hidden">
        File: <span className="text-paper">{fileName}</span>
      </p>
      {/* GnuCash writes the book to disk only when the person saves; the file is what was saved. */}
      <p className="mt-1 text-[11px] text-paper-dim">
        DotAmi read your last save. Anything changed in GnuCash after that save isn&apos;t in it.
      </p>
      <p className="mt-1 text-[11px] text-stone-dim">
        DotAmi&apos;s GnuCash reader was tested on invented books written to GnuCash&apos;s file
        format, not on real ones, so check the accounts and totals.
      </p>

      <fieldset className="mt-3" aria-describedby={`${uid}-accounts-hint`}>
        <legend className={FIELD_LABEL}>Accounts in this book</legend>
        <p id={`${uid}-accounts-hint`} className="mt-1 max-w-prose text-[11px] text-stone-dim">
          Accounts GnuCash marks as income start ticked. An income account can also hold
          interest, or GST/HST you collected, which isn&apos;t revenue from sales. Tick or untick
          any account; only the ticked ones are added up.
        </p>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-2 text-xs">
          {book.accounts.map((account) => {
            const reason = tickable(account);
            const id = `${uid}-acct-${account.id}`;
            // A ticked bank or expense account can hold the other side of a sale already counted
            // in an income account: say so beside it, and leave the tick exactly as the person set it.
            const note = reason === null && ticked.has(account.id) ? notIncomeNote(account) : null;
            const describedBy = reason !== null ? `${id}-why` : note !== null ? `${id}-note` : undefined;
            return (
              <li key={account.id} className="flex flex-wrap items-baseline gap-x-2">
                <input
                  id={id}
                  type="checkbox"
                  checked={reason === null && ticked.has(account.id)}
                  disabled={reason !== null || busy}
                  onChange={(e) => toggle(account.id, e.target.checked)}
                  aria-describedby={describedBy}
                  className="accent-maple"
                />
                <label htmlFor={id} className={reason === null ? "text-paper" : "text-stone-dim"}>
                  {account.fullName}
                </label>
                <span className="text-[11px] text-stone-dim">
                  {accountTypeWords(account.bookType)}
                  {account.currency ? ` · ${account.currency}` : ""}
                </span>
                {reason !== null ? (
                  <span id={`${id}-why`} className="text-[11px] text-stone-dim">
                    — can&apos;t be ticked: {reason}
                  </span>
                ) : null}
                {note !== null ? (
                  // Amber like the screen's other notes, but not an alert: nothing went wrong.
                  <span id={`${id}-note`} className="basis-full pl-5 text-[11px] text-amber">
                    {note}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-3 border-t border-rule-soft pt-3">
        {ticked.size === 0 ? (
          <p className="text-[11px] text-stone-dim">
            Tick at least one account to see its monthly totals.
          </p>
        ) : !totals.ok ? (
          <p role="alert" className={ALERT}>
            {totals.error}
          </p>
        ) : (
          <>
            {splits
              .filter((s) => s.fresh.length > 0)
              .map((s) => (
                <table key={s.currency} className="mb-2 text-xs">
                  <caption className="mb-1 text-left font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
                    Monthly totals from {fileName} ({s.currency})
                  </caption>
                  <tbody>
                    {s.fresh.map((m) => (
                      <tr key={m.periodStart}>
                        <th scope="row" className="pr-4 text-left font-normal text-stone">
                          {describePeriod(m.periodStart, m.periodEnd)}
                        </th>
                        <td className="pr-4 text-right font-mono text-paper">
                          {formatAmount(m.amountCents, s.currency)}
                        </td>
                        <td className="text-stone-dim">
                          {m.rows} {lineWord(m.rows)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            {freshCount === 0 ? (
              <p className="text-xs text-paper-dim">Nothing new to propose from this book.</p>
            ) : null}

            {splits.some((s) => s.known.length > 0) ? (
              <ul className="mt-2 space-y-0.5 text-[11px] text-stone-dim">
                {splits.flatMap((s) =>
                  s.known.map((m) => (
                    <li key={`${s.currency}-${m.periodStart}`}>
                      {describePeriod(m.periodStart, m.periodEnd)} ({s.currency}) — already in
                      DotAmi with the same total, not proposed again
                    </li>
                  )),
                )}
              </ul>
            ) : null}

            {skipped.length > 0 ? (
              <div className="mt-2">
                <p className="font-mono text-[9px] uppercase tracking-wider text-stone-dim">
                  Left out
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-stone-dim">
                  {skipped.map((group) => (
                    <li key={group.reason}>{skipWords(group.reason, group.lines)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {totals.scheduledLines > 0 ? (
              <p className="mt-2 text-[11px] text-stone-dim">
                The book&apos;s scheduled transactions ({totals.scheduledLines}{" "}
                {lineWord(totals.scheduledLines)}) are plans GnuCash hasn&apos;t posted, so
                they are never counted.
              </p>
            ) : null}

            {freshCount > MAX_FIGURES_PER_FILE ? (
              <p className={ALERT}>
                This book has more than {MAX_FIGURES_PER_FILE} months of totals, more than DotAmi
                proposes at once. Untick some accounts to propose fewer at a time.
              </p>
            ) : null}
          </>
        )}
      </div>

      {freshCount > 0 && freshCount <= MAX_FIGURES_PER_FILE ? (
        <div className="mt-3">
          <Pill
            variant="maple"
            size="small"
            disabled={busy}
            onClick={() => onReview(bookProposal(ventureId, label, splits))}
          >
            {freshCount === 1 ? "Review this figure" : `Review these ${freshCount} figures`}
          </Pill>
        </div>
      ) : null}
    </div>
  );
}
