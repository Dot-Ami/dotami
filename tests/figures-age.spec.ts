import { afterEach, describe, expect, it } from "vitest";

import {
  daysBetween,
  describeAge,
  describeFigureDates,
  describeFuture,
  isFuture,
  lastEndedPeriod,
  localDay,
  monthsBetween,
  msUntilLocalMidnight,
} from "@/lib/figures/age";

/**
 * [8e] How old a figure is. Every helper works on calendar days written YYYY-MM-DD, never on a
 * Date built from one: `new Date("2026-03-31")` is midnight UTC, which is still March 30 for
 * anyone west of Greenwich. The tests run the same arithmetic under several time zones to prove
 * that nothing leans on the computer's own zone.
 */

const ZONES = ["UTC", "America/Vancouver", "America/St_Johns", "Asia/Tokyo", "Pacific/Auckland"];
const originalZone = process.env.TZ;
afterEach(() => {
  if (originalZone === undefined) delete process.env.TZ;
  else process.env.TZ = originalZone;
});

describe("localDay — the person's own calendar day for a moment in time", () => {
  // 06:30 UTC on 1 April is 11:30 p.m. on 31 March in Vancouver (PDT, UTC-7), already April
  // 1 in St. John's (UTC-2:30), Toronto and Tokyo.
  const instant = "2026-04-01T06:30:00Z";

  it("gives the day in the zone asked for, not the UTC day", () => {
    expect(localDay(instant, "America/Vancouver")).toBe("2026-03-31");
    expect(localDay(instant, "America/St_Johns")).toBe("2026-04-01");
    expect(localDay(instant, "America/Toronto")).toBe("2026-04-01");
    expect(localDay(instant, "Asia/Tokyo")).toBe("2026-04-01");
    expect(localDay(instant, "UTC")).toBe("2026-04-01");
  });

  it("is the day the retracted line used to get wrong: 04:00Z on Oct 7 is still Oct 6 in Edmonton", () => {
    expect(localDay("2026-10-07T04:00:00Z", "America/Edmonton")).toBe("2026-10-06");
    // What `retractedAt.slice(0, 10)` printed before this story.
    expect("2026-10-07T04:00:00Z".slice(0, 10)).toBe("2026-10-07");
  });

  it("uses the computer's own zone when none is given", () => {
    process.env.TZ = "America/Vancouver";
    expect(localDay(instant)).toBe("2026-03-31");
    process.env.TZ = "Asia/Tokyo";
    expect(localDay(instant)).toBe("2026-04-01");
  });

  it("takes a Date or a number of milliseconds as well as an ISO string", () => {
    expect(localDay(new Date(instant), "America/Vancouver")).toBe("2026-03-31");
    expect(localDay(Date.parse(instant), "America/Vancouver")).toBe("2026-03-31");
  });

  it("says nothing rather than guessing when it can't read the moment or the zone", () => {
    expect(localDay("not a date", "UTC")).toBeNull();
    expect(localDay(Number.NaN, "UTC")).toBeNull();
    expect(localDay(instant, "Not/AZone")).toBeNull();
  });
});

describe("isFuture", () => {
  it("is true only when the period ends after today", () => {
    expect(isFuture("2026-10-31", "2026-10-06")).toBe(true);
    expect(isFuture("2026-10-07", "2026-10-06")).toBe(true);
    expect(isFuture("2026-10-06", "2026-10-06")).toBe(false);
    expect(isFuture("2026-09-30", "2026-10-06")).toBe(false);
  });

  it("compares across a year end as days, not as text of different lengths", () => {
    expect(isFuture("2027-01-01", "2026-12-31")).toBe(true);
    expect(isFuture("2026-12-31", "2027-01-01")).toBe(false);
  });
});

