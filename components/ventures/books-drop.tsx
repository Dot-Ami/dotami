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
import { venturesWords } from "@/lib/ventures/words";

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

const ALERT = "mt-2 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-body text-amber";
const FIELD_LABEL = "block font-mono text-label uppercase tracking-[0.14em] text-stone";

/** Same cap as the figures route: how many figures one review may hold. */
const MAX_FIGURES_PER_FILE = 500;
const MAX_LABEL_CHARS = 120;

const words = venturesWords.books;
const common = venturesWords.common;
const lineWord = words.lineWord;

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
  const label = fileName.trim().slice(0, MAX_LABEL_CHARS) || words.aGnuCashBook;

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
      <p data-autofocus tabIndex={-1} className="text-body text-paper-dim outline-hidden">
        {common.file} <span className="text-paper">{fileName}</span>
      </p>
      <p className="mt-1 text-body text-paper-dim">{words.lastSave}</p>
      <p className="mt-1 text-body text-stone-dim">{words.testedOn}</p>

      <fieldset className="mt-3" aria-describedby={`${uid}-accounts-hint`}>
        <legend className={FIELD_LABEL}>{words.accounts}</legend>
        <p id={`${uid}-accounts-hint`} className="mt-1 max-w-prose text-body text-stone-dim">
          {words.accountsHint}
        </p>
        <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-2 text-body">
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
                <span className="text-body text-stone-dim">
                  {accountTypeWords(account.bookType)}
                  {account.currency ? ` · ${account.currency}` : ""}
                </span>
                {reason !== null ? (
                  <span id={`${id}-why`} className="text-body text-stone-dim">
                    {words.cantBeTicked} {reason}
                  </span>
                ) : null}
                {note !== null ? (
                  // Amber like the screen's other notes, but not an alert: nothing went wrong.
                  <span id={`${id}-note`} className="basis-full pl-5 text-body text-amber">
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
          <p className="text-body text-stone-dim">{words.tickOne}</p>
        ) : !totals.ok ? (
          <p role="alert" className={ALERT}>
            {totals.error}
          </p>
        ) : (
          <>
            {splits
              .filter((s) => s.fresh.length > 0)
              .map((s) => (
                <table key={s.currency} className="mb-2 text-body">
                  <caption className="mb-1 text-left font-mono text-label uppercase tracking-[0.14em] text-stone">
                    {common.monthlyTotalsFrom} {fileName} ({s.currency})
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
              <p className="text-body text-paper-dim">{words.nothingNew}</p>
            ) : null}

            {splits.some((s) => s.known.length > 0) ? (
              <ul className="mt-2 space-y-0.5 text-body text-stone-dim">
                {splits.flatMap((s) =>
                  s.known.map((m) => (
                    <li key={`${s.currency}-${m.periodStart}`}>
                      {describePeriod(m.periodStart, m.periodEnd)} ({s.currency}) {common.alreadyInDotAmi}
                    </li>
                  )),
                )}
              </ul>
            ) : null}

            {skipped.length > 0 ? (
              <div className="mt-2">
                <p className="font-mono text-label uppercase tracking-wider text-stone-dim">
                  {common.leftOut}
                </p>
                <ul className="mt-1 space-y-0.5 text-body text-stone-dim">
                  {skipped.map((group) => (
                    <li key={group.reason}>{skipWords(group.reason, group.lines)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {totals.scheduledLines > 0 ? (
              <p className="mt-2 text-body text-stone-dim">
                {words.scheduled.before}
                {totals.scheduledLines} {lineWord(totals.scheduledLines)}
                {words.scheduled.after}
              </p>
            ) : null}

            {freshCount > MAX_FIGURES_PER_FILE ? (
              <p className={ALERT}>
                {words.tooMany.before} {MAX_FIGURES_PER_FILE} {words.tooMany.after}
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
            {freshCount === 1 ? common.reviewOne : common.reviewMany(freshCount)}
          </Pill>
        </div>
      ) : null}
    </div>
  );
}
