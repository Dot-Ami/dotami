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

  return { ok: true, value: { kind: kind as FigureKind, periodStart, periodEnd, amountCents, currency } };
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

  let rows: number | null = null;
  if (input.rows !== undefined && input.rows !== null) {
    if (typeof input.rows !== "number" || !Number.isSafeInteger(input.rows) || input.rows < 0) {
      return { ok: false, error: "The row count has to be a whole number, zero or more." };
    }
    rows = input.rows;
  }

  return { ok: true, value: { kind: kind as FigureSourceKind, label, rows } };
}
