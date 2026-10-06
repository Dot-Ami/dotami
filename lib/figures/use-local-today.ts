import { useEffect, useState } from "react";

import { localToday, msUntilLocalMidnight } from "./age";

/**
 * [8e] The person's own calendar day, kept up to date while a window stays open.
 *
 * A desktop window can sit open for days. A day read once when the page loaded would go on
 * saying "ends today" and counting the old quarter after midnight or a quarter end, so this
 * reads it again
 *   - when the window comes back into view or gets focus (a laptop that slept doesn't run
 *     timers while it sleeps, so this is the catch-up), and
 *   - at the next local midnight, worked out from the clock rather than polled.
 * The returned day only changes when the day does, so nothing re-renders in between.
 */
export function useLocalToday(): string {
  const [today, setToday] = useState(() => localToday());

  useEffect(() => {
    let timer: number | undefined;

    const refresh = () => {
      setToday(localToday());
      schedule();
    };

    function schedule() {
      window.clearTimeout(timer);
      // At least a second, so a timer that fires a moment early (it can) can't spin.
      timer = window.setTimeout(refresh, Math.max(msUntilLocalMidnight(new Date()), 1000));
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return today;
}
