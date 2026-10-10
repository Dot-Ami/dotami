import { MONTH_NAMES, isFuture, lastDayOfMonth as lastDay } from "../figures/age";
import type { ConfirmedFigure } from "./types";

/**
 * [8a] The person's confirmed revenue figures, read for a quarter-based threshold rule — today the
 * GST/HST small-supplier test (`thresholdTest` on the catalog entry,
 * lib/engines/compliance/v2026/rules.ts). Plain arithmetic on what the person agreed to; nothing
 * here is estimated.
 *
 * A figure counts only if its period is exactly one calendar month or one calendar quarter: those
 * add up into quarters without guessing. Any other period (a year, a fiscal quarter, a few weeks)
 * is kept and listed but not counted here, and the card says so — splitting it would be inventing
 * numbers. A figure in another currency isn't converted, so it isn't counted either. Two figures
 * covering the same month are never added together: that quarter is left out until the person
 * chooses which one counts.
 *
 * [8f] Only "gross-revenue" figures are read here, never the T2125 totals: line 8299 (business
 * gross income) is worked out after taking the GST/HST collected back out (lib/engines/taxlines/),
 * so it is a different total from the one the small-supplier test counts.
 * tests/brain-records.spec.ts checks the card ignores all four.
 *
 * [8e] A figure whose period ends after today is never counted (a wrong clock when it was typed,
 * a clock set back since, a restored backup): it is listed as not counted, with its date. And a
 * figure from before the quarters this rule reads is listed in `outsideWindow` instead of
 * silently disappearing.
 */

export interface QuarterRead {
  /** e.g. "July to September 2026". */
  label: string;
  start: string;
  end: string;
  /** Counted revenue in the quarter, in cents (0 when the quarter is left out for a conflict). */
  cents: number;
  /** Months of the quarter covered by exactly one counted figure (0–3). */
  monthsCovered: number;
  /** Two or more figures cover the same month in this quarter. */
  conflict: boolean;
}

export interface RevenueRead {
  /** The last `consecutiveQuarters` complete calendar quarters before today's, oldest first. */
  window: QuarterRead[];
  /** Today's quarter, so far. */
  current: QuarterRead;
  /** Counted revenue across the window, in cents. A lower bound unless `windowComplete`. */
  windowCents: number;
  /** Every month of every window quarter is covered once — the total is the whole picture. */
  windowComplete: boolean;
  /** A quarter (window or current) whose counted revenue alone is over the threshold. */
  overSingleQuarter: QuarterRead | null;
  /** Months ("2026-03") covered by more than one figure. */
  conflictMonths: string[];
  /** The figures the read counted. */
  used: ConfirmedFigure[];
  /** Figures of this kind it couldn't count, and why — shown on the card, never silently dropped. */
  notCounted: { figure: ConfirmedFigure; reason: string }[];
  /** Figures from before the first quarter this rule reads: listed so the card can say they exist. */
  outsideWindow: ConfirmedFigure[];
}

interface Day {
  y: number;
  m: number; // 1–12
  d: number;
}

