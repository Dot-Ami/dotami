import { isRealCalendarDay, SOURCE_LABEL_MAX, type Checked } from "@/lib/figures/validate";

import { EXPENSE_SOURCE_KINDS, type ExpenseSourceKind } from "./types";

/**
 * [8i] What the expense store accepts. Everything here is a trust boundary: records arrive from
 * the person's typing, a spreadsheet, the Lens or an outside agent, so every field is checked
 * whatever the caller already did. Refusals are plain English; the routes pass them straight back.
 *
 * Two rules from CLAUDE.md shape this file: DotAmi never derives a fact the person did not state
 * (so there is no category guessing here — a category is only ever copied from what was given),
 * and never invents a number (the bounds below are typo guards, said to be so, not tax rules).
 */

/** The fields the person's own words fill, with the longest each may be (characters, after trimming). */
export const PAID_TO_MAX = 120;
export const WHAT_FOR_MAX = 200;
export const CATEGORY_MAX = 80;
export const ADDRESS_MAX = 300;

/**
 * The largest amount a record may hold: 10^12 cents, ten billion dollars. A typo guard (an extra
 * run of zeros), not a business rule; far inside what a JavaScript number holds exactly.
 */
export const MAX_EXPENSE_CENTS = 1_000_000_000_000;

/**
 * The earliest day a record may carry. The Unix epoch: a purchase before it is a typo, and nothing
 * in the CRA's record-keeping rules reaches back that far. A typo guard, like the amount's.
 */
export const EARLIEST_EXPENSE_DAY = "1970-01-01";

/** A record as the store takes it, after checking. Optional fields are null, never undefined. */
export interface ProposedExpenseInput {
  /** YYYY-MM-DD */
  date: string;
  amountCents: number;
  currency: string;
  paidTo: string;
  whatFor: string;
  category: string | null;
  sellerAddress: string | null;
  vendorGstNumber: string | null;
}

/** The fields the person may change while agreeing. Currency is not one of them. */
export type ExpenseEdit = Partial<Omit<ProposedExpenseInput, "currency">>;

export const EDITABLE_FIELDS = [
  "date",
  "amountCents",
  "paidTo",
  "whatFor",
  "category",
  "sellerAddress",
  "vendorGstNumber",
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

function checkAmount(value: unknown): Checked<number> {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return { ok: false, error: "The amount has to be a whole number of cents." };
  }
  if (value <= 0) return { ok: false, error: "The amount has to be more than zero." };
  if (value > MAX_EXPENSE_CENTS) return { ok: false, error: "That amount is too large to be right." };
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

/**
 * Each editable field's check. Required fields refuse a blank; the optional three accept one
 * (that clears them). Shared by a whole record and by an edit made while agreeing.
 */
const FIELD_CHECKS: Record<(typeof EDITABLE_FIELDS)[number], (value: unknown, today: string) => Checked<unknown>> = {
  date: checkDate,
  amountCents: (v) => checkAmount(v),
  paidTo: (v) => checkText(v, { label: "Who it was paid to", max: PAID_TO_MAX, required: true }),
  whatFor: (v) => checkText(v, { label: "What it was for", max: WHAT_FOR_MAX, required: true }),
  category: (v) => checkText(v, { label: "The category", max: CATEGORY_MAX, required: false }),
  sellerAddress: (v) => checkText(v, { label: "The seller's address", max: ADDRESS_MAX, required: false, multiline: true }),
  vendorGstNumber: (v) => checkVendorGst(v),
};

/**
 * Checks one proposed record. `today` is a YYYY-MM-DD parameter (not read from the clock here)
 * so the caller decides which day counts as today — the person's, not UTC's — and tests stay
 * deterministic.
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

  return { ok: true, value: { ...out, currency: currency.value } as unknown as ProposedExpenseInput };
}

/**
 * Checks the changes a person made to a record in the agree prompt: only the editable fields, each
 * checked as it would be on a new record. A field the person didn't touch is simply absent.
 */
export function validateExpenseEdit(input: unknown, today: string): Checked<ExpenseEdit> {
  if (!isRecord(input)) return { ok: false, error: "An edit has to say which fields changed." };
  const allowed = EDITABLE_FIELDS as readonly string[];
  const stray = Object.keys(input).find((key) => !allowed.includes(key));
  if (stray !== undefined) return { ok: false, error: "An edit can only change the date, amount, who it was paid to, what for, category, address or GST/HST number." };

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
