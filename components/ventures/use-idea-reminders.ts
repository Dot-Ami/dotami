"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { withDismissal } from "@/lib/figures/reminder";
import { loadSetting, saveSetting } from "@/lib/settings/client";
import type { FigureRemindersValue, ReminderDismissal } from "@/lib/settings/values";

/**
 * [8e] The "Figure reminders" setting as the ideas page and the cockpit use it: which ideas have
 * their "Remind me about this idea" switch on, which cadences are ticked, and which banners the
 * person has answered "Not this time". All three live inside the one setting (`ideaIds`,
 * `cadences`, `dismissed`), not on the idea, so an idea that is later removed leaves nothing
 * behind that can fail: a card for an id that matches no idea is simply never drawn.
 *
 * `ids`, `cadences` and `dismissed` are null until the setting has been read, and stay null when
 * it couldn't be (the switches are then switched off rather than showing "off" when that may not
 * be true, and no banner is drawn rather than a wrong one).
 *
 * A switch flips on screen at once; the save follows. Saves are sent one after another, each
 * carrying the whole list as it stands when it is sent, so quick flips on different cards can't
 * overwrite each other. A save that fails puts the screen back to what the app last confirmed.
 * This hook only ever sends the one key it is changing (`ideaIds` or `dismissed`), so it can't
 * undo a cadence the person ticked on the Settings page.
 */
export function useIdeaReminders() {
  const [value, setValue] = useState<FigureRemindersValue | null>(null);
  // Which part of the setting the last failed save was changing, so each screen words its own message.
  const [failedKey, setFailedKey] = useState<"ideaIds" | "dismissed" | null>(null);
  // What is on screen (ahead of the app while a save is in flight) and what the app last confirmed.
  const current = useRef<FigureRemindersValue | null>(null);
  const confirmed = useRef<FigureRemindersValue | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // Saves started and not yet answered; a re-read must not overwrite the screen while any are.
  const inFlight = useRef(0);

  const read = useCallback(() => {
    void loadSetting("figure-reminders").then((fresh) => {
      if (!fresh || inFlight.current > 0) return;
      current.current = fresh;
      confirmed.current = fresh;
      setValue(fresh);
    });
  }, []);

  useEffect(() => {
    read();
    // The browser's Back/Forward buttons can bring a page back from memory, and a window can sit
    // open while the person changes the Settings page; read again whenever the page comes back
    // into view so a banner never goes by a choice that has since changed.
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("pageshow", read);
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", read);
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [read]);

  /** Puts a new list for one key of the setting on screen now and queues its save. */
  const change = useCallback(<K extends "ideaIds" | "dismissed">(key: K, next: FigureRemindersValue[K]) => {
    const before = current.current;
    if (before === null) return;
    const shown = { ...before, [key]: next };
    current.current = shown;
    setValue(shown);
    setFailedKey(null);

    inFlight.current += 1;
    queue.current = queue.current.then(async () => {
      // The list as it stands when this save goes out, so a change made while an earlier save was
      // in flight is carried by this one rather than lost.
      const sending = (current.current ?? shown)[key];
      const saved = await saveSetting("figure-reminders", { [key]: sending } as Partial<FigureRemindersValue>);
      inFlight.current -= 1;
      if (saved) {
        confirmed.current = saved;
        // Show what the app holds now, unless another change has been made since this was sent.
        if (inFlight.current === 0) {
          current.current = saved;
          setValue(saved);
        }
      } else {
        current.current = confirmed.current;
        setValue(confirmed.current);
        setFailedKey(key);
      }
    });
  }, []);

  const setReminder = useCallback(
    (ideaId: string, on: boolean) => {
      const before = current.current?.ideaIds;
      if (!before) return;
      change("ideaIds", on ? (before.includes(ideaId) ? before : [...before, ideaId]) : before.filter((id) => id !== ideaId));
    },
    [change],
  );

  /** "Not this time": hides one idea's banner for one period; `today` lets the stale entries go. */
  const dismiss = useCallback(
    (dismissal: ReminderDismissal, today: string) => {
      const before = current.current?.dismissed;
      if (!before) return;
      change("dismissed", withDismissal(before, dismissal, today));
    },
    [change],
  );

  return {
    ids: value ? value.ideaIds : null,
    cadences: value ? value.cadences : null,
    dismissed: value ? value.dismissed : null,
    /** A switch could not be saved. */
    failed: failedKey === "ideaIds",
    /** "Not this time" could not be saved. */
    dismissFailed: failedKey === "dismissed",
    setReminder,
    dismiss,
  };
}
