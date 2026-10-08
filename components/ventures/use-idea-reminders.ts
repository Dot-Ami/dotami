"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadSetting, saveSetting } from "@/lib/settings/client";

/**
 * [8e] Which ideas have their "Remind me about this idea" switch on. The list lives inside the
 * "Figure reminders" setting (`ideaIds`), not on the idea, so an idea that is later removed leaves
 * nothing behind that can fail: the card for an id that matches no idea is simply never drawn.
 *
 * `ids` is null until the setting has been read, and stays null when it couldn't be (the switches
 * are then switched off rather than showing "off" when that may not be true).
 *
 * A switch flips on screen at once; the save follows. Saves are sent one after another, each
 * carrying the whole list as it stands when it is sent, so quick flips on different cards can't
 * overwrite each other. A save that fails puts the switches back to what the app last confirmed.
 */
export function useIdeaReminders() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const current = useRef<string[] | null>(null);
  const confirmed = useRef<string[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let live = true;
    void loadSetting("figure-reminders").then((value) => {
      if (!live || !value) return;
      current.current = value.ideaIds;
      confirmed.current = value.ideaIds;
      setIds(value.ideaIds);
    });
    return () => {
      live = false;
    };
  }, []);

  const setReminder = useCallback((ideaId: string, on: boolean) => {
    const before = current.current;
    if (before === null) return;
    const next = on ? (before.includes(ideaId) ? before : [...before, ideaId]) : before.filter((id) => id !== ideaId);
    current.current = next;
    setIds(next);
    setFailed(false);

    queue.current = queue.current.then(async () => {
      const sending = current.current ?? [];
      const saved = await saveSetting("figure-reminders", { ideaIds: sending });
      if (saved) {
        confirmed.current = saved.ideaIds;
        // Show what the app holds now, unless another flip has been made since this was sent.
        if (current.current === sending) {
          current.current = saved.ideaIds;
          setIds(saved.ideaIds);
        }
      } else {
        current.current = confirmed.current;
        setIds(confirmed.current);
        setFailed(true);
      }
    });
  }, []);

  return { ids, failed, setReminder };
}
