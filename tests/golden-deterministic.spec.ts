import { describe, expect, it } from "vitest";

import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { cfeNodesV2026 } from "@/lib/engines/cfe/v2026";
import { buildPlaybookSkeleton } from "@/lib/playbook/build-skeleton";
import type { PlaybookSkeleton } from "@/lib/playbook/types";
import { updateScenarioBranch } from "@/lib/scenarios/branches";
import { cfeTiersV2026, tierForStage } from "@/lib/engines/cfe/v2026/tiers";
import { getScenarioNodeStatus } from "@/lib/scenarios/graph";

import {
  goldenAbHireFirst,
  goldenBcProductSred,
  goldenExampleService,
  goldenIntakeOnSideGig,
  goldenOnMandatoryLowRamp,
  goldenScenarioFixtures,
} from "./fixtures/golden-scenarios";

function skeletonNodeIds(skeleton: PlaybookSkeleton): CFENodeId[] {
  return skeleton.sections.flatMap((s) => s.nodes.map((n) => n.nodeId as CFENodeId));
}

describe("CFE catalog gate", () => {
  it("ships exactly 10 v1 nodes (Stage 0–4 + branches)", () => {
    expect(cfeNodesV2026).toHaveLength(10);
  });
});

describe("golden scenarios — playbook skeleton", () => {
  it.each(goldenScenarioFixtures)("buildPlaybookSkeleton for $id", (scenario) => {
    const skeleton = buildPlaybookSkeleton(cfeNodesV2026, scenario);

    expect(skeleton.scenarioId).toBe(scenario.id);
    expect(skeleton.decisions).toHaveLength(2);
    expect(skeleton.decisions[0]?.decisionId).toBe("gstTiming");
    expect(skeleton.decisions[1]?.decisionId).toBe("incorporationTiming");
    expect(skeleton.disclaimer.length).toBeGreaterThan(40);

    const ids = skeletonNodeIds(skeleton);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(cfeNodesV2026.some((n) => n.id === id)).toBe(true);
    }
  });

  it("Example service venture visible nodes match default branch picks (no hire-first)", () => {
    const skeleton = buildPlaybookSkeleton(cfeNodesV2026, goldenExampleService);
    const sorted = [...skeletonNodeIds(skeleton)].sort();

    expect(sorted).toEqual(
      [
        "branch-service-vs-productize",
        "stage-0-employee-apprentice-baseline",
        "stage-1-sole-prop-activation",
        "stage-2a-voluntary-gst-registration",
        "stage-3a-incorporation-80k-net",
      ].sort(),
    );
  });

  it("hire-first scenario includes hire branch in skeleton", () => {
    const skeleton = buildPlaybookSkeleton(cfeNodesV2026, goldenAbHireFirst);

    expect(skeletonNodeIds(skeleton)).toContain("branch-hire-first-employee");
  });
});

describe("golden scenarios — graph statuses", () => {
  it("ghosts inactive GST option on Example service venture", () => {
    expect(getScenarioNodeStatus("stage-2b-mandatory-gst-registration", goldenExampleService)).toBe(
      "ghost",
    );
    expect(getScenarioNodeStatus("stage-2a-voluntary-gst-registration", goldenExampleService)).toBe(
      "decision",
    );
  });

  it("updateScenarioBranch flips GST active path", () => {
    const toggled = updateScenarioBranch(goldenExampleService, "gstTiming", "stage-2b-mandatory-gst-registration");

    expect(getScenarioNodeStatus("stage-2b-mandatory-gst-registration", toggled)).not.toBe(
      "ghost",
    );
    expect(getScenarioNodeStatus("stage-2a-voluntary-gst-registration", toggled)).toBe("ghost");
  });

  it("every catalog node lands in exactly one tier column (S2.5.4j)", () => {
    for (const node of cfeNodesV2026) {
      const tiers = cfeTiersV2026.filter((t) => t.stages.includes(node.stage));
      expect(tiers).toHaveLength(1);
      expect(tierForStage(node.stage)?.id).toBe(tiers[0].id);
    }
    // ordinals are 1..n in order, and the branch toggles sit in distinct tiers
    expect(cfeTiersV2026.map((t) => t.ordinal)).toEqual(cfeTiersV2026.map((_, i) => i + 1));
    const toggles = cfeTiersV2026.map((t) => t.branchDecisionId).filter(Boolean);
    expect(new Set(toggles).size).toBe(toggles.length);
  });
});

describe("golden intake fixture", () => {
  it("starts from the one neutral branch bundle (S2.5.4h: no archetype)", () => {
    expect(goldenIntakeOnSideGig.state.activeBranches).toEqual({
      gstTiming: "stage-2b-mandatory-gst-registration",
      incorporationTiming: "stage-3a-incorporation-80k-net",
    });
  });
});
