"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { CHECK_FIRST_LINE } from "@/components/ventures/agree-prompt";

/**
 * [8i] The review list: "type many, agree once" (the maintainer's decision, 2026-10-08). Every record
 * is listed with a tick, all ticked to start; the person unticks any to leave out and agrees to the
 * rest with one click, "Agree to all N". It serves both doors in:
 *   - records the person typed on this screen, which are not kept anywhere until that click;
 *   - records an agent or a file proposed, which wait in the data file until the person agrees
 *     (each can also be turned down here).
 * Close, Escape and a click outside agree to nothing. Like the figures' agree prompt, a long list
 * must be scrolled to its end before the button works, and the "double-check" line is always shown.
 */

export interface ReviewRow {
  key: string;
  /** The first line: day, who, what for. */
  title: string;
  /** The amount as shown, sign included. */
  amount: string;
  /** Smaller lines under it: the share, the GST/HST part, how a refund is kept, where it came from. */
  facts: string[];
}

/** More records than this and "Agree" waits until the list has been scrolled to the end (the same as figures). */
const MUST_SCROLL_ABOVE = 20;

export function ExpenseReview({
  title,
  intro,
  rows,
  busy,
  error,
  onAgree,
  onTurnDown,
  onClose,
}: {
  title: string;
  intro: string;
  rows: ReviewRow[];
  busy: boolean;
  error: string | null;
  /** Called with the ticked keys, in the order shown. */
  onAgree: (keys: string[]) => void;
  /** Only for waiting proposals: turn one down. */
  onTurnDown?: (key: string) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const introId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  // Ticked by key. A row that arrives later (the list shrinks after a turn-down) keeps its tick.
  const [unticked, setUnticked] = useState<Set<string>>(() => new Set());
  const [seenEnd, setSeenEnd] = useState(false);

  const ticked = rows.filter((r) => !unticked.has(r.key));
  const mustScroll = rows.length > MUST_SCROLL_ABOVE;
  const waitingToScroll = mustScroll && !seenEnd;

  // Focus the dialog on open, and give focus back to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => opener?.focus();
  }, []);

  const checkScrolled = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setSeenEnd(true);
  }, []);
  useEffect(() => {
    checkScrolled();
  }, [rows.length, checkScrolled]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab inside the dialog while it is open.
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function toggle(key: string, on: boolean) {
    setUnticked((current) => {
      const next = new Set(current);
      if (on) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-rule bg-ink2 p-5 outline-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-bold tracking-tight text-paper">
              {title}
            </h2>
            <p id={introId} className="mt-1 text-sm text-paper-dim">
              {intro}
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-[11px] text-stone hover:text-paper">
            Close
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber">
            {error}
          </p>
        ) : null}

        <ol ref={listRef} onScroll={checkScrolled} className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {rows.length === 0 ? <li className="text-sm text-stone">Nothing left to review.</li> : null}
          {rows.map((row, i) => {
            const boxId = `${titleId}-tick-${i}`;
            return (
              <li key={row.key} className="rounded-sm border border-rule-soft bg-ink px-3 py-2">
                <div className="flex items-start gap-3 text-sm">
                  <input
                    id={boxId}
                    type="checkbox"
                    checked={!unticked.has(row.key)}
                    onChange={(e) => toggle(row.key, e.target.checked)}
                    disabled={busy}
                    className="mt-1 size-4 shrink-0 accent-maple"
                  />
                  <label htmlFor={boxId} className="min-w-0 flex-1 cursor-pointer text-paper">
                    {row.title}
                  </label>
                  <span className="shrink-0 font-mono text-paper">{row.amount}</span>
                  {onTurnDown ? (
                    <button
                      type="button"
                      onClick={() => onTurnDown(row.key)}
                      disabled={busy}
                      className="shrink-0 text-[11px] text-stone-dim hover:text-maple disabled:opacity-50"
                    >
                      Turn down
                    </button>
                  ) : null}
                </div>
                {row.facts.length > 0 ? (
                  <ul className="ml-7 mt-1 space-y-0.5 text-[11px] text-stone">
                    {row.facts.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-rule-soft pt-3">
          <p className="basis-full text-sm text-paper-dim">{CHECK_FIRST_LINE}</p>
          {waitingToScroll ? (
            <p className="mr-auto text-[11px] text-stone" role="status">
              Scroll through all {rows.length} to agree
            </p>
          ) : ticked.length < rows.length ? (
            <p className="mr-auto text-[11px] text-stone" role="status">
              {rows.length - ticked.length} left out: {rows.length - ticked.length === 1 ? "it stays" : "they stay"} where {rows.length - ticked.length === 1 ? "it is" : "they are"}
            </p>
          ) : null}
          <Pill variant="ghost" onClick={onClose} disabled={busy}>
            Not now
          </Pill>
          <Pill
            variant="maple"
            onClick={() => onAgree(ticked.map((r) => r.key))}
            disabled={busy || ticked.length === 0 || waitingToScroll}
          >
            Agree to all {ticked.length}
          </Pill>
        </div>
      </div>
    </div>
  );
}
