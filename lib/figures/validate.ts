import { taxLineEntryForKind, taxLineForYear } from "@/lib/engines/taxlines/v2026";

import {
  FIGURE_KINDS,
  FIGURE_SOURCE_KINDS,
  type FigureKind,
  type FigureSourceKind,
} from "./types";

/** Plain-English refusals; the routes pass `error` straight back to the caller. */
export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

export interface ProposedFigureInput {
  kind: FigureKind;
  /** YYYY-MM-DD */
  periodStart: string;
  periodEnd: string;
  amountCents: number;
  currency: string;
  /**
   * How many rows were added up into this one figure, when it differs from the batch's — a file
   * proposes one total per month, each from its own rows ([8c]). Absent: the source's count applies.
   */
  rows?: number;
  /** [8f] The tax year a T2125 total is for. Required for those kinds, refused on any other. */
  taxYear?: number;
  /** [8f] The form and line as printed on the return it was read from: "T2125 8299". Optional. */
  formLine?: string;
}

export interface FigureSourceInput {
  kind: FigureSourceKind;
  label: string;
  rows: number | null;
}

export const SOURCE_LABEL_MAX = 120;

/** True for a real calendar day written exactly YYYY-MM-DD ("2026-02-30" is not one). */
export function isRealCalendarDay(text: unknown): text is string {
  if (typeof text !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const d = new Date(`${text}T00:00:00Z`);
  // Date rolls 02-30 over to 03-02; round-tripping catches that.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === text;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

const ROWS_ERROR = "The row count has to be a whole number, zero or more.";

/** A row count is optional; when given it must be a whole number, zero or more. */
function checkRows(rows: unknown): Checked<number | null> {
  if (rows === undefined || rows === null) return { ok: true, value: null };
  if (typeof rows !== "number" || !Number.isSafeInteger(rows) || rows < 0) return { ok: false, error: ROWS_ERROR };
  return { ok: true, value: rows };
}

/** The oldest tax year a figure may name; well before any form DotAmi will read. */
export const TAX_YEAR_MIN = 1990;

/** "T2125 8299": the form's code, one space, the line number as printed (four or five digits). */
const FORM_LINE = /^([A-Z0-9]{2,10}) (\d{4,5})$/;

/**
 * [8f] The tax year and form line of one figure. A T2125 total must say which tax year it is for
 * (the line it goes on depends on the year); no other kind may carry either. A form line, when
 * given, must be on this kind's form, and for a year a person has read it must be the line the
 * catalog has for this kind: a "9946" sent as gross income is a mix-up, not a renumbering. For a
 * year nobody has read yet, the line is kept as given (that's the point of keeping it as read).
 */
function checkTaxLine(
  kind: FigureKind,
  taxYear: unknown,
  formLine: unknown,
  today: string,
): Checked<{ taxYear?: number; formLine?: string }> {
  const entry = taxLineEntryForKind(kind);
  if (!entry) {
    if (taxYear !== undefined && taxYear !== null) return { ok: false, error: "Only a tax-form total has a tax year." };
    if (formLine !== undefined && formLine !== null) return { ok: false, error: "Only a tax-form total has a form line." };
    return { ok: true, value: {} };
  }

  const thisYear = Number(today.slice(0, 4));
  if (typeof taxYear !== "number" || !Number.isSafeInteger(taxYear) || taxYear < TAX_YEAR_MIN || taxYear > thisYear) {
    return { ok: false, error: `A ${entry.form} total needs its tax year, a year from ${TAX_YEAR_MIN} to ${thisYear}.` };
  }
  if (formLine === undefined || formLine === null) return { ok: true, value: { taxYear } };

  const match = typeof formLine === "string" ? FORM_LINE.exec(formLine) : null;
  if (!match || match[1] !== entry.form) {
    return { ok: false, error: `The form line has to be written like "${entry.form} 8299": the form, a space, the line number.` };
  }
  const read = taxLineForYear(entry, taxYear);
  if (read && read.line !== match[2]) {
    return { ok: false, error: `On the CRA's ${taxYear} ${entry.form} this total is line ${read.line}, not ${match[2]}.` };
  }
  return { ok: true, value: { taxYear, formLine: formLine as string } };
}

/**
 * Checks one proposed figure. `today` is a YYYY-MM-DD parameter (not read from the clock here)
 * so the caller decides which day counts as today and tests stay deterministic.
 */
export function validateFigureInput(input: unknown, today: string): Checked<ProposedFigureInput> {
  if (!isRecord(input)) return { ok: false, error: "Each figure needs a kind, a period and an amount." };

  const kind = input.kind;
  if (typeof kind !== "string" || !(FIGURE_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `The kind of figure has to be one of: ${FIGURE_KINDS.join(", ")}.` };
  }

  const { periodStart, periodEnd } = input;
  if (!isRealCalendarDay(periodStart) || !isRealCalendarDay(periodEnd)) {
    return { ok: false, error: "The period has to start and end on real days, written YYYY-MM-DD." };
  }
  if (periodStart > periodEnd) {
    return { ok: false, error: "The period ends before it starts." };
  }
  // A period that hasn't finished has no actual total yet. (ISO dates compare correctly as text.)
  if (periodEnd > today) {
    return { ok: false, error: "That period hasn't ended yet." };
  }

  const amountCents = input.amountCents;
  if (typeof amountCents !== "number" || !Number.isSafeInteger(amountCents)) {
    return { ok: false, error: "The amount has to be a whole number of cents." };
  }

  const currency = input.currency === undefined ? "CAD" : input.currency;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "The currency has to be a three-letter code such as CAD." };
  }

  const rows = checkRows(input.rows);
  if (!rows.ok) return rows;

  const taxLine = checkTaxLine(kind as FigureKind, input.taxYear, input.formLine, today);
  if (!taxLine.ok) return taxLine;

  return {
    ok: true,
    value: {
      kind: kind as FigureKind,
      periodStart,
      periodEnd,
      amountCents,
      currency,
      ...(rows.value !== null ? { rows: rows.value } : {}),
      ...taxLine.value,
    },
  };
}

/** Checks where a batch of proposed figures came from. */
export function validateFigureSource(input: unknown): Checked<FigureSourceInput> {
  if (!isRecord(input)) return { ok: false, error: "Say where these figures came from." };

  const kind = input.kind;
  if (typeof kind !== "string" || !(FIGURE_SOURCE_KINDS as readonly string[]).includes(kind)) {
    return { ok: false, error: `The source kind has to be one of: ${FIGURE_SOURCE_KINDS.join(", ")}.` };
  }

  const label = typeof input.label === "string" ? input.label.trim() : "";
  if (label.length === 0 || label.length > SOURCE_LABEL_MAX) {
    return { ok: false, error: `The source needs a name of 1 to ${SOURCE_LABEL_MAX} characters.` };
  }

  const rows = checkRows(input.rows);
  if (!rows.ok) return rows;

  return { ok: true, value: { kind: kind as FigureSourceKind, label, rows: rows.value } };
}
