"use client";

import { useEffect, useRef, useState } from "react";

import { CALENDAR_FILE_NAME, CALENDAR_MIME, reminderCalendar } from "@/lib/figures/calendar";
import { useLocalToday } from "@/lib/figures/use-local-today";
import { loadSetting, saveSetting } from "@/lib/settings/client";
import { REMINDER_CADENCES, REMINDER_CADENCE_LABELS, type ReminderCadence } from "@/lib/settings/values";
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
      <legend className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-stone">Remind me</legend>
      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {REMINDER_CADENCES.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm text-paper">
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
      <p role="status" className="mt-1.5 min-h-4 font-mono text-[9px] uppercase tracking-wider text-stone-dim">
        {read === "failed"
          ? "Couldn't read your saved choice, so it can't be changed right now."
          : state === "saving"
            ? "Saving…"
            : state === "saved"
              ? "Saved."
              : state === "error"
                ? "Save failed — nothing was changed."
                : read === "ready" && ticked.length === 0
                  ? "None ticked: no reminder."
                  : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-1.5">
        <button
          type="button"
          onClick={addToCalendar}
          disabled={ticked.length === 0 || state === "saving"}
          className="shrink-0 rounded-sm border border-rule px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stone transition hover:border-maple-soft hover:text-paper disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rule disabled:hover:text-stone"
        >
          Add to my calendar
        </button>
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone">
          Saves a calendar file (.ics) with one repeating event per ticked box, on the first day after
          each month, quarter or year ends. Open it with your calendar to add the events. Your calendar
          can&apos;t see DotAmi, so it reminds you whether or not your figures are already in. The file
          holds only those general words: no amounts and no idea names. A calendar that syncs online
          shares them with the company that runs it.
        </p>
      </div>
    </fieldset>
  );
}
