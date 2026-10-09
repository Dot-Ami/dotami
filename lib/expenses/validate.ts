import { isRealCalendarDay, SOURCE_LABEL_MAX, type Checked } from "@/lib/figures/validate";

import { EXPENSE_RECORD_KINDS, EXPENSE_SOURCE_KINDS, type ExpenseRecordKind, type ExpenseSourceKind } from "./types";

/**
 * [8i] What the expense store accepts. Everything here is a trust boundary: records arrive from
 * the person's typing, a spreadsheet, the Lens or an outside agent, so every field is checked
 * whatever the caller already did. Refusals are plain English; the routes pass them straight back.
 *
 * Two rules from CLAUDE.md shape this file: DotAmi never derives a fact the person did not state
 * (so there is no category guessing here — a category is only ever copied from what was given — and
 * no business share or "deductible" amount is ever worked out), and never invents a number (the
 * bounds below are typo guards, said to be so, not tax rules).
 */

/** The fields the person's own words fill, with the longest each may be (characters, after trimming). */
export const PAID_TO_MAX = 120;
export const WHAT_FOR_MAX = 200;
export const CATEGORY_MAX = 80;
export const ADDRESS_MAX = 300;
/** A credit note's details: its number and date, in the person's words. */
export const CREDIT_NOTE_MAX = 200;

/**
 * The largest amount a record may hold, either way round: 10^12 cents, ten billion dollars. A typo
 * guard (an extra run of zeros), not a business rule; far inside what a JavaScript number holds exactly.
 */
export const MAX_EXPENSE_CENTS = 1_000_000_000_000;

/**
 * The person's own business share of a mixed-use purchase (the maintainer's decision, 2026-10-08):
 * a whole percent from 1 to 100, kept as typed beside the full amount. Whole numbers only, because
 * that is what the decision asked for and what a person reads back without rounding; 0 is refused
 * because a record with no business share is better left blank (or not kept at all), and over 100
 * is a typo. DotAmi never fills it in and never multiplies it into a "deductible" amount.
 */
export const BUSINESS_SHARE_MIN = 1;
export const BUSINESS_SHARE_MAX = 100;

/**
 * The earliest day a record may carry. The Unix epoch: a purchase before it is a typo, and nothing
 * in the CRA's record-keeping rules reaches back that far. A typo guard, like the amount's.
 */
export const EARLIEST_EXPENSE_DAY = "1970-01-01";

/** A record as the store takes it, after checking. Optional fields are null, never undefined. */
export interface ProposedExpenseInput {
  /** YYYY-MM-DD */
  date: string;
  /** Never zero; below zero only for a refund or credit kept as a negative amount. */
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

/** The fields the person may change while agreeing. The currency, the kind and the link are not among them. */
export type ExpenseEdit = Partial<Omit<ProposedExpenseInput, "currency" | "recordKind" | "refundOfId">>;

export const EDITABLE_FIELDS = [
  "date",
  "amountCents",
  "paidTo",
  "whatFor",
  "category",
  "sellerAddress",
  "vendorGstNumber",
  "gstHstCents",
  "creditNote",
  "businessSharePercent",
] as const;

export interface ExpenseSourceInput {
  kind: ExpenseSourceKind;
  label: string;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

// Control characters (a tab, a bell, a null byte) have no business in a name or a note; a line
// break is allowed only where a field says so (the address).
const CONTROL_ANY = /[\u0000-\u001F\u007F]/;
const CONTROL_EXCEPT_NEWLINE = /[\u0000-\u0009\u000B-\u001F\u007F]/;

/**
 * A text field. Trimmed. A required field that is blank is refused; an optional one that is blank
 * (or absent, or null) becomes null, so a form's empty box means "nothing given".
 */
function checkText(
  value: unknown,
  opts: { label: string; max: number; required: boolean; multiline?: boolean },
): Checked<string | null> {
  if (value === undefined || value === null) {
    return opts.required ? { ok: false, error: `${opts.label} is needed.` } : { ok: true, value: null };
  }
  if (typeof value !== "string") return { ok: false, error: `${opts.label} has to be text.` };
  const text = value.trim();
  if (text.length === 0) {
    return opts.required ? { ok: false, error: `${opts.label} is needed.` } : { ok: true, value: null };
  }
  if (text.length > opts.max) return { ok: false, error: `${opts.label} can be at most ${opts.max} characters.` };
  if ((opts.multiline ? CONTROL_EXCEPT_NEWLINE : CONTROL_ANY).test(text)) {
    return { ok: false, error: `${opts.label} can't hold control characters.` };
  }
  return { ok: true, value: text };
}

/**
 * The vendor's GST/HST number. The CRA describes a program account number as "your unique 9-digit
 * BN, a 2-letter program identifier ... a 4-digit reference number", and the GST/HST one carries
 * the identifier RT (so 123456789 RT 0001) — Canada Revenue Agency, "Program accounts you may
 * need", canada.ca, page dated 2026-09-03, read 2026-10-07:
 * https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/business-registration/business-number-program-account/need-program-accounts.html
 *
 * So the shape checked is nine digits, optionally followed by RT and four digits; spaces, hyphens
 * and letter case are ignored, and the stored form is the CRA's own spacing. A receipt often prints
 * only the nine digits, hence the optional tail. This is a SHAPE check, not a lookup: DotAmi does not
 * ask the CRA whether the number is real (that would be a request out, and a filing-adjacent act),
 * and a vendor outside Canada has none (leave it blank).
 */
export function normaliseVendorGstNumber(text: string): string | null {
  const squashed = text.replace(/[\s-]/g, "").toUpperCase();
  const match = squashed.match(/^(\d{9})(?:RT(\d{4}))?$/);
  if (!match) return null;
  return match[2] ? `${match[1]} RT ${match[2]}` : match[1];
}

function checkVendorGst(value: unknown): Checked<string | null> {
  const text = checkText(value, { label: "The GST/HST number", max: 40, required: false });
  if (!text.ok || text.value === null) return text;
  const normal = normaliseVendorGstNumber(text.value);
  if (normal === null) {
    return {
      ok: false,
      error:
        "The GST/HST number has to be nine digits, optionally followed by RT and four more digits (123456789 RT 0001). Leave it blank if the seller has none.",
    };
  }
  return { ok: true, value: normal };
}

/**
 * The amount on its own: whole cents, not zero, within the typo guard either way round. Whether it
 * may be below zero depends on the kind of record, so that is checked with the whole record
 * (checkRecordRules).
 */
function checkAmount(value: unknown): Checked<number> {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return { ok: false, error: "The amount has to be a whole number of cents." };
  }
  if (value === 0) return { ok: false, error: "The amount can't be zero." };
  if (Math.abs(value) > MAX_EXPENSE_CENTS) return { ok: false, error: "That amount is too large to be right." };
  return { ok: true, value };
}

/** The GST/HST part, if given: whole cents, zero or more. Whether it fits inside the amount is a whole-record rule. */
function checkGstHst(value: unknown): Checked<number | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return { ok: false, error: "The GST/HST part has to be a whole number of cents, zero or more." };
  }
  if (value > MAX_EXPENSE_CENTS) return { ok: false, error: "The GST/HST part is too large to be right." };
  return { ok: true, value };
}