function parseDay(iso: string): Day {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

/** Quarter index counted from year 0, so stepping back across a year is plain subtraction. */
const quarterIndex = (y: number, m: number) => y * 4 + Math.floor((m - 1) / 3);

function quarterBounds(index: number): { y: number; firstMonth: number } {
  return { y: Math.floor(index / 4), firstMonth: (index % 4) * 3 + 1 };
}

function quarterLabel(index: number): string {
  const { y, firstMonth } = quarterBounds(index);
  return `${MONTH_NAMES[firstMonth - 1]} to ${MONTH_NAMES[firstMonth + 1]} ${y}`;
}

/** The months a figure covers, if its period is exactly one calendar month or quarter. */
function monthsOf(figure: ConfirmedFigure): string[] | null {
  const s = parseDay(figure.periodStart);
  const e = parseDay(figure.periodEnd);
  if (s.d !== 1 || e.d !== lastDay(e.y, e.m)) return null;
  if (s.y === e.y && s.m === e.m) return [monthKey(s.y, s.m)];
  if (s.y === e.y && (s.m - 1) % 3 === 0 && e.m === s.m + 2) {
    return [0, 1, 2].map((i) => monthKey(s.y, s.m + i));
  }
  return null;
}

export function readRevenue(
  figures: readonly ConfirmedFigure[] | undefined,
  options: { today: string; consecutiveQuarters: number; thresholdCents: number; kind?: string; currency?: string },
): RevenueRead | null {
  const kind = options.kind ?? "gross-revenue";
  const currency = options.currency ?? "CAD";
  const relevant = (figures ?? []).filter((f) => f.kind === kind);
  if (relevant.length === 0) return null;

  // The quarters this read looks at: the last `consecutiveQuarters` complete ones, then today's.
  const t = parseDay(options.today);
  const currentIndex = quarterIndex(t.y, t.m);
  const firstWindowIndex = currentIndex - options.consecutiveQuarters;

  const notCounted: RevenueRead["notCounted"] = [];
  const outsideWindow: ConfirmedFigure[] = [];
  // month -> the figures covering it (a quarter figure is listed under each of its months).
  const byMonth = new Map<string, ConfirmedFigure[]>();
  const monthsByFigure = new Map<string, string[]>();
  for (const figure of relevant) {
    // First, whatever else is true of it: a period that ends after today has no total yet. This
    // is what keeps a wrong clock from deciding a card (an October figure typed on October 6).
    if (isFuture(figure.periodEnd, options.today)) {
      notCounted.push({ figure, reason: `it ends after today (${figure.periodEnd}) — check its date` });
      continue;
    }
    if (figure.currency !== currency) {
      notCounted.push({ figure, reason: `it's in ${figure.currency} — not converted, so not counted` });
      continue;
    }
    const months = monthsOf(figure);
    if (!months) {
      notCounted.push({
        figure,
        reason: `it covers ${figure.periodStart} to ${figure.periodEnd}, which isn't one calendar month or quarter`,
      });
      continue;
    }
    // A month or quarter sits wholly inside one quarter, so its first month says which. Older
    // than the window: listed, and kept out of the month map so it can't raise a "two figures
    // cover this month" notice about a quarter this rule never reads.
    const first = parseDay(figure.periodStart);
    if (quarterIndex(first.y, first.m) < firstWindowIndex) {
      outsideWindow.push(figure);
      continue;
    }
    monthsByFigure.set(figure.id, months);
    for (const m of months) byMonth.set(m, [...(byMonth.get(m) ?? []), figure]);
  }

  const conflictMonths = [...byMonth.entries()].filter(([, fs]) => fs.length > 1).map(([m]) => m).sort();
  const used = new Map<string, ConfirmedFigure>();

  const readQuarter = (index: number): QuarterRead => {
    const { y, firstMonth } = quarterBounds(index);
    const months = [0, 1, 2].map((i) => monthKey(y, firstMonth + i));
    const conflict = months.some((m) => (byMonth.get(m)?.length ?? 0) > 1);
    const inQuarter = new Map<string, ConfirmedFigure>();
    let monthsCovered = 0;
    for (const m of months) {
      const fs = byMonth.get(m) ?? [];
      if (fs.length === 1) {
        monthsCovered += 1;
        inQuarter.set(fs[0].id, fs[0]);
      }
    }
    if (!conflict) for (const f of inQuarter.values()) used.set(f.id, f);
    return {
      label: quarterLabel(index),
      start: `${y}-${pad(firstMonth)}-01`,
      end: `${y}-${pad(firstMonth + 2)}-${pad(lastDay(y, firstMonth + 2))}`,
      // Each figure once: a quarter figure covers three months but is one amount.
      cents: conflict ? 0 : [...inQuarter.values()].reduce((sum, f) => sum + f.amountCents, 0),
      monthsCovered: conflict ? 0 : monthsCovered,
      conflict,
    };
  };

  const window: QuarterRead[] = [];
  for (let i = options.consecutiveQuarters; i >= 1; i -= 1) window.push(readQuarter(currentIndex - i));
  const current = readQuarter(currentIndex);

  const windowCents = window.reduce((sum, q) => sum + q.cents, 0);
  return {
    window,
    current,
    windowCents,
    windowComplete: window.every((q) => q.monthsCovered === 3 && !q.conflict),
    overSingleQuarter: [...window, current].find((q) => q.cents > options.thresholdCents) ?? null,
    conflictMonths,
    used: [...used.values()],
    notCounted,
    outsideWindow,
  };
}

/** "$27,400" or "$27,400.50" — whole dollars when there are no cents. */
export function formatCad(cents: number): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** "March 2026" for a "2026-03" month key. */
export function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "September 30, 2026" for a "2026-09-30" day — read as text, never through a Date and a time zone. */
export function longDay(day: string): string {
  const { y, m, d } = parseDay(day);
  return `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}
