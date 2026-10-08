"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { Pill } from "@/components/ui";
import { describeReminder, describeWaiting, dueReminders, type ReminderFigure } from "@/lib/figures/reminder";
import type { ReminderCadence, ReminderDismissal } from "@/lib/settings/values";

/**
 * [8e] "<September 2026> ended and your figures for <idea> don't cover it" — the reminder inside
 * DotAmi itself (the "add to my calendar" file is a later slice). One banner per ticked cadence
 * that is due for the idea; which ones are due is decided in lib/figures/reminder.ts, from data
 * the page has already loaded:
 *
 *  - `figures` is the idea's list from /api/figures, or null while it is loading or when it
 *    couldn't be read. A banner is never drawn in either case: "your figures don't cover it" must
 *    not be said about a list the page doesn't have.
 *  - `reminders` is the useIdeaReminders hook's answer, the same one the ideas page's switches use.
 *
 * Nothing here shows an amount; the text is the period, the idea's name and a count of proposals.
 * "Not this time" hides the banner until the next period of that cadence has ended. The button
 * disappears with the banner, so focus is moved first (to the next banner's button, else to the
 * block that holds the banners) and a screen-reader-only note says what happened.
 */

export interface ReminderState {
  ids: string[] | null;
  cadences: ReminderCadence[] | null;
  dismissed: ReminderDismissal[] | null;
  dismissFailed: boolean;
  dismiss: (dismissal: ReminderDismissal, today: string) => void;
}

interface Props {
  ideaId: string;
  ideaName: string;
  figures: readonly ReminderFigure[] | null;
  /** The person's own day (useLocalToday). */
  today: string;
  reminders: ReminderState;
  /** Opens this idea's figure entry in place (the ideas page). */
  onAddFigures?: () => void;
  /** Or goes to it (the cockpit has no entry form of its own). Used when `onAddFigures` is not given. */
  addFiguresHref?: string;
}

const BUTTON_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-amber bg-transparent px-2.5 py-1 text-[11px] font-medium tracking-wide text-amber transition hover:bg-amber/10";

export function FigureReminderBanners({ ideaId, ideaName, figures, today, reminders, onAddFigures, addFiguresHref }: Props) {
  const { ids, cadences, dismissed } = reminders;
  const due = useMemo(
    () =>
      figures && ids && cadences && dismissed
        ? dueReminders({ ideaId, today, setting: { ideaIds: ids, cadences, dismissed }, figures })
        : [],
    [figures, ids, cadences, dismissed, ideaId, today],
  );

  // The block that holds the banners; it is where focus lands when the last banner goes.
  const box = useRef<HTMLDivElement>(null);
  const [hiddenNote, setHiddenNote] = useState("");

  if (due.length === 0 && !hiddenNote) return null;

  function dismiss(reminder: (typeof due)[number]) {
    // Move focus before the button unmounts, or the next Tab would start from the top of the page.
    const others = Array.from(box.current?.querySelectorAll<HTMLElement>("section") ?? []).filter(
      (s) => s.dataset.cadence !== reminder.cadence,
    );
    const nextButtons = others[0]?.querySelectorAll<HTMLElement>("button");
    const target = nextButtons && nextButtons.length > 0 ? nextButtons[nextButtons.length - 1] : box.current;
    target?.focus();
    setHiddenNote(`Hidden until the next ${reminder.cadence} period has ended.`);
    reminders.dismiss({ ideaId, cadence: reminder.cadence, periodEnd: reminder.period.end }, today);
  }

  return (
    <div
      ref={box}
      tabIndex={-1}
      // The note is only needed while focus sits here; once focus leaves, the block can go.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHiddenNote("");
      }}
      className={`outline-hidden ${due.length > 0 ? "mb-3 space-y-2" : ""}`}
    >
      {hiddenNote ? (
        <p role="status" className="sr-only">
          {hiddenNote}
        </p>
      ) : null}
      {due.map((reminder) => (
        // A named region, so a screen reader can jump to it and a test can find one by its period.
        <section
          key={reminder.cadence}
          data-cadence={reminder.cadence}
          aria-label={`Figure reminder, ${reminder.cadence}: ${reminder.period.label}`}
          className="rounded-sm border border-amber/40 bg-amber/5 px-3 py-2"
        >
          <p className="text-xs wrap-break-word text-amber">{describeReminder(reminder.period, ideaName)}</p>
          {reminder.waiting > 0 ? <p className="mt-0.5 text-[11px] text-stone">{describeWaiting(reminder.waiting)}</p> : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {onAddFigures ? (
              <Pill variant="amber-out" size="small" onClick={onAddFigures}>
                Add figures
              </Pill>
            ) : addFiguresHref ? (
              <Link href={addFiguresHref} className={BUTTON_CLASS}>
                Add figures
              </Link>
            ) : null}
            <Pill variant="ghost" size="small" onClick={() => dismiss(reminder)}>
              Not this time
            </Pill>
          </div>
        </section>
      ))}
      {reminders.dismissFailed ? (
        <p role="alert" className="text-[11px] text-amber">
          Couldn&apos;t save that — the reminder is back where it was.
        </p>
      ) : null}
    </div>
  );
}