function checkBusinessShare(value: unknown): Checked<number | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isInteger(value) || value < BUSINESS_SHARE_MIN || value > BUSINESS_SHARE_MAX) {
    return {
      ok: false,
      error: `The business share has to be a whole percent from ${BUSINESS_SHARE_MIN} to ${BUSINESS_SHARE_MAX}. Leave it blank if you don't want one.`,
    };
  }
  return { ok: true, value };
}

/** `today` is the person's own YYYY-MM-DD (the computer's local day), decided by the caller. */
function checkDate(value: unknown, today: string): Checked<string> {
  if (!isRealCalendarDay(value)) return { ok: false, error: "The date has to be a real day, written YYYY-MM-DD." };
  // ISO dates compare correctly as text.
  if (value > today) return { ok: false, error: "That day hasn't happened yet." };
  if (value < EARLIEST_EXPENSE_DAY) return { ok: false, error: `The date can't be before ${EARLIEST_EXPENSE_DAY}.` };
  return { ok: true, value };
}

function checkCurrency(value: unknown): Checked<string> {
  const currency = value === undefined ? "CAD" : value;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "The currency has to be a three-letter code such as CAD." };
  }
  return { ok: true, value: currency };
}

function checkRecordKind(value: unknown): Checked<ExpenseRecordKind> {
  const kind = value === undefined || value === null ? "expense" : value;
  if (typeof kind !== "string" || !(EXPENSE_RECORD_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `The kind of record has to be one of: ${EXPENSE_RECORD_KINDS.join(", ")}.` };
  }
  return { ok: true, value: kind as ExpenseRecordKind };
}

function checkRefundOfId(value: unknown): Checked<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.length === 0 || value.length > 64 || CONTROL_ANY.test(value)) {
    return { ok: false, error: "The expense a refund came from has to be named by its id." };
  }
  return { ok: true, value };
}

/**
 * Each editable field's check. Required fields refuse a blank; the optional ones accept one (that
 * clears them). Shared by a whole record and by an edit made while agreeing.
 */
const FIELD_CHECKS: Record<(typeof EDITABLE_FIELDS)[number], (value: unknown, today: string) => Checked<unknown>> = {
  date: checkDate,
  amountCents: (v) => checkAmount(v),
  paidTo: (v) => checkText(v, { label: "Who it was paid to", max: PAID_TO_MAX, required: true }),
  whatFor: (v) => checkText(v, { label: "What it was for", max: WHAT_FOR_MAX, required: true }),
  category: (v) => checkText(v, { label: "The category", max: CATEGORY_MAX, required: false }),
  sellerAddress: (v) => checkText(v, { label: "The seller's address", max: ADDRESS_MAX, required: false, multiline: true }),
  vendorGstNumber: (v) => checkVendorGst(v),
  gstHstCents: (v) => checkGstHst(v),
  creditNote: (v) => checkText(v, { label: "The credit note's details", max: CREDIT_NOTE_MAX, required: false }),
  businessSharePercent: (v) => checkBusinessShare(v),
};

