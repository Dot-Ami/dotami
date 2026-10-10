"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { FIGURE_KIND_LABELS, type FigureView } from "@/lib/figures/types";
import { taxLineWords } from "@/lib/figures/tax-line";
import { formatCents, parseMoneyToCents } from "@/lib/figures/money";
import { useLocalToday } from "@/lib/figures/use-local-today";

import { FigureDates, FutureDateNote } from "./figure-age";

/**
 * [8b] The agree prompt. This is the only place a proposed figure becomes a figure the person
 * has agreed to (privacy review, rule 3): the server refuses to confirm from anywhere else.
 * Close, Escape and a click outside confirm nothing — they just leave the proposals waiting.
 *
 * Privacy review, rules 1 and 2: amounts only ever travel in request bodies, and nothing in
 * this file logs them.
 */

export const AMOUNT_HELP = "Write it like 12,500 or 12500.50.";

/** The line above the buttons, every time the prompt opens. */
export const CHECK_FIRST_LINE = "Double-check what DotAmi did, and how, before you agree.";

/** More figures than this and "Agree" waits until the person has scrolled to the end of the list. */
const MUST_SCROLL_ABOVE = 20;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDay(day: string): { y: number; m: number; d: number } | null {
  const parts = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  return { y: Number(parts[1]), m: Number(parts[2]), d: Number(parts[3]) };
}

/** Last day of a month (m is 1-12), by calendar arithmetic only — no time zones involved. */
function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * "July 2026" for exactly one calendar month, "July to September 2026" for exactly one calendar
 * quarter, otherwise the two dates as given: "2026-07-03 to 2026-08-14".
 */
export function describePeriod(periodStart: string, periodEnd: string): string {
  const start = parseDay(periodStart);
  const end = parseDay(periodEnd);
  if (start && end && start.y === end.y && start.d === 1) {
    if (start.m === end.m && end.d === lastDayOfMonth(end.y, end.m)) {
      return `${MONTHS[start.m - 1]} ${start.y}`;
    }
    if ((start.m - 1) % 3 === 0 && end.m === start.m + 2 && end.d === lastDayOfMonth(end.y, end.m)) {
      return `${MONTHS[start.m - 1]} to ${MONTHS[end.m - 1]} ${start.y}`;
    }
  }
  return `${periodStart} to ${periodEnd}`;
}

