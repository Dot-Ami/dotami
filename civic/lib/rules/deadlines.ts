import { daysBetween } from "../dates";
import type { ActionRoute, Deadline } from "../model";

/**
 * When a date may be shown as something to act on.
 *
 * A deadline is "open" only if it is still ahead AND someone checked it against its source within
 * the last VERIFICATION_MAX_AGE_DAYS days. Ahead but not checked recently (or never) is
 * "check-date": shown, with a plain warning, but never as a current deadline. Passed is "closed".
 *
 * `today` is passed in, never read from the clock here: the demo passes its own clock (it runs on
 * a fictional 2030 timeline), and a real deployment would pass the real date.
 */
export const VERIFICATION_MAX_AGE_DAYS = 14;

export type DeadlineState = "open" | "check-date" | "closed";

export interface DeadlineCheck {
  state: DeadlineState;
  daysLeft: number;
  /** Days since it was last checked against its source; null if it never was. */
  checkedDaysAgo: number | null;
}

export function checkDeadline(deadline: Deadline, today: string): DeadlineCheck {
  const daysLeft = daysBetween(today, deadline.date);
  const checkedDaysAgo = deadline.lastVerifiedOn
    ? daysBetween(deadline.lastVerifiedOn, today)
    : null;
  if (daysLeft < 0) return { state: "closed", daysLeft, checkedDaysAgo };
  // A check dated after "today" can't have happened yet: treat it as no check at all.
  const recentlyChecked =
    checkedDaysAgo !== null && checkedDaysAgo >= 0 && checkedDaysAgo <= VERIFICATION_MAX_AGE_DAYS;
  return { state: recentlyChecked ? "open" : "check-date", daysLeft, checkedDaysAgo };
}

/** Routes whose deadline can be shown as a current, verified date to act by. */
export function actionableNow(routes: ActionRoute[], today: string): ActionRoute[] {
  return routes.filter(
    (route) => route.deadline && checkDeadline(route.deadline, today).state === "open",
  );
}
