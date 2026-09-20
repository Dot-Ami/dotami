import { describe, expect, it } from "vitest";
import { evaluateProfile } from "@/lib/brain";
import { itemsForNode, NODE_ENGINE_HINTS } from "@/lib/brain/node-items";
import { cfeCatalogV2026 } from "@/lib/engines/cfe/v2026";
import { buildScenarioFromIntake } from "@/lib/scenarios/build-scenario-from-intake";
import { buildEvaluationProfileFromScenario } from "@/lib/scenarios/evaluation-profile";

// S2.5.4e — node detail comes from the evaluator run on THIS scenario. Found 2026-09-13: the
// node panel showed BC Innovate and BC PST to an Alberta venture, because it read an
// archetype's id lists instead of the evaluation.

const TODAY = "2026-09-13";
const nodeIds = cfeCatalogV2026.nodes.map((n) => n.id);

function albertaApprentice() {
  return buildScenarioFromIntake(
    {
      name: "Test venture",
      type: "service",
      targetRevenueY1: 0,
      targetRevenueY3: 0,
      province: "AB",
      hireFirst: false,
      employmentStatus: "apprentice",
      activityTags: ["Software / SaaS", "Trades"],
      capitalPurchasePlanned: true,
    },
    "test-ab",
  );
}

describe("node items come from the evaluator, not the archetype", () => {
  it("an Alberta venture never sees a BC entry on any node", () => {
    const evaluation = evaluateProfile(buildEvaluationProfileFromScenario(albertaApprentice()), {
      today: TODAY,
    });
    for (const nodeId of nodeIds) {
      const { forThisStage, elsewhere } = itemsForNode(evaluation.unlocks, nodeId);
      const all = [...forThisStage, ...elsewhere];
      expect(all.some((i) => /\bBC\b|British Columbia/i.test(i.title))).toBe(false);
      expect(all.every((i) => i.citations.every((c) => c.jurisdiction === "AB" || c.jurisdiction === "CA"))).toBe(true);
    }
  });

  it("control: the same venture moved to BC DOES get BC entries — the filter is real", () => {
    const bc = albertaApprentice();
    bc.profile.province = "BC";
    const evaluation = evaluateProfile(buildEvaluationProfileFromScenario(bc), { today: TODAY });
    const everything = nodeIds.flatMap((id) => {
      const { forThisStage, elsewhere } = itemsForNode(evaluation.unlocks, id);
      return [...forThisStage, ...elsewhere];
    });
    expect(everything.some((i) => /\bBC\b|British Columbia/i.test(i.title))).toBe(true);
  });

  it("the sole-prop stage shows home office for a Software venture, with the evaluator's own why", () => {
    const evaluation = evaluateProfile(buildEvaluationProfileFromScenario(albertaApprentice()), {
      today: TODAY,
    });
    const { forThisStage } = itemsForNode(evaluation.unlocks, "stage-1-sole-prop-activation");
    const home = forThisStage.find((i) => i.id === "writeoff-home-office");
    expect(home).toBeDefined();
    expect(home!.why).toMatch(/Shown because/);
    // relevance is the hint map, applicability is the evaluator — both had to say yes
    expect(NODE_ENGINE_HINTS["stage-1-sole-prop-activation"]).toContain("writeoff-home-office");
  });

  it("maps the UI structure onto the engine ladder and keeps what the person said", () => {
    const s = albertaApprentice();
    expect(buildEvaluationProfileFromScenario(s).structure).toBe("sole-prop");
    expect(buildEvaluationProfileFromScenario(s).activityTags).toEqual(["Software / SaaS", "Trades"]);
    expect(buildEvaluationProfileFromScenario(s).capitalPurchasePlanned).toBe(true);
    s.profile.structure = "corporation";
    expect(buildEvaluationProfileFromScenario(s).structure).toBe("ccpc");
  });
});
