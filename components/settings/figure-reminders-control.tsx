"use client";

import { useEffect, useRef, useState } from "react";

import { CALENDAR_FILE_NAME, CALENDAR_MIME, reminderCalendar } from "@/lib/figures/calendar";
import { useLocalToday } from "@/lib/figures/use-local-today";
import { loadSetting, saveSetting } from "@/lib/settings/client";
import { REMINDER_CADENCES, REMINDER_CADENCE_LABELS, type ReminderCadence } from "@/lib/settings/values";
import { settingsWords } from "@/lib/settings/words";
import { saveTextFile } from "@/lib/utils/save-file";

/**
 * [8e] The "Figure reminders" tick-boxes: monthly, quarterly, yearly — any combination, or none.
 * Each tick saves at once (no Save button) and the answer the app sends back is what the boxes
 * then show, so a box never stays ticked after a save that failed.
 *
 * `initial` is what the server read when the page was built; it only gives the first paint. The
 * browser's Back/Forward buttons can bring this page back from the browser's memory without asking
 * the server again, so `initial` may be older than what is saved. Every tick sends the whole list
 * built from what is on screen, so a stale list would silently undo a saved choice. The boxes are
 * therefore switched off until the control has read the saved value itself, on every appearance,
 * the way the ideas page's switches do.
 *
 * "Add to my calendar" ([8e]) saves a calendar file made here in the page from the ticked boxes
 * (lib/figures/calendar.ts); nothing is sent anywhere. It waits while a tick is still saving, so the
 * file always matches what is saved.
 */
export function FigureRemindersControl({ initial }: { initial: ReminderCadence[] | null }) {
  const words = settingsWords.figureReminders;
  const [ticked, setTicked] = useState<ReminderCadence[]>(initial ?? []);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // "reading" until the saved value has been asked for; "failed" when it couldn't be read.
  const [read, setRead] = useState<"reading" | "ready" | "failed">("reading");
  // What the app last confirmed — the thing to go back to if a save fails.
  const confirmed = useRef<ReminderCadence[]>(initial ?? []);
  // Ticks can come faster than saves finish; only the newest save may change what's shown.
  const newest = useRef(0);
  // The person's own day: the first event falls on the first day after it that starts a period.
  const today = useLocalToday();

  useEffect(() => {
    let live = true;
    void loadSetting("figure-reminders").then((value) => {
      if (!live) return;
      if (!value) {
        setRead("failed");
        return;
      }
      confirmed.current = value.cadences;
      setTicked(value.cadences);
      setRead("ready");
    });
    return () => {
      live = false;
    };
  }, []);

  async function toggle(cadence: ReminderCadence, on: boolean) {
    const next = REMINDER_CADENCES.filter((c) => (c === cadence ? on : ticked.includes(c)));
    const mine = ++newest.current;
    setTicked(next);
    setState("saving");
    const saved = await saveSetting("figure-reminders", { cadences: next });
    if (mine !== newest.current) return;
    if (saved) {
      confirmed.current = saved.cadences;
      setTicked(saved.cadences);
      setState("saved");
    } else {
      setTicked(confirmed.current);
      setState("error");
    }
  }

  function addToCalendar() {
    if (ticked.length === 0) return;
    saveTextFile(CALENDAR_FILE_NAME, CALENDAR_MIME, reminderCalendar({ cadences: ticked, today, now: new Date() }));
  }

  return (
    <fieldset disabled={read !== "ready"}>
      <legend className="font-mono text-label uppercase tracking-[0.14em] text-stone">{words.legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {REMINDER_CADENCES.map((c) => (
          <label key={c} className="flex items-center gap-2 text-lead text-paper">
            <input
              type="checkbox"
              checked={ticked.includes(c)}
              onChange={(e) => void toggle(c, e.target.checked)}
              className="size-4 accent-maple"
            />
            {REMINDER_CADENCE_LABELS[c]}
          </label>
        ))}
      </div>
      <p role="status" className="mt-1.5 min-h-4 font-mono text-label uppercase tracking-wider text-stone-dim">
        {read === "failed"
          ? words.status.readFailed
          : state === "saving"
            ? words.status.saving
            : state === "saved"
              ? words.status.saved
              : state === "error"
                ? words.status.saveFailed
                : read === "ready" && ticked.length === 0
                  ? words.status.none
                  : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={addToCalendar}
          disabled={ticked.length === 0 || state === "saving"}
          className="shrink-0 rounded-sm border border-rule px-2 py-0.5 font-mono text-small uppercase tracking-wider text-stone transition hover:border-maple-soft hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rule disabled:hover:text-stone"
        >
          {words.addToCalendar}
        </button>
        <p className="min-w-0 flex-1 text-body leading-relaxed text-stone">{words.calendarHelp}</p>
      </div>
    </fieldset>
  );
}
