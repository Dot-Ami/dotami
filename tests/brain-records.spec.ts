import { describe, expect, it } from "vitest";

import { evaluateProfile } from "@/lib/brain";
import type { ConfirmedFigure, EvaluationProfile } from "@/lib/brain";
import { readRevenue } from "@/lib/brain/records";

/**
 * [8a] Confirmed figures and the GST/HST small-supplier card: a figure beats an estimate where it
 * settles the rule; a partial set of figures says how far it got and leaves the estimate deciding;
 * nothing is split, converted, or added twice.
 *
 * TODAY is in October–December 2026, so the four complete quarters before it run from
 * October 2025 to September 2026.
 */
const TODAY = "2026-10-06";

const baseProfile: EvaluationProfile = {
  goals: [],
  ventureType: "service",
  activityTags: [],
  province: "ON",
  employmentStatus: "employee",
  structure: "sole-prop",
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  hireFirst: false,
  capitalPurchasePlanned: false,
};

let n = 0;
function fig(periodStart: string, periodEnd: string, dollars: number, extra: Partial<ConfirmedFigure> = {}): ConfirmedFigure {
  n += 1;
  return {
    id: `f${n}`,
    kind: "gross-revenue",
    periodStart,
    periodEnd,
    amountCents: Math.round(dollars * 100),
    currency: "CAD",
    sourceLabel: "typed by you",
    sourceRows: null,
    ...extra,
  };
}

const QUARTERS = [
  ["2025-10-01", "2025-12-31"],
  ["2026-01-01", "2026-03-31"],
  ["2026-04-01", "2026-06-30"],
  ["2026-07-01", "2026-09-30"],
] as const;

const gstCard = (targetRevenueY1: number, figures?: ConfirmedFigure[]) => {
  const result = evaluateProfile({ ...baseProfile, targetRevenueY1 }, { today: TODAY, figures });
  return { card: result.unlocks.find((u) => u.id === "compliance-gst-small-supplier")!, nodes: result.nodeStates };
};

