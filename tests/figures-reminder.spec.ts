import { describe, expect, it } from "vitest";

import {
  REMINDER_FIGURE_KIND,
  describeReminder,
  describeWaiting,
  dueReminders,
  periodIsCovered,
  pruneDismissals,
  withDismissal,
  type ReminderFigure,
} from "@/lib/figures/reminder";
import { lastEndedPeriod } from "@/lib/figures/age";
import { MAX_DISMISSALS, type ReminderCadence, type ReminderDismissal } from "@/lib/settings/values";

/**
 * [8e] Which reminder banners are due. The function takes "today" as an argument, so every case
 * here pins its own day; nothing reads the clock. Only dates and statuses go in — a figure's
 * amount never reaches this code, so there is none to leak into a banner.
 */

const IDEA = "idea-one";
const OTHER = "idea-two";

/** A figure of the reminder's kind; the status defaults to agreed. */
function figure(periodStart: string, periodEnd: string, status: ReminderFigure["status"] = "confirmed"): ReminderFigure {
  return { kind: REMINDER_FIGURE_KIND, periodStart, periodEnd, status };
}

function setting(
  cadences: ReminderCadence[],
  ideaIds: string[] = [IDEA],
  dismissed: ReminderDismissal[] = [],
) {
  return { cadences, ideaIds, dismissed };
}

describe("dueReminders — switches and ticks", () => {
  it("is empty when nothing is ticked, or when the idea's switch is off", () => {
    expect(dueReminders({ ideaId: IDEA, today: "2026-10-07", setting: setting([]), figures: [] })).toEqual([]);
    expect(dueReminders({ ideaId: IDEA, today: "2026-10-07", setting: setting(["monthly"], [OTHER]), figures: [] })).toEqual([]);
    expect(dueReminders({ ideaId: IDEA, today: "2026-10-07", setting: setting(["monthly"], []), figures: [] })).toEqual([]);
  });

  it("gives one banner per ticked cadence, in the order monthly, quarterly, yearly", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2026-10-07", setting: setting(["monthly", "quarterly", "yearly"]), figures: [] });
    expect(due.map((d) => [d.cadence, d.period.label])).toEqual([
      ["monthly", "September 2026"],
      ["quarterly", "July to September 2026"],
      ["yearly", "2025"],
    ]);
  });

  it("only asks about the cadences that are ticked", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2026-10-07", setting: setting(["quarterly"]), figures: [] });
    expect(due.map((d) => d.cadence)).toEqual(["quarterly"]);
  });

  it("says nothing for a day it can't read", () => {
    expect(dueReminders({ ideaId: IDEA, today: "not-a-day", setting: setting(["monthly"]), figures: [] })).toEqual([]);
  });
});

describe("dueReminders — the period edges", () => {
  const monthly = setting(["monthly"]);

  it("the last day of a month is still inside that month, so the reminder is about the month before", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2026-09-30", setting: monthly, figures: [] });
    expect(due[0].period.label).toBe("August 2026");
  });

  it("the day after a month ends, that month is the one asked about", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2026-10-01", setting: monthly, figures: [] });
    expect(due[0].period).toEqual({ start: "2026-09-01", end: "2026-09-30", label: "September 2026" });
  });

  it("December to January: on 1 January the old year's last month, quarter and year are the ones asked about", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2027-01-01", setting: setting(["monthly", "quarterly", "yearly"]), figures: [] });
    expect(due.map((d) => d.period.label)).toEqual(["December 2026", "October to December 2026", "2026"]);
    expect(due.map((d) => d.period.end)).toEqual(["2026-12-31", "2026-12-31", "2026-12-31"]);
  });

  it("31 December is still inside the year: the year asked about is the one before", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2026-12-31", setting: setting(["yearly", "quarterly"]), figures: [] });
    // Listed in the order the setting holds them (yearly first here), not sorted.
    expect(due.map((d) => d.period.label)).toEqual(["2025", "July to September 2026"]);
  });

  it("a leap February ends on the 29th", () => {
    const due = dueReminders({ ideaId: IDEA, today: "2028-03-01", setting: monthly, figures: [] });
    expect(due[0].period).toEqual({ start: "2028-02-01", end: "2028-02-29", label: "February 2028" });
  });
});