describe("monthsBetween — whole calendar months, the last day of a month counting as its end", () => {
  it("March 31 to April 30 is one month, and January 31 to February 28 is one", () => {
    expect(monthsBetween("2026-03-31", "2026-04-30")).toBe(1);
    expect(monthsBetween("2026-01-31", "2026-02-28")).toBe(1);
    // A year with a February 29: the 31st still lands on the month's last day.
    expect(monthsBetween("2028-01-31", "2028-02-29")).toBe(1);
  });

  it("the leap day works: Feb 29 2028 to Mar 29 2028 is one month, and to Feb 28 2029 is twelve", () => {
    expect(monthsBetween("2028-02-29", "2028-03-29")).toBe(1);
    expect(monthsBetween("2028-02-29", "2028-03-28")).toBe(0);
    expect(monthsBetween("2028-02-29", "2029-02-28")).toBe(12);
  });

  it("December to January crosses the year", () => {
    expect(monthsBetween("2025-12-31", "2026-01-31")).toBe(1);
    expect(monthsBetween("2025-12-15", "2026-01-14")).toBe(0);
    expect(monthsBetween("2025-12-15", "2026-01-15")).toBe(1);
    expect(monthsBetween("2024-12-31", "2026-03-31")).toBe(15);
  });

  it("is not a day count divided by thirty", () => {
    // 28 days: a day-count rule would say 0; both ends are month-ends, so it is one month.
    expect(monthsBetween("2026-01-31", "2026-02-28")).toBe(1);
    // 60 days, which a day-count rule would call two months. Sep 29 is a day short of the
    // second month-end (Sep 30), so it is one month; Sep 30 makes two.
    expect(monthsBetween("2026-07-31", "2026-09-29")).toBe(1);
    expect(monthsBetween("2026-07-31", "2026-09-30")).toBe(2);
  });

  it("counts the months a figure's age is read in: end of March to the start of October is six", () => {
    expect(monthsBetween("2026-03-31", "2026-10-06")).toBe(6);
  });

  it("reads backwards as a negative count", () => {
    expect(monthsBetween("2026-04-30", "2026-03-31")).toBe(-1);
    expect(monthsBetween("2026-10-06", "2026-10-06")).toBe(0);
  });

  it("gives the same answer whatever zone the computer is in", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(monthsBetween("2026-03-31", "2026-04-30"), zone).toBe(1);
      expect(monthsBetween("2026-03-31", "2026-10-06"), zone).toBe(6);
    }
  });
});

describe("daysBetween", () => {
  it("counts calendar days, across month ends, leap days and year ends", () => {
    expect(daysBetween("2026-09-30", "2026-10-06")).toBe(6);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
    expect(daysBetween("2026-10-06", "2026-10-06")).toBe(0);
    expect(daysBetween("2026-10-06", "2026-09-30")).toBe(-6);
  });

  it("is not thrown by the days a clock change adds or removes", () => {
    // 2026-03-08 has 23 hours in Vancouver (clocks go forward), 2026-11-01 has 25.
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(daysBetween("2026-03-07", "2026-03-09"), zone).toBe(2);
      expect(daysBetween("2026-10-31", "2026-11-02"), zone).toBe(2);
    }
  });
});

describe("describeAge — whole sentences, from the figure's own last day", () => {
  const today = "2026-10-06";

  it("says how many whole months ago a period ended", () => {
    expect(describeAge("2026-03-31", today)).toBe("ended 6 months ago");
    expect(describeAge("2025-09-30", today)).toBe("ended 12 months ago");
    expect(describeAge("2024-12-31", today)).toBe("ended 21 months ago");
  });

  it("says 'last month' for one month and days for under a month", () => {
    expect(describeAge("2026-09-06", today)).toBe("ended last month");
    expect(describeAge("2026-09-30", today)).toBe("ended 6 days ago");
    expect(describeAge("2026-10-05", today)).toBe("ended yesterday");
    expect(describeAge("2026-09-07", today)).toBe("ended 29 days ago");
  });

  it("says 'ends today' for a period whose last day is today — not '0 months ago', not future", () => {
    expect(describeAge("2026-10-06", today)).toBe("ends today");
  });

  it("says when a period that hasn't ended will", () => {
    expect(describeAge("2026-10-07", today)).toBe("ends tomorrow");
    expect(describeAge("2026-10-31", today)).toBe("ends in 25 days");
    expect(describeAge("2027-01-06", today)).toBe("ends in 3 months");
  });

  it("gives nothing for a day it can't read", () => {
    expect(describeAge("soon", today)).toBe("");
    expect(describeAge("2026-10-06", "")).toBe("");
  });

  it("reads the same under every zone", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      expect(describeAge("2026-03-31", today), zone).toBe("ended 6 months ago");
      expect(describeAge("2026-10-06", today), zone).toBe("ends today");
    }
  });
});

