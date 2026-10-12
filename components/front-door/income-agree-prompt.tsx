"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { Pill } from "@/components/ui";
import { AMOUNT_HELP, postJson } from "@/components/ventures/agree-prompt";
import { parseMoneyToCents } from "@/lib/figures/money";
import { formatAmountForBox } from "@/lib/format/money-and-months";
import { incomePromptWords as words } from "@/lib/front-door/words";

/**
 * The agree prompt for the yearly income the person wants (docs/ui-spec/start/02-income-agree-prompt.md).
 * The number is only proposed until the person clicks Agree here; the agree route answers only DotAmi's
 * own window. Close, Escape or a click on the backdrop decide nothing: the number waits, proposed.
 *
 * Its own small prompt rather than the figures' one, which is built for totals over a period on one idea;
 * this number belongs to the person. The amount travels only in request bodies and is never logged.
 */
export function IncomeAgreePrompt({
  proposal,
  today,
  returnFocusTo,
  onAgreed,
  onTurnedDown,
  onClose,
}: {
  /** The proposed number, as the propose route gave it back. */
  proposal: { id: string; amountCents: number };
  /** The person's own day, for the row. */
  today: string;
  /**
   * Where focus goes when the prompt closes. The button that opened it is disabled while the number is
   * proposed, so focus can't simply go back to it: the caller names a control that stays usable.
   */
  returnFocusTo?: RefObject<HTMLElement | null>;
  onAgreed: (amountCents: number) => void;
  onTurnedDown: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const introId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(() => formatAmountForBox(proposal.amountCents));
  const [problem, setProblem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Focus the amount on open, and give it back on close: to the control the caller named, else to whatever
  // had it. After Agree or turning it down the caller's control is gone with its question, focusing it does
  // nothing, and the page moves focus to what comes next.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = returnFocusTo;
    inputRef.current?.focus();
    return () => (target?.current ?? opener)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab inside the dialog while it is open.
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "button:not([disabled]), input:not([disabled])",
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

  async function agree() {
    if (busy) return;
    const cents = parseMoneyToCents(amount);
    // A negative income target isn't a number anyone means; the storage refuses it too.
    if (cents === null || cents < 0) {
      setProblem(AMOUNT_HELP);
      return;
    }
    setBusy(true);
    setError(null);
    const edits =
      cents !== proposal.amountCents ? { [proposal.id]: { amountCents: cents } } : undefined;
    const result = await postJson("/api/person-figures/agree", {
      ids: [proposal.id],
      ...(edits ? { edits } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onAgreed(cents);
  }

  async function turnDown() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await postJson("/api/person-figures/discard", { ids: [proposal.id] });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onTurnedDown();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        // Only a click on the dim backdrop itself closes it, not a drag that ends there.
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
        className="w-full max-w-lg rounded-lg border border-rule bg-ink2 p-5 outline-hidden"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-serif text-xl font-bold tracking-tight text-paper">
              {words.title}
            </h2>
            <p id={introId} className="mt-1 text-sm text-paper-dim">
              {words.intro}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[11px] text-stone hover:text-paper"
          >
            {words.close}
          </button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-sm border border-amber/40 bg-amber/5 px-3 py-2 text-sm text-amber"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 rounded-sm border border-rule-soft bg-ink px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="min-w-0 flex-1 text-paper">{words.row(today)}</span>
            <label htmlFor={inputId} className="sr-only">
              {words.amountLabel}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setProblem(null);
              }}
              aria-invalid={problem ? true : undefined}
              aria-describedby={problem ? `${inputId}-problem` : undefined}
              className="w-32 rounded-sm border border-rule bg-ink2 px-2 py-1 text-right font-mono text-sm text-paper outline-hidden focus:border-maple-soft"
            />
            <span className="font-mono text-[11px] text-stone">CAD</span>
          </div>
          {problem ? (
            <p id={`${inputId}-problem`} className="mt-1 text-[11px] text-amber">
              {problem}
            </p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-stone">{words.changes}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-rule-soft pt-3">
          {/* Always shown, as in every agree prompt, worded for a number the person typed themselves. */}
          <p className="basis-full text-sm text-paper-dim">{words.checkFirst}</p>
          <Pill variant="ghost" onClick={() => void turnDown()} disabled={busy}>
            {words.turnDown}
          </Pill>
          <Pill variant="maple" onClick={() => void agree()} disabled={busy}>
            {words.agree}
          </Pill>
        </div>
      </div>
    </div>
  );
}
