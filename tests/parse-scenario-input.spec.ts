import { describe, expect, it } from "vitest";

import { parseScenarioInput } from "@/lib/db/parse-scenario-input";

const validScenario = {
  scenario: {
    id: "example-service",
    profile: {
      name: "Example service venture",
      type: "service",
      province: "AB",
      targetRevenueY1: 60_000,
      targetRevenueY3: 180_000,
      structure: "sole-prop",
      hireFirst: false,
      employmentStatus: "apprentice",
    },
    state: {
      activeBranches: {
        gstTiming: "stage-2a-voluntary-gst-registration",
        incorporationTiming: "stage-3a-incorporation-80k-net",
      },
    },
  },
};

describe("parseScenarioInput", () => {
  it("accepts { scenario: ... } wrapper", () => {
    const s = parseScenarioInput(validScenario);
    expect(s?.id).toBe("example-service");
    expect(s?.profile.name).toBe("Example service venture");
    expect(s?.state.activeBranches.gstTiming).toBe("stage-2a-voluntary-gst-registration");
  });

  it("accepts bare scenario object", () => {
    const s = parseScenarioInput(validScenario.scenario);
    expect(s?.id).toBe("example-service");
  });

  it("accepts all 13 provinces (W3) and rejects unknown codes", () => {
    const qc = structuredClone(validScenario);
    (qc.scenario.profile as { province: string }).province = "QC";
    expect(parseScenarioInput(qc)?.profile.province).toBe("QC");

    const bad = structuredClone(validScenario);
    (bad.scenario.profile as { province: string }).province = "XX";
    expect(parseScenarioInput(bad)).toBeNull();
  });

  it("rejects missing activeBranches", () => {
    const bad = structuredClone(validScenario);
    delete (bad.scenario.state as { activeBranches?: unknown }).activeBranches;
    expect(parseScenarioInput(bad)).toBeNull();
  });

  it("carries structureSource, activityTags and capitalPurchasePlanned through (S2.5.4h bug fix)", () => {
    const s = parseScenarioInput({
      scenario: {
        ...validScenario.scenario,
        profile: {
          ...validScenario.scenario.profile,
          structureSource: "assumed",
          activityTags: ["Trades", "Software / SaaS"],
          capitalPurchasePlanned: true,
        },
      },
    });
    expect(s?.profile.structureSource).toBe("assumed");
    expect(s?.profile.activityTags).toEqual(["Trades", "Software / SaaS"]);
    expect(s?.profile.capitalPurchasePlanned).toBe(true);
    // absent → the safe defaults, never null
    const bare = parseScenarioInput(validScenario);
    expect(bare?.profile.structureSource).toBe("user");
    expect(bare?.profile.activityTags).toEqual([]);
    expect(bare?.profile.capitalPurchasePlanned).toBe(false);
  });
});
