import { formatCents, parseMoneyToCents } from "@/lib/figures/money";

import type { ExpenseRecordKind, ExpenseView } from "./types";
import { BUSINESS_SHARE_MAX, BUSINESS_SHARE_MIN } from "./validate";

/**
 * [8i] The typing screen's own logic, kept out of the components so it can be tested on its own:
 * turning what the person typed into a record to propose, and the words a record is shown with.
 * Nothing here decides anything about the person's money: it copies what they typed, and the plain
 * lines it builds only ever repeat their own numbers (never a "deductible" amount, never a share
 * multiplied out).
 */

/** How the person chose to keep a refund or credit (the maintainer's decision, 2026-10-08). */
export type RefundWay = "negative" | "separate";

/** What the typing form holds: every box as typed, text until it is read. */
export interface ExpenseFormValues {
  /** "purchase" or "refund": what the person says this is. */
  is: "purchase" | "refund";
  /** Only read when `is` is "refund". */
  refundWay: RefundWay;
  /** The purchase a refund came from: a record id, or "" for none in DotAmi. */
  refundOfId: string;
  date: string;
  amount: string;
  currency: string;
  paidTo: string;
  whatFor: string;
  category: string;
  businessShare: string;
  gstHst: string;
  creditNote: string;
  sellerAddress: string;
  vendorGstNumber: string;
}

/** A record typed on the screen and not yet kept: what would be proposed, plus a key for the list. */
export interface ExpenseDraft {
  key: string;
  date: string;
  amountCents: number;
  currency: string;
  paidTo: string;
  whatFor: string;
  category: string | null;
  sellerAddress: string | null;
  vendorGstNumber: string | null;
  recordKind: ExpenseRecordKind;
  refundOfId: string | null;
  gstHstCents: number | null;
  creditNote: string | null;
  businessSharePercent: number | null;
}

export const EMPTY_FORM: ExpenseFormValues = {
  is: "purchase",
  refundWay: "negative",
  refundOfId: "",
  date: "",
  amount: "",
  currency: "CAD",
  paidTo: "",
  whatFor: "",
  category: "",
  businessShare: "",
  gstHst: "",
  creditNote: "",
  sellerAddress: "",
  vendorGstNumber: "",
};

const blankToNull = (text: string) => (text.trim() === "" ? null : text.trim());

/**
 * Reads the business share box: blank is "none given"; otherwise a whole percent 1-100, with or
 * without a % sign. Anything else is null plus a reason, so the form can say what to type.
 */
export function readBusinessShare(text: string): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = text.trim().replace(/\s*%$/, "");
  if (t === "") return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(t) || Number(t) < BUSINESS_SHARE_MIN || Number(t) > BUSINESS_SHARE_MAX) {
    return { ok: false, error: `Write the business share as a whole percent from ${BUSINESS_SHARE_MIN} to ${BUSINESS_SHARE_MAX}, or leave it blank.` };
  }
  return { ok: true, value: Number(t) };
}

/**
 * Turns the form into a record to propose, or the first thing the person needs to fix. The server
 * checks everything again when the record is proposed; this is only so a typo is caught before the
 * record joins the list. The amount is always typed without a sign: for a refund kept "as a negative
 * amount" the record's amount becomes negative here, by the person's choice of way, never by a guess.
 */
export function formToDraft(values: ExpenseFormValues, key: string): { ok: true; draft: ExpenseDraft } | { ok: false; error: string; field: keyof ExpenseFormValues } {
  if (!values.date) return { ok: false, error: "Pick the day.", field: "date" };
  const cents = parseMoneyToCents(values.amount);
  if (cents === null || cents === 0) {
    return { ok: false, error: "Write the amount like 45.99 or 1,250.", field: "amount" };
  }
  if (cents < 0) {
    return {
      ok: false,
      error:
        values.is === "refund"
          ? "Type the amount that came back without a minus sign; how it is kept is your choice below."
          : "For a refund or credit, choose “A refund or credit” above and type the amount without a minus sign.",
      field: "amount",
    };
  }
  const currency = values.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Write the currency as three letters, like CAD.", field: "currency" };
  if (!values.paidTo.trim()) return { ok: false, error: values.is === "refund" ? "Say who it came back from." : "Say who it was paid to.", field: "paidTo" };
  if (!values.whatFor.trim()) return { ok: false, error: "Say what it was for.", field: "whatFor" };
  const share = readBusinessShare(values.businessShare);
  if (!share.ok) return { ok: false, error: share.error, field: "businessShare" };
  let gst: number | null = null;
  if (values.gstHst.trim() !== "") {
    gst = parseMoneyToCents(values.gstHst);
    if (gst === null || gst < 0) return { ok: false, error: "Write the GST/HST part like 5.98, or leave it blank.", field: "gstHst" };
    if (gst > cents) return { ok: false, error: "The GST/HST part can't be more than the amount.", field: "gstHst" };
  }

  const refund = values.is === "refund";
  if (refund && values.refundWay === "separate" && values.refundOfId === "") {
    return { ok: false, error: "A separate refund record needs the purchase it came from. Pick it, or keep the refund as a negative amount.", field: "refundOfId" };
  }
  return {
    ok: true,
    draft: {
      key,
      date: values.date,
      amountCents: refund && values.refundWay === "negative" ? -cents : cents,
      currency,
      paidTo: values.paidTo.trim(),
      whatFor: values.whatFor.trim(),
      category: blankToNull(values.category),
      sellerAddress: blankToNull(values.sellerAddress),
      vendorGstNumber: blankToNull(values.vendorGstNumber),
      recordKind: refund && values.refundWay === "separate" ? "refund" : "expense",
      refundOfId: refund && values.refundOfId !== "" ? values.refundOfId : null,
      gstHstCents: gst,
      creditNote: refund ? blankToNull(values.creditNote) : null,
      businessSharePercent: share.value,
    },
  };
}