describe("dueReminders — what covers a period", () => {
  const quarterAndMonth = setting(["monthly", "quarterly"]);
  const today = "2026-10-07"; // asks about September 2026 and July to September 2026

  it("an agreed figure for exactly the period silences that cadence only", () => {
    const due = dueReminders({ ideaId: IDEA, today, setting: quarterAndMonth, figures: [figure("2026-09-01", "2026-09-30")] });
    expect(due.map((d) => d.cadence)).toEqual(["quarterly"]);
  });

  it("a quarterly figure covers the quarter but NOT each of its months for a monthly reminder", () => {
    const due = dueReminders({ ideaId: IDEA, today, setting: quarterAndMonth, figures: [figure("2026-07-01", "2026-09-30")] });
    expect(due.map((d) => d.cadence)).toEqual(["monthly"]);
  });

  it("a yearly figure covers neither a month nor a quarter inside it", () => {
    const due = dueReminders({ ideaId: IDEA, today, setting: quarterAndMonth, figures: [figure("2026-01-01", "2026-12-31")] });
    expect(due.map((d) => d.cadence)).toEqual(["monthly", "quarterly"]);
  });

  it("three agreed monthly figures cover the quarter; one month of it does not", () => {
    const quarterly = setting(["quarterly"]);
    const oneMonth = [figure("2026-09-01", "2026-09-30")];
    const allThree = [figure("2026-07-01", "2026-07-31"), figure("2026-08-01", "2026-08-31"), figure("2026-09-01", "2026-09-30")];
    expect(dueReminders({ ideaId: IDEA, today, setting: quarterly, figures: oneMonth })).toHaveLength(1);
    expect(dueReminders({ ideaId: IDEA, today, setting: quarterly, figures: allThree })).toEqual([]);
  });

  it("a gap between figures leaves the period uncovered, and overlaps are fine", () => {
    const quarterly = setting(["quarterly"]);
    const gap = [figure("2026-07-01", "2026-07-31"), figure("2026-08-02", "2026-09-30")];
    const overlap = [figure("2026-07-01", "2026-08-15"), figure("2026-08-10", "2026-09-30")];
    expect(dueReminders({ ideaId: IDEA, today, setting: quarterly, figures: gap })).toHaveLength(1);
    expect(dueReminders({ ideaId: IDEA, today, setting: quarterly, figures: overlap })).toEqual([]);
  });

  it("a figure that stops a day short of the period's end does not cover it", () => {
    const due = dueReminders({ ideaId: IDEA, today, setting: setting(["monthly"]), figures: [figure("2026-09-01", "2026-09-29")] });
    expect(due).toHaveLength(1);
  });

  it("a figure that spills over the period's edge is not inside it, so it does not cover it", () => {
    const due = dueReminders({ ideaId: IDEA, today, setting: setting(["monthly"]), figures: [figure("2026-08-15", "2026-09-30")] });
    expect(due).toHaveLength(1);
  });

  it("a proposed, retracted or discarded figure never covers", () => {
    for (const status of ["proposed", "retracted", "discarded"] as const) {
      const due = dueReminders({ ideaId: IDEA, today, setting: setting(["monthly"]), figures: [figure("2026-09-01", "2026-09-30", status)] });
      expect(due, status).toHaveLength(1);
    }
  });

  it("is counted per kind: a figure of another kind does not silence the revenue reminder", () => {
    // Cast: only one kind exists today; a future yearly-tax-total kind must behave like this one.
    const other = { ...figure("2026-09-01", "2026-09-30"), kind: "t2125-total" } as unknown as ReminderFigure;
    expect(dueReminders({ ideaId: IDEA, today, setting: setting(["monthly"]), figures: [other] })).toHaveLength(1);
  });

  it("ignores a figure with unreadable or backwards dates", () => {
    const bad = [figure("2026-09-31", "2026-09-30"), figure("2026-09-30", "2026-09-01")];
    expect(dueReminders({ ideaId: IDEA, today, setting: setting(["monthly"]), figures: bad })).toHaveLength(1);
  });

  it("another idea's figures are the page's business: only the figures handed in are read", () => {
    // The caller passes one idea's figures; nothing here knows about any other idea.
    expect(dueReminders({ ideaId: OTHER, today, setting: setting(["monthly"], [OTHER]), figures: [] })).toHaveLength(1);
  });
});

