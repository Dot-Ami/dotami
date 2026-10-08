"use client";

import { useEffect, useRef, useState } from "react";

import { loadSetting, saveSetting } from "@/lib/settings/client";
import { REMINDER_CADENCES, REMINDER_CADENCE_LABELS, type ReminderCadence } from "@/lib/settings/values";

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
    </fieldset>
  );
}
