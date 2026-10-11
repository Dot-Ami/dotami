/**
 * The map's "Incorporating" stage (node id `stage-3a-incorporation-80k-net`, kept: ids are forever).
 *
 * Until 2026-10-11 it was "Incorporation at $80K net" and turned green once the third-year revenue
 * estimate reached $80,000: a number no cited page sets (the catalog called it a "v0 heuristic"),
 * compared against SALES although it was written as NET income. DotAmi doesn't pick a point to
 * incorporate; the person does. So no amount lights the card: it is "check first" (amber) while
 * it is the person's pick and "not on your path" grey when they picked the other option.
 * docs/ui-spec/cockpit/03-canvas.md § Incorporating.
 */
import { describe, expect, it } from "vitest";

import { evaluateProfile } from "@/lib/brain";
import type { EvaluationProfile } from "@/lib/brain";
import { cfeCatalogV2026, type CFENodeId } from "@/lib/engines/cfe/v2026";
import { branchDecisions } from "@/lib/scenarios/branches";

const TODAY = "2026-10-11";
const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;
const LIABILITY_SRED = "stage-3b-incorporation-liability-sred" satisfies CFENodeId;

/** An invented Alberta trades business; only the third-year estimate and the picks change below. */
function profile(targetRevenueY3: number, structure: EvaluationProfile["structure"] = "sole-prop"): EvaluationProfile {
  return {
    goals: [],
    ventureType: "service",
    activityTags: ["Trades"],
    province: "AB",
    employmentStatus: "self-employed",
    structure,
    targetRevenueY1: 20_000,
    targetRevenueY3,
    hireFirst: false,
    capitalPurchasePlanned: false,
  };
}

const picks = (incorporationTiming: CFENodeId) => ({
  gstTiming: "stage-2b-mandatory-gst-registration" as CFENodeId,
  incorporationTiming,
});

// Either side of the old line, and far past it: none of these may change the card.
const ESTIMATES = [0, 79_999, 80_000, 120_000, 5_000_000];

describe("Incorporating — no amount DotAmi chose lights it", () => {
  it.each(ESTIMATES)("is 'check first' (amber), never green, while it is the person's pick — third-year estimate $%i", (y3) => {
    const result = evaluateProfile(profile(y3), { today: TODAY, activeBranches: picks(INCORPORATING) });
    expect(result.nodeStates[INCORPORATING]).toBe("yellow");
  });

  it.each(ESTIMATES)("is grey, not on the person's path, when they picked the other option — third-year estimate $%i", (y3) => {
    const result = evaluateProfile(profile(y3), { today: TODAY, activeBranches: picks(LIABILITY_SRED) });
    expect(result.nodeStates[INCORPORATING]).toBe("gray");
  });

  it("lights retained earnings planning only when the person said the idea is a corporation, not from a sales estimate", () => {
    const big = evaluateProfile(profile(5_000_000), { today: TODAY, activeBranches: picks(INCORPORATING) });
    expect(big.nodeStates["stage-4-retained-earnings-planning"]).toBe("gray");
    const corporation = evaluateProfile(profile(0, "ccpc"), { today: TODAY, activeBranches: picks(INCORPORATING) });
    expect(corporation.nodeStates["stage-4-retained-earnings-planning"]).toBe("yellow");
  });

  it("says on the card that DotAmi doesn't pick the point, under the name 'Incorporating', with its id unchanged", () => {
    const node = cfeCatalogV2026.nodes.find((n) => n.id === INCORPORATING);
    expect(node, "the node id is forever").toBeDefined();
    expect(node!.label).toBe("Incorporating");
    expect(node!.trigger).toBe("DotAmi doesn't pick a point to incorporate. You do, with your accountant or lawyer.");
    // Nothing on it, the other incorporation card or the toggle mentions the old line.
    const other = cfeCatalogV2026.nodes.find((n) => n.id === LIABILITY_SRED)!;
    const toggle = branchDecisions.find((d) => d.id === "incorporationTiming")!;
    const words = JSON.stringify([node, other, toggle]);
    expect(words).not.toMatch(/80\s?K|80,000|80000|heuristic/i);
    expect(toggle.options.map((o) => o.label)).toEqual(["When you decide", "Liability / SR&ED"]);
  });

  it("keeps only cited facts in its detail: the CRA corporation page and the T2 guide's $500,000 business limit", () => {
    const node = cfeCatalogV2026.nodes.find((n) => n.id === INCORPORATING)!;
    expect(node.citations.map((c) => c.url)).toEqual([
      "https://www.canada.ca/en/revenue-agency/services/tax/businesses/small-businesses-self-employed-income/setting-your-business/corporation.html",
      "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4012/t2-corporation-income-tax-guide-chapter-4-page-4-t2-return.html",
    ]);
    expect(node.financialImpact.estimates).toEqual([
      {
        label: "Federal SBD business limit",
        value: "$500,000",
        basis: "CRA T2 guide business limit for qualifying CCPC active business income.",
      },
    ]);
  });
});