describe("describeFigureDates — the line under a figure", () => {
  // The agreed moment is 11:30 p.m. on March 31 in Vancouver but already April 1 in UTC.
  const agreedAt = "2026-04-01T06:30:00Z";

  it("puts the age and the person's own agreed day together", () => {
    expect(describeFigureDates("2026-03-31", "2026-03-31", agreedAt, "America/Vancouver")).toBe("ends today · agreed 2026-03-31");
    expect(describeFigureDates("2026-03-31", "2026-10-06", agreedAt, "America/Vancouver")).toBe("ended 6 months ago · agreed 2026-03-31");
    // The same moment, one zone east: the day really does differ, so the line must follow the zone.
    expect(describeFigureDates("2026-03-31", "2026-10-06", agreedAt, "Asia/Tokyo")).toBe("ended 6 months ago · agreed 2026-04-01");
  });

  it("shows only the age for a figure that hasn't been agreed to yet (the agree prompt)", () => {
    expect(describeFigureDates("2026-03-31", "2026-10-06", null)).toBe("ended 6 months ago");
  });

  it("drops the agreed day, not the age, when the timestamp can't be read", () => {
    expect(describeFigureDates("2026-03-31", "2026-10-06", "garbage")).toBe("ended 6 months ago");
  });
});

describe("describeFuture — the flag on a period that ends after today", () => {
  it("names both days and says what it means for the cards", () => {
    expect(describeFuture("2026-10-31", "2026-10-06")).toBe(
      "Check this date. This period ends after today (2026-10-31 is later than 2026-10-06), so no card counts it until it has ended.",
    );
  });
});

describe("lastEndedPeriod — the month, quarter or year that most recently ended", () => {
  it("monthly: on Oct 1 it is September, on Sept 30 (September's last day) it is still August", () => {
    expect(lastEndedPeriod("2026-10-01", "monthly")).toEqual({ start: "2026-09-01", end: "2026-09-30", label: "September 2026" });
    expect(lastEndedPeriod("2026-09-30", "monthly")).toEqual({ start: "2026-08-01", end: "2026-08-31", label: "August 2026" });
  });

  it("monthly: January looks back into the old year, and February knows its length", () => {
    expect(lastEndedPeriod("2026-01-15", "monthly")).toEqual({ start: "2025-12-01", end: "2025-12-31", label: "December 2025" });
    expect(lastEndedPeriod("2028-03-02", "monthly")).toEqual({ start: "2028-02-01", end: "2028-02-29", label: "February 2028" });
  });

  it("quarterly: Oct 1 gives July to September; Sept 30 gives April to June", () => {
    expect(lastEndedPeriod("2026-10-01", "quarterly")).toEqual({ start: "2026-07-01", end: "2026-09-30", label: "July to September 2026" });
    expect(lastEndedPeriod("2026-09-30", "quarterly")).toEqual({ start: "2026-04-01", end: "2026-06-30", label: "April to June 2026" });
    expect(lastEndedPeriod("2026-02-10", "quarterly")).toEqual({ start: "2025-10-01", end: "2025-12-31", label: "October to December 2025" });
  });

  it("yearly: the calendar year before today's", () => {
    expect(lastEndedPeriod("2026-10-06", "yearly")).toEqual({ start: "2025-01-01", end: "2025-12-31", label: "2025" });
    expect(lastEndedPeriod("2026-01-01", "yearly")).toEqual({ start: "2025-01-01", end: "2025-12-31", label: "2025" });
  });
});

describe("msUntilLocalMidnight", () => {
  it("is the time left until the clock on the wall reads 00:00 tomorrow", () => {
    process.env.TZ = "America/Vancouver";
    expect(msUntilLocalMidnight(new Date(2026, 6, 15, 23, 59, 30))).toBe(30_000);
    expect(msUntilLocalMidnight(new Date(2026, 6, 15, 0, 0, 0))).toBe(24 * 60 * 60 * 1000);
  });

  it("lands on a local midnight in any zone", () => {
    for (const zone of ZONES) {
      process.env.TZ = zone;
      const now = new Date(2026, 9, 6, 14, 20, 5);
      const then = new Date(now.getTime() + msUntilLocalMidnight(now));
      expect([then.getFullYear(), then.getMonth(), then.getDate(), then.getHours(), then.getMinutes()], zone).toEqual([2026, 9, 7, 0, 0]);
    }
  });
});
