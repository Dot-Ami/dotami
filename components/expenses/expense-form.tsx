"use client";

import { useId, useState } from "react";

import { Pill } from "@/components/ui";
import { formToDraft, purchaseLabel, type ExpenseDraft, type ExpenseFormValues } from "@/lib/expenses/display";
import type { ExpenseView } from "@/lib/expenses/types";
import { expensesWords } from "@/lib/expenses/words";

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
  "rounded-sm border border-rule bg-ink px-2 py-1 text-lead text-paper outline-hidden placeholder:text-stone-dim focus:border-maple-soft aria-invalid:border-amber";
const FIELD_LABEL = "block font-mono text-label uppercase tracking-[0.14em] text-stone";
const HINT = "mt-0.5 text-small text-stone-dim";

const words = expensesWords.form;

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
      setProblem({ error: words.dayNotYet, field: "date" });
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
    <form onSubmit={submit} aria-label={words.name} className="rounded-sm border border-rule-soft bg-ink2 px-4 py-4" noValidate>
      <fieldset>
        <legend className={FIELD_LABEL}>{words.thisIs}</legend>
        <div className="mt-1.5 flex flex-wrap gap-4 text-lead text-paper">
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-is`} checked={!refund} onChange={() => set({ is: "purchase" })} className="accent-maple" />
            {words.purchase}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={`${uid}-is`} checked={refund} onChange={() => set({ is: "refund" })} className="accent-maple" />
            {words.refund}
          </label>
        </div>
      </fieldset>

      {refund ? (
        <div className="mt-3 rounded-sm border border-rule-soft bg-ink px-3 py-3">
          <fieldset>
            <legend className={FIELD_LABEL}>{words.keepItAs}</legend>
            <div className="mt-1.5 space-y-1.5 text-lead text-paper">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name={`${uid}-way`}
                  checked={values.refundWay === "negative"}
                  onChange={() => set({ refundWay: "negative" })}
                  className="mt-1 accent-maple"
                />
                <span>
                  {words.negative.label}
                  <span className="block text-body text-stone">{words.negative.help}</span>
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
                  {words.separate.label}
                  <span className="block text-body text-stone">{words.separate.help}</span>
                </span>
              </label>
            </div>
          </fieldset>
          <p className="mt-2 text-body text-stone-dim">{words.eitherWay}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="min-w-[16rem] flex-1">
              <label htmlFor={id("refundOfId")} className={FIELD_LABEL}>
                {words.cameFrom}
                {values.refundWay === "separate" ? "" : words.optional}
              </label>
              <select
                id={id("refundOfId")}
                value={values.refundOfId}
                onChange={(e) => set({ refundOfId: e.target.value })}
                aria-invalid={invalid("refundOfId")}
                className={`${FIELD} mt-1 w-full`}
              >
                <option value="">{values.refundWay === "separate" ? words.choosePurchase : words.noneInDotAmi}</option>
                {purchases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {purchaseLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label htmlFor={id("creditNote")} className={FIELD_LABEL}>
                {words.creditNote}
              </label>
              <input
                id={id("creditNote")}
                value={values.creditNote}
                onChange={(e) => set({ creditNote: e.target.value })}
                maxLength={200}
                placeholder={words.creditNoteHint}
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
            {refund ? words.dayCameBack : words.day}
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
            {refund ? words.amountCameBack : words.amount}
          </label>
          <input
            id={id("amount")}
            type="text"
            inputMode="decimal"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            placeholder={words.amountHint}
            aria-invalid={invalid("amount")}
            className={`${FIELD} mt-1 w-32 text-right font-mono`}
          />
        </div>
        <div>
          <label htmlFor={id("currency")} className={FIELD_LABEL}>
            {words.currency}
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
            {refund ? words.cameBackFrom : words.paidTo}
          </label>
          <input
            id={id("paidTo")}
            value={values.paidTo}
            onChange={(e) => set({ paidTo: e.target.value })}
            maxLength={120}
            placeholder={words.paidToHint}
            aria-invalid={invalid("paidTo")}
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div className="min-w-[14rem] flex-[2]">
          <label htmlFor={id("whatFor")} className={FIELD_LABEL}>
            {words.whatFor}
          </label>
          <input
            id={id("whatFor")}
            value={values.whatFor}
            onChange={(e) => set({ whatFor: e.target.value })}
            maxLength={200}
            placeholder={words.whatForHint}
            aria-invalid={invalid("whatFor")}
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
        <div className="min-w-[10rem] flex-1">
          <label htmlFor={id("category")} className={FIELD_LABEL}>
            {words.category}
          </label>
          <input
            id={id("category")}
            value={values.category}
            onChange={(e) => set({ category: e.target.value })}
            maxLength={80}
            placeholder={words.categoryHint}
            className={`${FIELD} mt-1 w-full`}
          />
        </div>
        <div>
          <label htmlFor={id("businessShare")} className={FIELD_LABEL}>
            {words.businessShare}
          </label>
          <input
            id={id("businessShare")}
            type="text"
            inputMode="numeric"
            value={values.businessShare}
            onChange={(e) => set({ businessShare: e.target.value })}
            placeholder={words.businessShareHint}
            aria-invalid={invalid("businessShare")}
            aria-describedby={`${id("businessShare")}-hint`}
            className={`${FIELD} mt-1 w-24 text-right font-mono`}
          />
          <p id={`${id("businessShare")}-hint`} className={HINT}>
            {words.businessShareHelp}
          </p>
        </div>
        <div>
          <label htmlFor={id("gstHst")} className={FIELD_LABEL}>
            {words.gstHst}
          </label>
          <input
            id={id("gstHst")}
            type="text"
            inputMode="decimal"
            value={values.gstHst}
            onChange={(e) => set({ gstHst: e.target.value })}
            placeholder={words.gstHstHint}
            aria-invalid={invalid("gstHst")}
            className={`${FIELD} mt-1 w-28 text-right font-mono`}
          />
        </div>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-body text-stone hover:text-paper">{words.seller}</summary>
        <div className="mt-2 flex flex-wrap gap-3">
          <div className="min-w-[16rem] flex-[2]">
            <label htmlFor={id("sellerAddress")} className={FIELD_LABEL}>
              {words.sellerAddress}
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
              {words.sellerGstNumber}
            </label>
            <input
              id={id("vendorGstNumber")}
              value={values.vendorGstNumber}
              onChange={(e) => set({ vendorGstNumber: e.target.value })}
              maxLength={40}
              placeholder={words.sellerGstNumberHint}
              className={`${FIELD} mt-1 w-full font-mono`}
            />
          </div>
        </div>
      </details>

      {problem ? (
        <p role="alert" className="mt-3 text-body text-amber">
          {problem.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pill type="submit" variant="maple" size="small">
          {words.add}
        </Pill>
        <p className="text-body text-stone-dim">{words.nothingKept}</p>
      </div>
    </form>
  );
}