describe("confirmed figures on the GST/HST card", () => {
  it("changes nothing when there are no figures", () => {
    for (const revenue of [0, 25_000, 45_000]) {
      const withEmpty = evaluateProfile({ ...baseProfile, targetRevenueY1: revenue }, { today: TODAY, figures: [] });
      const without = evaluateProfile({ ...baseProfile, targetRevenueY1: revenue }, { today: TODAY });
      expect(withEmpty).toEqual(without);
    }
  });

  it("one confirmed quarter over $30,000 moves the card, whatever the estimate says — with its source", () => {
    const before = gstCard(10_000);
    expect(before.card.state).toBe("green");
    expect(before.card.fromRecords).toBeUndefined();

    const after = gstCard(10_000, [fig("2026-07-01", "2026-09-30", 31_200, { sourceLabel: "sales-2026.xlsx", sourceRows: 412 })]);
    expect(after.card.state).toBe("yellow");
    expect(after.card.why).toContain("July to September 2026 is $31,200 — over $30,000 in a single calendar quarter");
    expect(after.card.fromRecords).toEqual({
      summary: "From your records · 1 figure · 412 rows",
      figureIds: [expect.any(String)],
      sources: [{ label: "sales-2026.xlsx", rows: 412 }],
      // [8e] How recent the figures are, and what they leave out.
      newestPeriodEnd: "2026-09-30",
      uncoveredQuarters: ["April to June 2026", "January to March 2026", "October to December 2025"],
      notes: ["Newest figure ends September 30, 2026.", "April to June 2026 and 2 earlier quarters aren't fully covered yet."],
    });
    expect(after.nodes["stage-2b-mandatory-gst-registration"]).toBe("green");
  });

  it("a complete year of figures under the line beats an estimate over it", () => {
    const figures = QUARTERS.map(([s, e]) => fig(s, e, 6_850));
    const { card, nodes } = gstCard(45_000, figures);
    // Estimate alone: "crosses" (45,000 > 30,000). The person's own four quarters: $27,400.
    expect(card.why).toContain("October 2025 to September 2026 is $27,400 — approaching $30,000");
    expect(card.why).not.toContain("Y1 revenue target");
    expect(card.state).toBe("yellow");
    expect(card.fromRecords?.summary).toBe("From your records · 4 figures");
    expect(nodes["stage-2b-mandatory-gst-registration"]).toBe("yellow");
  });

  it("well under the line, a complete year turns the card green", () => {
    const { card } = gstCard(45_000, QUARTERS.map(([s, e]) => fig(s, e, 2_000)));
    expect(card.state).toBe("green");
    expect(card.why).toContain("is $8,000 — under $30,000");
  });

  it("counts exactly $30,000 as not over (exceed, not reach)", () => {
    const { card, nodes } = gstCard(0, QUARTERS.map(([s, e]) => fig(s, e, 7_500)));
    expect(card.why).toContain("is $30,000 — approaching $30,000");
    expect(nodes["stage-2b-mandatory-gst-registration"]).toBe("yellow");
  });

  it("adds monthly figures into quarters", () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const y = i < 3 ? 2025 : 2026;
      const m = ((i + 9) % 12) + 1;
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
      return fig(`${y}-${String(m).padStart(2, "0")}-01`, `${y}-${String(m).padStart(2, "0")}-${last}`, 2_600, { sourceRows: 10 });
    });
    const { card } = gstCard(0, months);
    expect(card.why).toContain("is $31,200 — over $30,000");
    expect(card.fromRecords?.summary).toBe("From your records · 12 figures · 120 rows");
  });

  it("with only part of the year covered and under the line, leaves the estimate deciding — and says so", () => {
    const { card } = gstCard(45_000, [fig(...QUARTERS[2], 5_000), fig(...QUARTERS[3], 5_000)]);
    expect(card.why).toContain("Y1 revenue target crosses");
    expect(card.why).toContain("Your confirmed figures cover 2 of the last four calendar quarters ($10,000 so far) — not enough to replace the estimate yet.");
    expect(card.fromRecords?.summary).toBe("From your records · 2 figures");
  });

  it("with part of the year already over the line, says 'at least'", () => {
    const { card } = gstCard(0, [fig(...QUARTERS[2], 16_000), fig(...QUARTERS[3], 15_000)]);
    expect(card.why).toContain("is at least $31,000 — over $30,000");
  });

  it("never adds two figures for the same month: that quarter is left out until the person chooses", () => {
    const figures = [...QUARTERS.map(([s, e]) => fig(s, e, 7_000)), fig("2026-03-01", "2026-03-31", 9_000)];
    const read = readRevenue(figures, { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 })!;
    expect(read.conflictMonths).toEqual(["2026-03"]);
    expect(read.window[1]).toMatchObject({ label: "January to March 2026", conflict: true, cents: 0 });
    expect(read.windowComplete).toBe(false);
    const { card } = gstCard(0, figures);
    expect(card.why).toContain("Two figures cover March 2026; that quarter is left out until you choose which one counts.");
  });

  it("doesn't split a year or convert a currency — it lists them as not counted", () => {
    const year = fig("2025-10-01", "2026-09-30", 40_000);
    const usd = fig(...QUARTERS[3], 40_000, { currency: "USD" });
    const read = readRevenue([year, usd], { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 })!;
    expect(read.used).toEqual([]);
    expect(read.notCounted.map((x) => x.reason)).toEqual([
      "it covers 2025-10-01 to 2026-09-30, which isn't one calendar month or quarter",
      "it's in USD — not converted, so not counted",
    ]);
    const { card } = gstCard(0, [year]);
    expect(card.state).toBe("green");
    expect(card.why).toContain("One figure isn't counted: it covers 2025-10-01 to 2026-09-30");
  });

  it("keeps a loss and a zero quarter as they are", () => {
    const read = readRevenue(
      [fig(...QUARTERS[0], -1_200), fig(...QUARTERS[1], 0), fig(...QUARTERS[2], 9_000), fig(...QUARTERS[3], 9_000)],
      { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 },
    )!;
    expect(read.windowComplete).toBe(true);
    expect(read.windowCents).toBe(1_680_000);
  });

  it("ignores figures of other kinds", () => {
    expect(readRevenue([fig(...QUARTERS[3], 99_000, { kind: "net-income" })], { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 })).toBeNull();
  });

  // [8f] Line 8299 is gross income with the GST/HST collected taken back out, a different total from
  // the one the small-supplier test counts; the other three are expenses and net income.
  it.each(["business-gross-income", "business-total-expenses", "business-net-income-before-adjustments", "business-net-income"])(
    "never reads a T2125 total (%s), even one shaped like a quarter over the line",
    (kind) => {
      const over = [fig(...QUARTERS[3], 99_000, { kind })];
      expect(readRevenue(over, { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 })).toBeNull();

      // The card is exactly what the estimate alone gives: no "from your records", nothing over.
      const withFigure = gstCard(10_000, over);
      const without = gstCard(10_000);
      expect(withFigure.card).toEqual(without.card);
      expect(withFigure.card.state).toBe("green");
      expect(withFigure.card.fromRecords).toBeUndefined();
    },
  );
});

