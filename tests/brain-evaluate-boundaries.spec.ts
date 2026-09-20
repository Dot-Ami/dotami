import { describe, expect, it } from "vitest";

import { evaluateProfile } from "@/lib/brain";
import type { EvaluationProfile } from "@/lib/brain";

const TODAY = "2026-07-02";

/**
 * Boundary golden tests for the evaluator issues found in the 2026-07-04 audit. These pin
 * exact-threshold behavior that's easy to silently regress.
 */

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

describe("GST small-supplier boundary ($30,000) — H3", () => {
  const atRevenue = (targetRevenueY1: number) =>
    evaluateProfile({ ...baseProfile, targetRevenueY1 }, { today: TODAY });

  it("$29,999 (under threshold, in the watch band): compliance yellow, mandatory node yellow", () => {
    const result = atRevenue(29_999);
    const gst = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier");
    expect(gst!.state).toBe("yellow");
    expect(gst!.why).toContain("approaches");
    expect(result.nodeStates["stage-2b-mandatory-gst-registration"]).toBe("yellow");
  });

  it("$30,000 exactly (reached but not exceeded): still a watch state, never a false green", () => {
    const result = atRevenue(30_000);
    const gst = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier");
    expect(gst!.state).toBe("yellow");
    expect(gst!.why).toContain("approaches");
    // CRA's rule is EXCEED, not reach — exactly $30K has not yet triggered mandatory
    // registration, so the picked (mandatory) branch must not claim "green".
    expect(result.nodeStates["stage-2b-mandatory-gst-registration"]).toBe("yellow");
  });

  it("$30,001 (exceeds threshold): compliance and node both flip to the triggered read", () => {
    const result = atRevenue(30_001);
    const gst = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier");
    expect(gst!.state).toBe("yellow"); // registration timing is always a confirm-worthy checkpoint
    expect(gst!.why).toContain("crosses");
    expect(result.nodeStates["stage-2b-mandatory-gst-registration"]).toBe("green");
  });

  it("compliance card and node coloring agree at every point on the boundary", () => {
    for (const revenue of [29_999, 30_000, 30_001]) {
      const result = atRevenue(revenue);
      const gst = result.unlocks.find((u) => u.id === "compliance-gst-small-supplier");
      const triggered = revenue > 30_000;
      expect(gst!.why.includes("crosses")).toBe(triggered);
      expect(result.nodeStates["stage-2b-mandatory-gst-registration"]).toBe(
        triggered ? "green" : "yellow",
      );
    }
  });
});

describe("Class 50 acquiredAfter window — H4", () => {
  const class50Profile: EvaluationProfile = {
    ...baseProfile,
    activityTags: ["Software / SaaS"],
    capitalPurchasePlanned: true,
  };

  it("before the acquisition window opens (2024-04-15): incentive does not apply", () => {
    const result = evaluateProfile(class50Profile, { today: "2023-01-01" });
    const class50 = result.unlocks.find((u) => u.id === "writeoff-cca-class-50");
    expect(class50).toBeDefined();
    expect(class50!.expires).toBeUndefined();
    expect(class50!.payoff).not.toContain("100%");
  });

  it("inside the window (after acquiredAfter, before availableForUseBefore): incentive applies", () => {
    const result = evaluateProfile(class50Profile, { today: "2026-01-01" });
    const class50 = result.unlocks.find((u) => u.id === "writeoff-cca-class-50");
    expect(class50!.state).toBe("yellow");
    expect(class50!.expires).toBe("2027-01-01");
  });

  it("after the window lapses (2027-01-01+): incentive no longer applies", () => {
    const result = evaluateProfile(class50Profile, { today: "2027-01-01" });
    const class50 = result.unlocks.find((u) => u.id === "writeoff-cca-class-50");
    expect(class50!.expires).toBeUndefined();
    expect(class50!.payoff).not.toContain("100%");
  });
});

describe("risk combinations — H2", () => {
  const stackedProfile: EvaluationProfile = {
    ...baseProfile,
    province: "AB",
    activityTags: ["Trades", "Software / SaaS"],
    capitalPurchasePlanned: true,
  };

  it("bumps severity when all combo members are live in the same result", () => {
    const result = evaluateProfile(stackedProfile, { today: TODAY });
    const ids = result.unlocks.map((u) => u.id);
    expect(ids).toEqual(
      expect.arrayContaining(["writeoff-home-office", "writeoff-vehicle", "writeoff-cca-class-50"]),
    );

    const homeOffice = result.unlocks.find((u) => u.id === "writeoff-home-office");
    // Class 50's own professional-required entry is worse than the combo's caution bump,
    // so this asserts against a write-off whose *own* risk entry is exactly "caution" —
    // home office — to confirm the combo participates rather than being silently dropped.
    expect(homeOffice!.risk).toBeDefined();
    expect(homeOffice!.risk!.why).toContain("elevates the overall review profile");
  });

  it("does not fire when only some combo members are live", () => {
    const partialProfile: EvaluationProfile = {
      ...baseProfile,
      province: "AB",
      activityTags: ["Trades"],
      capitalPurchasePlanned: false,
    };
    const result = evaluateProfile(partialProfile, { today: TODAY });
    const ids = result.unlocks.map((u) => u.id);
    expect(ids).not.toContain("writeoff-cca-class-50");
    const vehicle = result.unlocks.find((u) => u.id === "writeoff-vehicle");
    expect(vehicle!.risk?.why).not.toContain("elevates the overall review profile");
  });
});

describe("structure ladder surfaces GAAR risk — H2", () => {
  it("sole-prop profiles never see Holdco/Trust forks", () => {
    const result = evaluateProfile(baseProfile, { today: TODAY });
    const ids = result.unlocks.map((u) => u.id);
    expect(ids).not.toContain("structure-holdco");
    expect(ids).not.toContain("structure-family-trust");
  });

  it("CCPC profiles see Holdco/Trust as yellow forks carrying the professional-required GAAR read", () => {
    const ccpcProfile: EvaluationProfile = { ...baseProfile, structure: "ccpc" };
    const result = evaluateProfile(ccpcProfile, { today: TODAY });
    const holdco = result.unlocks.find((u) => u.id === "structure-holdco");
    const trust = result.unlocks.find((u) => u.id === "structure-family-trust");

    expect(holdco).toBeDefined();
    expect(holdco!.state).toBe("yellow");
    expect(holdco!.engine).toBe("structure");
    expect(holdco!.risk).toBeDefined();
    expect(holdco!.risk!.level).toBe("professional-required");
    expect(holdco!.risk!.gaar).toBe(true);

    expect(trust).toBeDefined();
    expect(trust!.risk!.gaar).toBe(true);
  });
});