describe("dueReminders — proposals waiting", () => {
  it("counts proposals inside the period separately and still shows the banner", () => {
    const due = dueReminders({
      ideaId: IDEA,
      today: "2026-10-07",
      setting: setting(["monthly"]),
      figures: [
        figure("2026-09-01", "2026-09-30", "proposed"),
        figure("2026-09-01", "2026-09-15", "proposed"),
        figure("2026-08-01", "2026-08-31", "proposed"), // another month: not this reminder's business
        figure("2026-09-01", "2026-09-30", "discarded"),
      ],
    });
    expect(due).toHaveLength(1);
    expect(due[0].waiting).toBe(2);
  });

  it("says how many are waiting without a number that isn't a count", () => {
    expect(describeWaiting(1)).toBe("1 figure waiting for you to agree");
    expect(describeWaiting(3)).toBe("3 figures waiting for you to agree");
  });
});

describe("dueReminders — Not this time", () => {
  const today = "2026-10-07";
  const september: ReminderDismissal = { ideaId: IDEA, cadence: "monthly", periodEnd: "2026-09-30" };

  it("hides that idea's reminder for that period, and only that one", () => {
    const hidden = dueReminders({ ideaId: IDEA, today, setting: setting(["monthly", "quarterly"], [IDEA, OTHER], [september]), figures: [] });
    expect(hidden.map((d) => d.cadence)).toEqual(["quarterly"]);
    const other = dueReminders({ ideaId: OTHER, today, setting: setting(["monthly"], [IDEA, OTHER], [september]), figures: [] });
    expect(other.map((d) => d.cadence)).toEqual(["monthly"]);
  });

  it("comes back once the next period of that cadence has ended", () => {
    const s = setting(["monthly"], [IDEA], [september]);
    expect(dueReminders({ ideaId: IDEA, today: "2026-10-31", setting: s, figures: [] })).toEqual([]);
    const next = dueReminders({ ideaId: IDEA, today: "2026-11-01", setting: s, figures: [] });
    expect(next.map((d) => d.period.label)).toEqual(["October 2026"]);
  });

  it("a dismissal of one cadence does not hide another cadence with the same end day", () => {
    // 2026-09-30 ends both September and the third quarter.
    const due = dueReminders({ ideaId: IDEA, today, setting: setting(["quarterly"], [IDEA], [september]), figures: [] });
    expect(due).toHaveLength(1);
  });
});

describe("periodIsCovered", () => {
  it("is false with no figures at all", () => {
    expect(periodIsCovered(lastEndedPeriod("2026-10-07", "monthly"), [])).toBe(false);
  });
});

describe("pruneDismissals and withDismissal", () => {
  const today = "2026-10-07";
  const current: ReminderDismissal = { ideaId: IDEA, cadence: "monthly", periodEnd: "2026-09-30" };
  const stale: ReminderDismissal = { ideaId: IDEA, cadence: "monthly", periodEnd: "2026-08-31" };

  it("drops dismissals for periods that are no longer the latest", () => {
    expect(pruneDismissals([stale, current], today)).toEqual([current]);
  });

  it("adds a dismissal once and drops the stale ones while it does", () => {
    expect(withDismissal([stale], current, today)).toEqual([current]);
    expect(withDismissal([current], current, today)).toEqual([current]);
  });

  it("keeps other ideas' current dismissals", () => {
    const theirs: ReminderDismissal = { ideaId: OTHER, cadence: "yearly", periodEnd: "2025-12-31" };
    expect(withDismissal([theirs], current, today)).toEqual([theirs, current]);
  });

  it("never grows past what the setting accepts", () => {
    const many = Array.from({ length: MAX_DISMISSALS }, (_, i) => ({ ideaId: `i${i}`, cadence: "monthly" as const, periodEnd: "2026-09-30" }));
    expect(withDismissal(many, current, today)).toHaveLength(MAX_DISMISSALS);
    expect(withDismissal(many, current, today).at(-1)).toEqual(current);
  });
});

describe("the words", () => {
  it("names the period and the idea and mentions no amount", () => {
    const text = describeReminder(lastEndedPeriod("2026-10-07", "quarterly"), "Invented Bakery");
    expect(text).toBe("July to September 2026 ended and your figures for Invented Bakery don't cover it");
    expect(text).not.toMatch(/\$|\d,\d{3}/);
  });

  it("labels the three cadences the way the plan asks", () => {
    expect(lastEndedPeriod("2026-10-07", "monthly").label).toBe("September 2026");
    expect(lastEndedPeriod("2026-10-07", "yearly").label).toBe("2025");
  });
});