// ---- [8e] How old each figure is ------------------------------------------------------------
const WINDOW = { today: TODAY, consecutiveQuarters: 4, thresholdCents: 3_000_000 };

describe("a figure dated after today is never counted", () => {
  // The bug this guards, reproduced on 2026-10-06: an October 2026 figure of $31,200, entered
  // while the computer's clock was wrong, was read as this quarter's revenue and made the card
  // say "over $30,000 in a single calendar quarter" for October to December 2026.
  const future = fig("2026-10-01", "2026-10-31", 31_200);

  it("moves it to 'not counted' with a plain reason, and the quarter stays at zero", () => {
    const read = readRevenue([future], WINDOW)!;
    expect(read.used).toEqual([]);
    expect(read.overSingleQuarter).toBeNull();
    expect(read.current.cents).toBe(0);
    expect(read.notCounted).toEqual([{ figure: future, reason: "it ends after today (2026-10-31) — check its date" }]);
  });

  it("so the card does not say 'over $30,000', and says why the figure was left out", () => {
    const { card, nodes } = gstCard(10_000, [future]);
    expect(card.why).not.toContain("over $30,000 in a single calendar quarter");
    expect(card.state).toBe("green");
    // The picked GST stage is green only when something triggers it; the estimate ($10,000) doesn't.
    expect(nodes["stage-2b-mandatory-gst-registration"]).toBe("yellow");
    expect(card.why).toContain("One figure isn't counted: it ends after today (2026-10-31) — check its date.");
  });

  it("leaves the rest of the read standing", () => {
    const read = readRevenue([future, ...QUARTERS.map(([s, e]) => fig(s, e, 6_850))], WINDOW)!;
    expect(read.windowComplete).toBe(true);
    expect(read.windowCents).toBe(2_740_000);
    expect(read.used).toHaveLength(4);
    expect(read.notCounted.map((x) => x.figure)).toEqual([future]);
  });

  it("counts a period whose last day is today — the day doesn't have to be over for it to have ended", () => {
    const read = readRevenue([fig("2026-10-01", "2026-10-31", 31_200)], { ...WINDOW, today: "2026-10-31" })!;
    expect(read.used).toHaveLength(1);
    expect(read.overSingleQuarter?.label).toBe("October to December 2026");
    expect(read.notCounted).toEqual([]);
  });

  it("gives the date as the reason even when the figure is also in another currency", () => {
    const usd = fig("2026-10-01", "2026-10-31", 31_200, { currency: "USD" });
    expect(readRevenue([usd], WINDOW)!.notCounted[0].reason).toBe("it ends after today (2026-10-31) — check its date");
  });
});

describe("a figure older than the rule reads is listed, not dropped", () => {
  // The rule reads the last four complete calendar quarters plus this one. Before [8e] a figure
  // from October to December 2024 appeared in neither `used` nor `notCounted`.
  const old = fig("2024-10-01", "2024-12-31", 31_200);

  it("puts it in outsideWindow and counts nothing from it", () => {
    const read = readRevenue([old, fig(...QUARTERS[3], 5_000)], WINDOW)!;
    expect(read.outsideWindow).toEqual([old]);
    expect(read.used).toHaveLength(1);
    expect(read.notCounted).toEqual([]);
    expect(read.overSingleQuarter).toBeNull();
  });

  it("draws the line at the first quarter that is read: October to December 2025 is inside, September 2025 is not", () => {
    expect(readRevenue([fig(...QUARTERS[0], 5_000)], WINDOW)!.outsideWindow).toEqual([]);
    expect(readRevenue([fig("2025-09-01", "2025-09-30", 1_000)], WINDOW)!.outsideWindow).toHaveLength(1);
  });

  it("says so on the card, naming the span the rule reads", () => {
    const { card } = gstCard(10_000, [old, fig(...QUARTERS[3], 5_000)]);
    expect(card.fromRecords?.notes).toContain(
      "One older figure isn't read: this rule looks only at the last four complete calendar quarters (October 2025 to September 2026) and the current one.",
    );
  });

  it("counts several: '2 older figures aren't read'", () => {
    const { card } = gstCard(10_000, [old, fig("2023-01-01", "2023-03-31", 100), fig(...QUARTERS[3], 5_000)]);
    expect(card.fromRecords?.notes).toContain(
      "2 older figures aren't read: this rule looks only at the last four complete calendar quarters (October 2025 to September 2026) and the current one.",
    );
  });
});