/** The other way round: a draft back into the form, for "Edit" on the typed list. */
export function draftToForm(draft: ExpenseDraft): ExpenseFormValues {
  const refund = draft.recordKind === "refund" || draft.amountCents < 0;
  const plain = (cents: number) => (Math.abs(cents) / 100).toFixed(2);
  return {
    is: refund ? "refund" : "purchase",
    refundWay: draft.recordKind === "refund" ? "separate" : "negative",
    refundOfId: draft.refundOfId ?? "",
    date: draft.date,
    amount: plain(draft.amountCents),
    currency: draft.currency,
    paidTo: draft.paidTo,
    whatFor: draft.whatFor,
    category: draft.category ?? "",
    businessShare: draft.businessSharePercent === null ? "" : String(draft.businessSharePercent),
    gstHst: draft.gstHstCents === null ? "" : plain(draft.gstHstCents),
    creditNote: draft.creditNote ?? "",
    sellerAddress: draft.sellerAddress ?? "",
    vendorGstNumber: draft.vendorGstNumber ?? "",
  };
}

/** What is sent to /api/expenses/propose for one draft: the draft without its list key. */
export function draftToProposal(draft: ExpenseDraft): Omit<ExpenseDraft, "key"> {
  return {
    date: draft.date,
    amountCents: draft.amountCents,
    currency: draft.currency,
    paidTo: draft.paidTo,
    whatFor: draft.whatFor,
    category: draft.category,
    sellerAddress: draft.sellerAddress,
    vendorGstNumber: draft.vendorGstNumber,
    recordKind: draft.recordKind,
    refundOfId: draft.refundOfId,
    gstHstCents: draft.gstHstCents,
    creditNote: draft.creditNote,
    businessSharePercent: draft.businessSharePercent,
  };
}

/** "$45.99", falling back to a plain reading if the browser doesn't know the currency code. A negative amount keeps its sign. */
export function moneyText(cents: number, currency: string): string {
  try {
    return formatCents(cents, currency);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

type Describable = Pick<
  ExpenseView,
  "amountCents" | "currency" | "recordKind" | "refundOfId" | "gstHstCents" | "creditNote" | "businessSharePercent" | "category"
>;

/**
 * The small grey facts under a record, each the person's own: the share they typed beside the full
 * amount, the GST/HST part, the category, how a refund is kept and its credit note. `originalText`
 * names the purchase a refund points to (or null when it has none, or it was deleted).
 */
export function recordFacts(record: Describable, originalText: string | null): string[] {
  const facts: string[] = [];
  if (record.recordKind === "refund") {
    facts.push(originalText ? `Refund record, linked to ${originalText}` : "Refund record (the purchase it came from is no longer in DotAmi)");
  } else if (record.amountCents < 0) {
    facts.push(originalText ? `Refund or credit kept as a negative amount, linked to ${originalText}` : "Refund or credit kept as a negative amount");
  }
  if (record.businessSharePercent !== null) {
    facts.push(`Business share: ${record.businessSharePercent}% (your number) of the full ${moneyText(Math.abs(record.amountCents), record.currency)}`);
  }
  if (record.gstHstCents !== null) facts.push(`GST/HST part: ${moneyText(record.gstHstCents, record.currency)}`);
  if (record.category !== null) facts.push(`Category: ${record.category}`);
  if (record.creditNote !== null) facts.push(`Credit note: ${record.creditNote}`);
  return facts;
}

/**
 * The store refuses a batch with "Expense 3: …", counting the records it was sent. On the screen the
 * person sees titles, not positions, so the refusal is shown with the third record's title instead.
 * The title stays in the window: this text is shown, never logged or sent anywhere.
 */
export function nameTheRecord(error: string, titlesInOrder: string[]): string {
  const match = error.match(/^Expense (\d+): ([\s\S]*)$/);
  if (!match) return error;
  const title = titlesInOrder[Number(match[1]) - 1];
  return title === undefined ? error : `For “${title}”: ${match[2]}`;
}

/** One line naming a purchase, for a refund's link and the "came from" choice: day, who, amount. */
export function purchaseLabel(record: Pick<ExpenseView, "date" | "paidTo" | "amountCents" | "currency">): string {
  return `${record.date} · ${record.paidTo} · ${moneyText(record.amountCents, record.currency)}`;
}
