import { describe, expect, it } from "vitest";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { branchDecisions, defaultActiveBranches, updateScenarioBranch } from "@/lib/scenarios/branches";

// S2.5.4d — "Kill the template voice" (decided 2026-09-13: template defaults read as if they
// were real data). An intake-built venture must never show template defaults as the person's
// choices. S2.5.4h removed the archetypes entirely, so the only source of defaults left is
// `defaultActiveBranches`, and the map labels those as defaults until clicked.

const intake = {
  name: "Test venture",
  type: "service" as const,
  targetRevenueY1: 0,
  targetRevenueY3: 0,
  province: "AB" as const,
  hireFirst: false,
  employmentStatus: "apprentice" as const,
  activityTags: ["Software / SaaS", "Trades"],
};

describe("intake-built scenarios carry no template voice", () => {
  it("assumes sole-prop and says so, whatever the tags are", () => {
    const scenario = buildScenarioFromIntake(intake, "test-uuid-1");
    expect(scenario.profile.structure).toBe("sole-prop");
    expect(scenario.profile.structureSource).toBe("assumed");
  });

  it("starts from the neutral branch bundle, not a persona's picks", () => {
    const scenario = buildScenarioFromIntake(intake, "test-uuid-1b");
    expect(scenario.state.activeBranches).toEqual(defaultActiveBranches);
  });

  it("starts with no decided branches and records exactly the ones the person clicks", () => {
    const scenario = buildScenarioFromIntake(intake, "test-uuid-2");
    expect(scenario.state.decidedBranchIds ?? []).toEqual([]);
    const gst = branchDecisions[0];
    const next = updateScenarioBranch(scenario, gst.id, gst.options[1].id);
    expect(next.state.decidedBranchIds).toEqual([gst.id]);
    expect(next.state.activeBranches[gst.id]).toBe(gst.options[1].id);
    // clicking the same decision twice does not duplicate it
    const again = updateScenarioBranch(next, gst.id, gst.options[0].id);
    expect(again.state.decidedBranchIds).toEqual([gst.id]);
  });
});
