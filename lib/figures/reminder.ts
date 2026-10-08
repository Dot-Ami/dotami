/**
 * [8e] Figure reminders: which banners are due for one idea, today.
 *
 * Pure and free of the database and the clock — the caller hands in "today" (the person's own day,
 * lib/figures/age.ts localToday), the saved reminders setting and the idea's figures, and gets back
 * the banners to draw. The page computes this from data it already loaded; nothing is stored here
 * and no amount ever reaches the text, the response or an address (a figure's dates and status are
 * all this reads).
 *
 * A banner is due for an idea and a cadence when ALL of these hold:
 *   1. the idea's own switch is on, and the cadence's tick-box is ticked;
 *   2. the person hasn't answered "Not this time" for this period;
 *   3. the most recent period of that cadence that has ENDED (a month, a calendar quarter, a
 *      calendar year, by the person's own day) is not covered by the idea's agreed figures.
 *
 * What covers a period, decided on purpose:
 *   - Only a figure of the reminder's own kind counts (gross revenue today). Coverage is counted
 *     per kind so that a later yearly tax total of another kind can't silence a revenue reminder.
 *   - Only an AGREED (confirmed) figure counts. Proposals still waiting in the agree prompt don't;
 *     they are counted separately so the banner can say how many are waiting.
 *   - A figure counts only if its own period lies inside the reminded period or equals it. So a
 *     quarterly figure covers the quarter but NOT each of its months for a monthly reminder, and a
 *     yearly figure covers neither. (The reminder asks "is this period covered?", and a figure for
 *     a longer stretch says nothing certain about a shorter one inside it.)
 *   - Figures that each lie inside the period add up: three agreed monthly figures cover the
 *     quarter, a single month of it does not. The days must run without a gap from the period's
 *     first day to its last — no number is guessed to fill a hole.
 */

import { daysBetween, lastEndedPeriod, parseDay, type DayPeriod } from "./age";
import type { FigureKind, FigureView } from "./types";
import {
  MAX_DISMISSALS,
  type FigureRemindersValue,
  type ReminderCadence,
  type ReminderDismissal,
} from "../settings/values";

/**
 * The kind of figure the reminder is about. New kinds (yearly tax totals, say) get their own
 * reminder later rather than being folded into this one.
 */
export const REMINDER_FIGURE_KIND: FigureKind = "gross-revenue";

/** The parts of a figure this file reads — deliberately no amount, source or id. */
export type ReminderFigure = Pick<FigureView, "kind" | "periodStart" | "periodEnd" | "status">;

export interface DueReminder {
  ideaId: string;
  cadence: ReminderCadence;
  /** The period that ended and isn't covered. */
  period: DayPeriod;
  /** Proposed figures of the reminder's kind inside the period, waiting in the agree prompt. */
  waiting: number;
}

/** What the banner says about the period; no figure and no amount is mentioned. */
export function describeReminder(period: DayPeriod, ideaName: string): string {
  return `${period.label} ended and your figures for ${ideaName} don't cover it`;
}

/** "2 figures waiting for you to agree" — they are not counted as covering the period. */
export function describeWaiting(waiting: number): string {
  return `${waiting} ${waiting === 1 ? "figure" : "figures"} waiting for you to agree`;
}

/** A figure's days if it is a well-formed span of the reminder's kind lying inside `period`, else null. */
function spanInside(figure: ReminderFigure, period: DayPeriod): { start: string; end: string } | null {
  if (figure.kind !== REMINDER_FIGURE_KIND) return null;
  if (!parseDay(figure.periodStart) || !parseDay(figure.periodEnd)) return null;
  if (figure.periodEnd < figure.periodStart) return null;
  // Zero-padded ISO days compare correctly as text.
  if (figure.periodStart < period.start || figure.periodEnd > period.end) return null;
  return { start: figure.periodStart, end: figure.periodEnd };
}

/** True when the agreed figures between them cover every day of `period`, with no gap. */
export function periodIsCovered(period: DayPeriod, figures: readonly ReminderFigure[]): boolean {
  const spans = figures
    .filter((f) => f.status === "confirmed")
    .map((f) => spanInside(f, period))
    .filter((s): s is { start: string; end: string } => s !== null)
    .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

  // The last day covered so far; null until a figure starts on the period's first day.
  let coveredThrough: string | null = null;
  for (const span of spans) {
    const gap = coveredThrough === null ? span.start > period.start : daysBetween(coveredThrough, span.start) > 1;
    if (gap) return false;
    if (coveredThrough === null || span.end > coveredThrough) coveredThrough = span.end;
  }
  return coveredThrough !== null && coveredThrough >= period.end;
}

/** How many proposed figures of the reminder's kind lie inside `period`. */
function countWaiting(period: DayPeriod, figures: readonly ReminderFigure[]): number {
  return figures.filter((f) => f.status === "proposed" && spanInside(f, period) !== null).length;
}

export interface DueRemindersInput {
  ideaId: string;
  /** The person's own day, YYYY-MM-DD. */
  today: string;
  /** The saved reminders setting (the cadences ticked, the ideas switched on, the dismissals). */
  setting: Pick<FigureRemindersValue, "cadences" | "ideaIds" | "dismissed">;
  /** Every figure the page loaded for this idea; statuses other than proposed/confirmed are ignored. */
  figures: readonly ReminderFigure[];
}

/** The banners due for one idea today, in the order monthly, quarterly, yearly. */
export function dueReminders({ ideaId, today, setting, figures }: DueRemindersInput): DueReminder[] {
  if (!parseDay(today)) return [];
  // Switch off for this idea: nothing, whatever is ticked.
  if (!setting.ideaIds.includes(ideaId)) return [];

  const due: DueReminder[] = [];
  for (const cadence of setting.cadences) {
    const period = lastEndedPeriod(today, cadence);
    const dismissed = setting.dismissed.some(
      (d) => d.ideaId === ideaId && d.cadence === cadence && d.periodEnd === period.end,
    );
    if (dismissed || periodIsCovered(period, figures)) continue;
    due.push({ ideaId, cadence, period, waiting: countWaiting(period, figures) });
  }
  return due;
}

/**
 * Keeps only the dismissals for a period that is still the latest ended one of its cadence.
 * Anything older is for a period whose reminder could never come back, so it can go.
 */
export function pruneDismissals(dismissed: readonly ReminderDismissal[], today: string): ReminderDismissal[] {
  if (!parseDay(today)) return [...dismissed];
  return dismissed.filter((d) => d.periodEnd === lastEndedPeriod(today, d.cadence).end);
}

/** The list after "Not this time" on one banner: that dismissal added (once), the stale ones dropped. */
export function withDismissal(
  dismissed: readonly ReminderDismissal[],
  added: ReminderDismissal,
  today: string,
): ReminderDismissal[] {
  const kept = pruneDismissals(dismissed, today).filter(
    (d) => !(d.ideaId === added.ideaId && d.cadence === added.cadence && d.periodEnd === added.periodEnd),
  );
  // The setting refuses a longer list; at the cap, the oldest entries make room.
  return [...kept, added].slice(-MAX_DISMISSALS);
}