describe("two overlapping figures that are both older than the rule reads", () => {
  // The same month twice would normally be a conflict. But a month this rule never reads can't
  // make a quarter ambiguous, so [8e] keeps older figures out of the month map: they are listed
  // as older figures and raise no "two figures cover this month" sentence.
  const first = fig("2024-03-01", "2024-03-31", 4_000);
  const second = fig("2024-03-01", "2024-03-31", 9_000);

  it("lists both as outside the window, with no conflict month and nothing counted", () => {
    const read = readRevenue([first, second], WINDOW)!;
    expect(read.outsideWindow).toEqual([first, second]);
    expect(read.conflictMonths).toEqual([]);
    expect(read.window.some((q) => q.conflict)).toBe(false);
    expect(read.used).toEqual([]);
    expect(read.notCounted).toEqual([]);
  });

  it("says nothing about two figures on the card, only that two older figures aren't read", () => {
    const { card } = gstCard(10_000, [first, second]);
    expect(card.why).not.toContain("Two figures cover");
    expect(card.why).not.toContain("until you choose which one counts");
    expect(card.fromRecords?.notes).toContain(
      "2 older figures aren't read: this rule looks only at the last four complete calendar quarters (October 2025 to September 2026) and the current one.",
    );
  });
});

describe("the card says how recent its figures are", () => {
  it("names the day its newest figure ends and the recent quarters it doesn't cover, newest first", () => {
    const { card } = gstCard(10_000, [fig(...QUARTERS[3], 5_000)]);
    expect(card.fromRecords).toMatchObject({
      newestPeriodEnd: "2026-09-30",
      uncoveredQuarters: ["April to June 2026", "January to March 2026", "October to December 2025"],
      notes: ["Newest figure ends September 30, 2026.", "April to June 2026 and 2 earlier quarters aren't fully covered yet."],
    });
  });

  it("says 'isn't fully covered' for one quarter, and counts a quarter with only some of its months in", () => {
    const figures = [QUARTERS[0], QUARTERS[1], QUARTERS[2]].map(([s, e]) => fig(s, e, 5_000));
    figures.push(fig("2026-07-01", "2026-07-31", 1_000));
    const { card } = gstCard(10_000, figures);
    expect(card.fromRecords?.newestPeriodEnd).toBe("2026-07-31");
    expect(card.fromRecords?.uncoveredQuarters).toEqual(["July to September 2026"]);
    expect(card.fromRecords?.notes).toEqual(["Newest figure ends July 31, 2026.", "July to September 2026 isn't fully covered yet."]);
  });

  it("with a whole year in, only the newest end date is named", () => {
    const { card } = gstCard(45_000, QUARTERS.map(([s, e]) => fig(s, e, 6_850)));
    expect(card.fromRecords?.uncoveredQuarters).toEqual([]);
    expect(card.fromRecords?.notes).toEqual(["Newest figure ends September 30, 2026."]);
  });

  it("leaves a quarter out of 'not covered' when it is already explained as a conflict", () => {
    const figures = [...QUARTERS.map(([s, e]) => fig(s, e, 7_000)), fig("2026-03-01", "2026-03-31", 9_000)];
    const { card } = gstCard(0, figures);
    expect(card.fromRecords?.uncoveredQuarters).toEqual([]);
    expect(card.why).toContain("that quarter is left out until you choose which one counts.");
  });

  it("names the newest end among the figures it counted, this quarter's included", () => {
    const figures = [fig(...QUARTERS[3], 5_000), fig("2026-10-01", "2026-10-31", 2_000)];
    const result = evaluateProfile({ ...baseProfile, targetRevenueY1: 0 }, { today: "2026-11-02", figures });
    const card = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier")!;
    expect(card.fromRecords?.newestPeriodEnd).toBe("2026-10-31");
    expect(card.fromRecords?.notes[0]).toBe("Newest figure ends October 31, 2026.");
  });

  it("with nothing counted, names no newest figure", () => {
    const { card } = gstCard(10_000, [fig("2026-10-01", "2026-10-31", 31_200)]);
    expect(card.fromRecords?.newestPeriodEnd).toBeNull();
    expect(card.fromRecords?.notes.some((n) => n.startsWith("Newest figure"))).toBe(false);
  });
});
