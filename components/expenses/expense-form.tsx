"use client";

import { useId, useState } from "react";

import { Pill } from "@/components/ui";
import { formToDraft, purchaseLabel, type ExpenseDraft, type ExpenseFormValues } from "@/lib/expenses/display";
import type { ExpenseView } from "@/lib/expenses/types";

/**
 * [8i] The form for typing one expense record. "Add to the list" puts it on this window's typed list
 * (nothing is sent or kept); the person can type as many as they like and agree to them all at once
 * from the review list (the maintainer's decision, 2026-10-08: type many, agree once).
 *
 * There is no box for a bank or card number, DotAmi never fills in a category or a business share,
 * and a refund or credit is kept the way the person picks: a negative amount on a record, or a
 * separate refund record linked to the purchase it came from.
 */

const FIELD =
  "rounded-sm border border-rule bg-ink px-2 py-1 text-sm text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft aria-invalid:border-amber";
const FIELD_LABEL = "block font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone";
const HINT = "mt-0.5 text-[10.5px] text-stone-dim";

export function ExpenseForm({
  values,
  onChange,
  onAdd,
  today,
  purchases,
  newKey,
}: {
  values: ExpenseFormValues;
  onChange: (values: ExpenseFormValues) => void;
  onAdd: (draft: ExpenseDraft) => void;
  /** The person's own day: a purchase can't be dated after it. */
  today: string;
  /** Agreed or waiting purchases a refund may point to. */
  purchases: ExpenseView[];
  /** A fresh key for the next draft. */
  newKey: () => string;
}) {
  const uid = useId();
  const [problem, setProblem] = useState<{ error: string; field: keyof ExpenseFormValues } | null>(null);
  const set = (patch: Partial<ExpenseFormValues>) => {
    onChange({ ...values, ...patch });
    setProblem(null);
  };
  const id = (field: keyof ExpenseFormValues) => `${uid}-${field}`;
  const invalid = (field: keyof ExpenseFormValues) => (problem?.field === field ? true : undefined);
  const refund = values.is === "refund";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (values.date > today) {
      setProblem({ error: "That day hasn't happened yet.", field: "date" });
      return;
    }
    const result = formToDraft(values, newKey());
    if (!result.ok) {
      setProblem({ error: result.error, field: result.field });
      document.getElementById(id(result.field))?.focus();
      return;
    }
    onAdd(result.draft);
  }

  return (
    <form onSubmit={submit} aria-label="Type an expense" className="rounded-sm border border-rule-soft bg-ink2 px-4 py-4" noValidate>
      <fieldset>
        <legend className={FIELD_LABEL}>This is</legend>
        <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-paper">
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-is`} checked={!refund} onChange={() => set({ is: "purchase" })} className="accent-maple" />
            A purchase
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-is`} checked={refund} onChange={() => set({ is: "refund" })} className="accent-maple" />
            A refund or credit
          </label>
        </div>
      </fieldset>

      {refund ? (
        <div className="mt-3 rounded-sm border border-rule-soft bg-ink px-3 py-3">
          <fieldset>
            <legend className={FIELD_LABEL}>Keep it as</legend>
            <div className="mt-1.5 space-y-1.5 text-sm text-paper">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name={`${uid}-way`}
                  checked={values.refundWay === "negative"}
                  onChange={() => set({ refundWay: "negative" })}
                  className="mt-1 accent-maple"
                />
                <span>
                  A negative amount on a record
                  <span className="block text-[11px] text-stone">The record holds minus the amount that came back.</span>
                </span>
              </label>
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name={`${uid}-way`}
                  checked={values.refundWay === "separate"}
                  onChange={() => set({ refundWay: "separate" })}
                  className="mt-1 accent-maple"
                />
                <span>
                  A separate refund record, linked to the purchase
                  <span className="block text-[11px] text-stone">The purchase keeps its own amount; the refund sits beside it.</span>
                </span>
              </label>
            </div>
          </fieldset>
          <p className="mt-2 text-[11px] text-stone-dim">
            Either way it keeps the refund&apos;s date, the purchase it came from, the GST/HST part and the credit note when you give them. Which way is yours to choose; DotAmi doesn&apos;t say how a refund is taxed.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor={id("refundOfId")} className={FIELD_LABEL}>
                The purchase it came from{values.refundWay === "separate" ? "" : " (optional)"}
              </label>
              <select
                id={id("refundOfId")}
                value={values.refundOfId}
                onChange={(e) => set({ refundOfId: e.target.value })}
                aria-invalid={invalid("refundOfId")}
                className={`${FIELD} mt-1 w-full`}
              >
                <option value="">{values.refundWay === "separate" ? "Choose a purchase…" : "None in DotAmi"}</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {purchaseLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label htmlFor={id("creditNote")} className={FIELD_LABEL}>
                Credit note (optional)
              </label>
              <input
                id={id("creditNote")}
                value={values.creditNote}
                onChange={(e) => set({ creditNote: e.target.value })}
                maxLength={200}
                placeholder="its number and date"
                aria-invalid={invalid("creditNote")}
                className={`${FIELD} mt-1 w-full`}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div>
          <label htmlFor={id("date")} className={FIELD_LABEL}>
            {refund ? "Day it came back" : "Day"}
          </label>
          <input
            id={id("date")}
            type="date"
            max={today}
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
            aria-invalid={invalid("date")}
            className={`${FIELD} mt-1`}
          />
        </div>
        <div>
          <label htmlFor={id("amount")} className={FIELD_LABEL}>
            {refund ? "Amount that came back" : "Amount"}
          </label>
          <input
            id={id("amount")}
            type="text"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            placeholder="45.99"
            aria-invalid={invalid("amount")}
            className={`${FIELD} mt-1 w-32 text-right font-mono`}
          />
        </div>
        <div>
          <label htmlFor={id("currency")} className={FIELD_LABEL}>
            Currency
          </label>
          <input
            id={id("currency")}
            type="text"
            maxLength={3}
            value={values.currency}
            onChange={(e) => set({ currency: e.target.value })}
            aria-invalid={invalid("currency")}
            className={`${FIELD} mt-1 w-16 font-mono uppercase`}
          />
        </div>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={id("paidTo")} className={FIELD_LABEL}>
            {refund ? "Who it came back from" : "Paid to"}
          </label>
          <input
            id={id("paidTo")}
            value={values.paidTo}
            onChange={(e) => set({ paidTo: e.target.value })}
            maxLength={120}
            placeholder="Staples"
            aria-invalid={invalid("paidTo")}
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div className="min-w-[14rem] flex-[2]">
          <label htmlFor={id("whatFor")} className={FIELD_LABEL}>
            What for
          </label>
          <input
            id={id("whatFor")}
            value={values.whatFor}
            onChange={(e) => set({ whatFor: e.target.value })}
            maxLength={200}
            placeholder="printer paper"
            aria-invalid={invalid("whatFor")}
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label htmlFor={id("category")} className={FIELD_LABEL}>
            Category (optional)
          </label>
          <input
            id={id("category")}
            value={values.category}
            onChange={(e) => set({ category: e.target.value })}
            maxLength={80}
            placeholder="your own word"
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
        <div>
          <label htmlFor={id("businessShare")} className={FIELD_LABEL}>
            Business share % (optional)
          </label>
          <input
            id={id("businessShare")}
            type="text"
            inputMode="numeric"
            value={values.businessShare}
            onChange={(e) => set({ businessShare: e.target.value })}
            placeholder="100"
            aria-invalid={invalid("businessShare")}
            aria-describedby={`${id("businessShare")}-hint`}
            className={`${FIELD} mt-1 w-24 text-right font-mono`}
          />
          <p id={`${id("businessShare")}-hint`} className={HINT}>
            Yours to set: a whole number, 1 to 100. Kept beside the full amount.
          </p>
        </div>
        <div>
          <label htmlFor={id("gstHst")} className={FIELD_LABEL}>
            GST/HST part (optional)
          </label>
          <input
            id={id("gstHst")}
            type="text"
            inputMode="decimal"
            value={values.gstHst}
            onChange={(e) => set({ gstHst: e.target.value })}
            placeholder="5.98"
            aria-invalid={invalid("gstHst")}
            className={`${FIELD} mt-1 w-28 text-right font-mono`}
          />
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-[11px] text-stone hover:text-paper">The seller&apos;s address and GST/HST number (optional)</summary>
        <div className="mt-2 flex flex-wrap gap-3">
          <div className="min-w-[16rem] flex-[2]">
            <label htmlFor={id("sellerAddress")} className={FIELD_LABEL}>
              Seller&apos;s address
            </label>
            <textarea
              id={id("sellerAddress")}
              value={values.sellerAddress}
              onChange={(e) => set({ sellerAddress: e.target.value })}
              maxLength={300}
              rows={2}
              className={`${FIELD} mt-1 w-full resize-y`}
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label htmlFor={id("vendorGstNumber")} className={FIELD_LABEL}>
              Seller&apos;s GST/HST number
            </label>
            <input
              id={id("vendorGstNumber")}
              value={values.vendorGstNumber}
              onChange={(e) => set({ vendorGstNumber: e.target.value })}
              maxLength={40}
              placeholder="123456789 RT 0001"
              className={`${FIELD} mt-1 w-full font-mono`}
            />
          </div>
        </div>
      </details>

      {problem ? (
        <p role="alert" className="mt-3 text-[11px] text-amber">
          {problem.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pill type="submit" variant="maple" size="small">
          Add to the list
        </Pill>
        <p className="text-[11px] text-stone-dim">Nothing is kept until you agree. No bank or card numbers here.</p>
      </div>
    </form>
  );
}
