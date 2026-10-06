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
});