/** "$12,500.00", falling back to a plain reading if the browser doesn't know the currency code. */
export function formatAmount(cents: number, currency: string): string {
  try {
    return formatCents(cents, currency);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

/**
 * The number alone ("12,500.00"), for the editable box. The currency sits beside the box, and a
 * symbol like "US$" in front would not read back through parseMoneyToCents.
 */
function plainAmount(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${whole}.${String(abs % 100).padStart(2, "0")}`;
}

/** POSTs JSON and returns the parsed body, or an error with the API's own plain message. */
export async function postJson(
  url: string,
  payload: unknown,
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const message = (body as { error?: unknown } | null)?.error;
      return {
        ok: false,
        error: typeof message === "string" && message ? message : "That didn't go through. Nothing was changed.",
      };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, error: "Could not reach the app. Nothing was changed." };
  }
}

interface AgreePromptProps {
  ventureId: string;
  /** The proposed figures to show. The list is copied on open; later changes to it are ignored. */
  figures: FigureView[];
  /** Called after the person agreed to, or turned down, everything that was shown. */
  onDone: () => void | Promise<void>;
  /** Called when the prompt closes, whether or not anything was decided. */
  onClose: () => void;
}

export function AgreePrompt({ ventureId, figures, onDone, onClose }: AgreePromptProps) {
  const titleId = useId();
  const introId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // [8e] Each row says how long ago its period ended, so a mistyped year stands out before the
  // person agrees to it.
  const today = useLocalToday();
  const [rows, setRows] = useState<FigureView[]>(figures);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(figures.map((f) => [f.id, plainAmount(f.amountCents)])),
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [seenEnd, setSeenEnd] = useState(false);

  const mustScroll = rows.length > MUST_SCROLL_ABOVE;

  // Focus the first amount box on open, and give focus back to whatever opened the prompt on close.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (firstFieldRef.current ?? dialogRef.current)?.focus();
    return () => opener?.focus();
  }, []);

  const checkScrolled = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // A few pixels of slack: browsers round scroll positions on zoomed screens.
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) setSeenEnd(true);
  }, []);

  // A long list starts unseen; a short or already-fully-visible one needs no scrolling.
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

  async function discardOne(id: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await postJson("/api/figures/discard", { ventureId, figureIds: [id] });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const left = rows.filter((r) => r.id !== id);
    setRows(left);
    if (left.length === 0) {
      await onDone();
      onClose();
    }
  }

  async function discardAll() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await postJson("/api/figures/discard", { ventureId, figureIds: rows.map((r) => r.id) });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    await onDone();
    onClose();
  }

  async function agree() {
    if (busy || rows.length === 0) return;
    setError(null);

    // Read every amount first; one that can't be read blocks the whole thing, nothing is sent.
    const edits: Record<string, { amountCents: number }> = {};
    const problems: Record<string, string> = {};
    for (const row of rows) {
      const cents = parseMoneyToCents(amounts[row.id] ?? "");
      if (cents === null) problems[row.id] = AMOUNT_HELP;
      else if (cents !== row.amountCents) edits[row.id] = { amountCents: cents };
    }
    setRowErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setBusy(true);
    const payload: { ventureId: string; figureIds: string[]; edits?: Record<string, { amountCents: number }> } = {
      ventureId,
      figureIds: rows.map((r) => r.id),
    };
    if (Object.keys(edits).length > 0) payload.edits = edits;
    const result = await postJson("/api/figures/agree", payload);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    await onDone();
    onClose();
  }

  // Group by where the figures came from, keeping the order they arrived in.
  const groups: { label: string; rows: FigureView[] }[] = [];
  for (const row of rows) {
    let group = groups.find((g) => g.label === row.sourceLabel);
    if (!group) {
      group = { label: row.sourceLabel, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }

  const waitingToScroll = mustScroll && !seenEnd;
  let firstFieldAssigned = false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        // Only a click on the dim backdrop itself closes it — not a drag that ends there.
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
              Agree to these figures?
            </h2>
            <p id={introId} className="mt-1 text-sm text-paper-dim">
              Nothing counts until you agree. Check each one against where it came from.
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

        <div ref={listRef} onScroll={checkScrolled} className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {rows.length === 0 ? <p className="text-sm text-stone">Nothing left to review.</p> : null}
          {groups.map((group) => {
            // Rows are summed only when every figure in the group says how many it covered.
            const allKnown = group.rows.every((r) => r.sourceRows !== null);
            const totalRows = allKnown ? group.rows.reduce((sum, r) => sum + (r.sourceRows ?? 0), 0) : null;
            return (
              <section key={group.label} aria-label={`From ${group.label}`}>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">
                  From {group.label}
                  {totalRows !== null ? ` · ${totalRows} rows` : ""}
                </p>
                <ul className="mt-1.5 space-y-2">
                  {group.rows.map((row) => {
                    const period = describePeriod(row.periodStart, row.periodEnd);
                    const inputId = `${titleId}-amount-${row.id}`;
                    const problem = rowErrors[row.id];
                    const isFirst = !firstFieldAssigned;
                    firstFieldAssigned = true;
                    return (
                      <li key={row.id} className="rounded-sm border border-rule-soft bg-ink px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                          <span className="min-w-0 flex-1 text-paper">
                            {FIGURE_KIND_LABELS[row.kind]} <span className="text-stone">· {period}</span>
                            {/* [8f] A T2125 total says which tax year and line it is, before the person agrees. */}
                            {taxLineWords(row) ? <span className="text-stone"> · {taxLineWords(row)}</span> : null}
                          </span>
                          <label htmlFor={inputId} className="sr-only">
                            Amount for {period}
                          </label>
                          <input
                            id={inputId}
                            ref={isFirst ? firstFieldRef : undefined}
                            type="text"
                            inputMode="decimal"
                            value={amounts[row.id] ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setAmounts((a) => ({ ...a, [row.id]: value }));
                              setRowErrors((errs) => {
                                if (!errs[row.id]) return errs;
                                const rest = { ...errs };
                                delete rest[row.id];
                                return rest;
                              });
                            }}
                            aria-invalid={problem ? true : undefined}
                            aria-describedby={problem ? `${inputId}-problem` : undefined}
                            className="w-32 rounded-sm border border-rule bg-ink2 px-2 py-1 text-right font-mono text-sm text-paper outline-hidden focus:border-maple-soft"
                          />
                          <span className="font-mono text-[11px] text-stone">{row.currency}</span>
                          <button
                            type="button"
                            onClick={() => void discardOne(row.id)}
                            disabled={busy}
                            className="text-[11px] text-stone-dim hover:text-maple disabled:opacity-50"
                          >
                            Discard
                          </button>
                        </div>
                        <FigureDates figure={row} today={today} />
                        <FutureDateNote periodEnd={row.periodEnd} today={today} />
                        {problem ? (
                          <p id={`${inputId}-problem`} className="mt-1 text-[11px] text-amber">
                            {problem}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-rule-soft pt-3">
          {/* Always shown, so the person is asked to check the work before the button that confirms. */}
          <p className="basis-full text-sm text-paper-dim">{CHECK_FIRST_LINE}</p>
          {waitingToScroll ? (
            <p className="mr-auto text-[11px] text-stone" role="status">
              Scroll through all {rows.length} to agree
            </p>
          ) : null}
          <Pill variant="ghost" onClick={() => void discardAll()} disabled={busy || rows.length === 0}>
            No, I&apos;ll do it myself
          </Pill>
          <Pill variant="maple" onClick={() => void agree()} disabled={busy || rows.length === 0 || waitingToScroll}>
            Agree
          </Pill>
        </div>
      </div>
    </div>
  );
}
