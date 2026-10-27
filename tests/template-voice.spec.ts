import { describe, expect, it } from "vitest";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { branchDecisions, defaultActiveBranches, recomputeScenarioState, updateScenarioBranch } from "@/lib/scenarios/branches";
import { isBranchDecided, stageChipFor } from "@/lib/scenarios/graph";

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

// Issue #5: with GST timing still on its default, the toggle said "default, not your pick yet" while
// the stage card under it said "your pick". A card's chip now says "default" until the person
// clicks that decision, and "open choice" on the fork every map shows.
describe("stage chips never say 'your pick' on something the person didn't pick (issue #5)", () => {
  const MANDATORY = "stage-2b-mandatory-gst-registration" as const;
  const VOLUNTARY = "stage-2a-voluntary-gst-registration" as const;
  const INCORPORATING = "stage-3a-incorporation-80k-net" as const;

  it("an untouched default reads 'default', on both toggles", () => {
    const scenario = buildScenarioFromIntake(intake, "chips-1");
    expect(stageChipFor(MANDATORY, scenario)).toBe("default");
    expect(stageChipFor(INCORPORATING, scenario)).toBe("default");
    expect(isBranchDecided("gstTiming", scenario.state)).toBe(false);
  });

  it("a click makes it 'your pick', even when the person clicks the default itself", () => {
    const scenario = buildScenarioFromIntake(intake, "chips-2");
    const sameAsDefault = updateScenarioBranch(scenario, "gstTiming", MANDATORY);
    expect(stageChipFor(MANDATORY, sameAsDefault)).toBe("your-pick");
    // The other decision is still untouched.
    expect(stageChipFor(INCORPORATING, sameAsDefault)).toBe("default");
    const other = updateScenarioBranch(scenario, "gstTiming", VOLUNTARY);
    expect(stageChipFor(VOLUNTARY, other)).toBe("your-pick");
    expect(stageChipFor(MANDATORY, other)).toBe("not-on-your-path");
  });

  it("a saved idea whose pick isn't the default keeps 'your pick' after a reload: only a click can move it", () => {
    // The database keeps the picks but not which ones were clicked, so a reload has no decidedBranchIds.
    const reloaded = buildScenarioFromIntake(intake, "chips-3");
    const state = recomputeScenarioState({ ...defaultActiveBranches, gstTiming: VOLUNTARY });
    const scenario = { ...reloaded, state };
    expect(state.decidedBranchIds).toBeUndefined();
    expect(stageChipFor(VOLUNTARY, scenario)).toBe("your-pick");
    expect(isBranchDecided("gstTiming", state)).toBe(true);
    expect(stageChipFor(INCORPORATING, scenario)).toBe("default");
  });

  it("the fork on every map is an open choice; hire-first, which the person turned on, is theirs", () => {
    const scenario = buildScenarioFromIntake({ ...intake, hireFirst: true }, "chips-4");
    expect(stageChipFor("branch-service-vs-productize", scenario)).toBe("open-choice");
    expect(stageChipFor("branch-hire-first-employee", scenario)).toBe("your-pick");
    // Where the stage sits on the map, never the person's status (2026-10-23: "now" and "done" until then).
    expect(stageChipFor("stage-1-sole-prop-activation", scenario)).toBe("first-stage");
    expect(stageChipFor("stage-0-employee-apprentice-baseline", scenario)).toBe("starting-point");
  });
});