/** True when the record is a refund or credit, whichever way the person chose to keep it. */
export function isRefundOrCredit(record: { recordKind: ExpenseRecordKind; amountCents: number }): boolean {
  return record.recordKind === "refund" || record.amountCents < 0;
}

/**
 * The rules that tie fields together, checked on a whole record: a new one, or a waiting one with
 * the person's edits applied. Refunds and credits are kept either of two ways, the person's choice
 * (the maintainer's decision, 2026-10-08):
 *   - a negative amount on an "expense" record, which may point at the expense it came from;
 *   - a separate "refund" record holding the amount that came back (above zero), which must.
 * A credit note belongs only to a refund or credit, and the GST/HST part can't be more than the amount.
 * None of this says how anything is taxed.
 */
export function checkRecordRules(record: {
  recordKind: ExpenseRecordKind;
  amountCents: number;
  refundOfId: string | null;
  gstHstCents: number | null;
  creditNote: string | null;
}): Checked<true> {
  if (record.recordKind === "refund") {
    if (record.amountCents < 0) {
      return { ok: false, error: "A refund record holds the amount that came back, more than zero. To keep it as a negative amount, record it as an expense instead." };
    }
    if (record.refundOfId === null) return { ok: false, error: "A refund record needs the expense it came from." };
  } else if (record.refundOfId !== null && record.amountCents > 0) {
    return { ok: false, error: "Only a refund or credit can point to the expense it came from: make the amount negative, or keep it as a refund record." };
  }
  if (record.creditNote !== null && !isRefundOrCredit(record)) {
    return { ok: false, error: "A credit note belongs to a refund or credit." };
  }
  if (record.gstHstCents !== null && record.gstHstCents > Math.abs(record.amountCents)) {
    return { ok: false, error: "The GST/HST part can't be more than the amount." };
  }
  return { ok: true, value: true };
}

/**
 * Checks one proposed record. `today` is a YYYY-MM-DD parameter (not read from the clock here)
 * so the caller decides which day counts as today — the person's, not UTC's — and tests stay
 * deterministic. Whether a refund's link points at a real expense of the person's is the store's
 * check (it needs the database).
 */
export function validateExpenseInput(input: unknown, today: string): Checked<ProposedExpenseInput> {
  if (!isRecord(input)) return { ok: false, error: "Each expense needs a date, an amount, who it was paid to and what for." };

  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    const checked = FIELD_CHECKS[field](input[field], today);
    if (!checked.ok) return checked;
    out[field] = checked.value;
  }
  const currency = checkCurrency(input.currency);
  if (!currency.ok) return currency;
  const recordKind = checkRecordKind(input.recordKind);
  if (!recordKind.ok) return recordKind;
  const refundOfId = checkRefundOfId(input.refundOfId);
  if (!refundOfId.ok) return refundOfId;

  const value = { ...out, currency: currency.value, recordKind: recordKind.value, refundOfId: refundOfId.value } as unknown as ProposedExpenseInput;
  const rules = checkRecordRules(value);
  if (!rules.ok) return rules;
  return { ok: true, value };
}

/**
 * Checks the changes a person made to a record in the agree prompt: only the editable fields, each
 * checked as it would be on a new record. A field the person didn't touch is simply absent. The
 * rules that tie fields together are checked by the store once the edit is applied to the record.
 */
export function validateExpenseEdit(input: unknown, today: string): Checked<ExpenseEdit> {
  if (!isRecord(input)) return { ok: false, error: "An edit has to say which fields changed." };
  const allowed = EDITABLE_FIELDS as readonly string[];
  const stray = Object.keys(input).find((key) => !allowed.includes(key));
  if (stray !== undefined) {
    return {
      ok: false,
      error:
        "An edit can only change the date, amount, who it was paid to, what for, category, address, GST/HST number, GST/HST part, credit note or business share.",
    };
  }

  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (!Object.hasOwn(input, field)) continue;
    const checked = FIELD_CHECKS[field](input[field], today);
    if (!checked.ok) return checked;
    out[field] = checked.value;
  }
  return { ok: true, value: out as ExpenseEdit };
}

/** Checks where a batch of proposed records came from. */
export function validateExpenseSource(input: unknown): Checked<ExpenseSourceInput> {
  if (!isRecord(input)) return { ok: false, error: "Say where these expenses came from." };

  const kind = input.kind;
  if (typeof kind !== "string" || !(EXPENSE_SOURCE_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `The source kind has to be one of: ${EXPENSE_SOURCE_KINDS.join(", ")}.` };
  }
  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (label.length === 0 || label.length > SOURCE_LABEL_MAX || CONTROL_ANY.test(label)) {
    return { ok: false, error: `The source needs a name of 1 to ${SOURCE_LABEL_MAX} characters.` };
  }
  return { ok: true, value: { kind: kind as ExpenseSourceKind, label } };
}
