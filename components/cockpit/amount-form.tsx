"use client";

import { useId, useState } from "react";

import { Pill } from "@/components/ui";
import { cockpitWords as words } from "@/lib/cockpit/words";
import { parseMoneyToCents } from "@/lib/figures/money";
import { COST_LINE_AMOUNT_FROM, COST_LINE_AMOUNT_FROM_LABELS, type CostLineAmountFrom } from "@/lib/figures/types";

/**
 * The small box the cockpit uses to take one of the person's own numbers: a quote for a named cost line,
 * or their savings for starting. It only proposes: the parent sends the number to /api/figures/propose and
 * opens the agree prompt, and nothing counts until the person clicks Agree there
 * (docs/architecture/figures-privacy-review.md, rule 3). The amount never goes in an address or a log.
 */
export function AmountForm({
  askFrom,
  disabled,
  onSubmit,
  onCancel,
}: {
  /** True for a cost line: the person says where the amount came from (a quote, a link, a receipt, a guess). */
  askFrom: boolean;
  disabled: boolean;
  /** Proposes the number; resolves to an error to show, or null once the agree prompt has opened. */
  onSubmit: (amountCents: number, from: CostLineAmountFrom) => Promise<string | null>;
  onCancel: () => void;
}) {
  const id = useId();
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<CostLineAmountFrom>("quote");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseMoneyToCents(amount);
    if (cents === null) return setError(words.amounts.unreadable);
    // Savings and a cost are never below zero; the server refuses one too.
    if (cents < 0) return setError(words.amounts.negative);
    setBusy(true);
    setError(null);
    const problem = await onSubmit(cents, from);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-2 flex flex-col gap-2 rounded-sm border border-rule-soft bg-ink p-2.5">
      <label htmlFor={`${id}-amount`} className="font-mono text-label uppercase tracking-wider text-stone">
        {words.amounts.amount}
      </label>
      <input
        id={`${id}-amount`}
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-36 rounded-sm border border-rule bg-ink2 px-2 py-1 text-right font-mono text-lead text-paper outline-hidden focus:border-maple-soft"
      />
      {askFrom ? (
        <>
          <label htmlFor={`${id}-from`} className="font-mono text-label uppercase tracking-wider text-stone">
            {words.amounts.from}
          </label>
          <select
            id={`${id}-from`}
            value={from}
            onChange={(e) => setFrom(e.target.value as CostLineAmountFrom)}
            className="w-40 rounded-sm border border-rule bg-ink2 px-1.5 py-1 text-body text-paper"
          >
            {COST_LINE_AMOUNT_FROM.map((value) => (
              <option key={value} value={value}>
                {COST_LINE_AMOUNT_FROM_LABELS[value]}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-body text-amber">
          {error}
        </p>
      ) : null}
      <p className="text-body text-stone">{words.amounts.agreeFirst}</p>
      <div className="flex gap-2">
        <Pill type="submit" variant="maple" size="small" disabled={disabled || busy}>
          {words.amounts.next}
        </Pill>
        <Pill variant="ghost" size="small" onClick={onCancel}>
          {words.amounts.cancel}
        </Pill>
      </div>
    </form>
  );
}
