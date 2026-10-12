/**
 * The map's colours follow the person's own branch picks (docs/ui-spec/cockpit/03-canvas.md).
 *
 * Until 2026-10-11 the cockpit ran the rules with no picks, so `evaluateProfile` fell back to the
 * defaults ("Wait for $30K", the incorporation default): flipping GST timing or Incorporation timing
 * moved the chips but left every card's colour where the defaults put it. `evaluateScenario` is now
 * the one way a saved venture's map is coloured, and it always passes the venture's own picks.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { evaluateProfile, type ConfirmedFigure } from "@/lib/brain";
import type { CFENodeId } from "@/lib/engines/cfe/v2026";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";
import { buildEvaluationProfileFromScenario } from "@/lib/scenarios/evaluation-profile";
import { defaultActiveBranches, updateScenarioBranch } from "@/lib/scenarios/branches";
import { recomputeScenarioState } from "@/lib/scenarios/branches";
import type { Scenario } from "@/lib/scenarios/types";

const TODAY = "2026-10-11";
const VOLUNTARY = "stage-2a-voluntary-gst-registration" satisfies CFENodeId;
const MANDATORY = "stage-2b-mandatory-gst-registration" satisfies CFENodeId;
const INCORPORATING = "stage-3a-incorporation-80k-net" satisfies CFENodeId;
const LIABILITY_SRED = "stage-3b-incorporation-liability-sred" satisfies CFENodeId;

/** An invented Alberta idea, well under the GST/HST line, starting from the default picks. */
const idea: Scenario = {
  id: "picks-test",
  profile: {
    name: "Invented — picks test",
    type: "service",
    province: "AB",
    targetRevenueY1: 12_000,
    targetRevenueY3: 150_000,
    structure: "sole-prop",
    structureSource: "assumed",
    employmentStatus: "self-employed",
    hireFirst: false,
    activityTags: ["Trades"],
  },
  state: recomputeScenarioState(defaultActiveBranches),
};

describe("evaluateScenario — the colours follow the person's picks", () => {
  it("starts on the default picks: 'Wait for $30K' is the GST card in amber, voluntary is grey", () => {
    const states = evaluateScenario(idea, { today: TODAY }).nodeStates;
    expect(states[MANDATORY]).toBe("yellow");
    expect(states[VOLUNTARY]).toBe("gray");
  });

  it("flipping GST timing to 'Voluntary now' recolours both GST cards", () => {
    const flipped = updateScenarioBranch(idea, "gstTiming", VOLUNTARY);
    const states = evaluateScenario(flipped, { today: TODAY }).nodeStates;
    expect(states[VOLUNTARY]).toBe("yellow");
    expect(states[MANDATORY]).toBe("gray");
  });

  it("flipping Incorporation timing recolours both incorporation cards", () => {
    const flipped = updateScenarioBranch(idea, "incorporationTiming", LIABILITY_SRED);
    const states = evaluateScenario(flipped, { today: TODAY }).nodeStates;
    expect(states[LIABILITY_SRED]).toBe("yellow");
    expect(states[INCORPORATING]).toBe("gray");
  });

  it("is the same evaluator, with the venture's picks and only the figures it is given", () => {
    const flipped = updateScenarioBranch(idea, "gstTiming", VOLUNTARY);
    const figures: ConfirmedFigure[] = [
      {
        id: "f1",
        kind: "gross-revenue",
        periodStart: "2026-07-01",
        periodEnd: "2026-09-30",
        amountCents: 3_120_000,
        currency: "CAD",
        sourceLabel: "typed by you",
        sourceRows: null,
      },
    ];
    expect(evaluateScenario(flipped, { today: TODAY, figures })).toEqual(
      evaluateProfile(buildEvaluationProfileFromScenario(flipped), {
        today: TODAY,
        activeBranches: flipped.state.activeBranches,
        figures,
      }),
    );
  });
});

// The control: a screen or route that colours a saved venture's map has to go through
// evaluateScenario. Calling the evaluator on a scenario's profile directly is how the cockpit lost
// the picks, so it is refused everywhere else.
describe("no screen or route runs a saved venture's rules without its picks", () => {
  const root = path.resolve(__dirname, "..");
  const ALLOWED = path.join("lib", "scenarios", "evaluate-scenario.ts");

  function sources(dir: string): string[] {
    return readdirSync(path.join(root, dir)).flatMap((name) => {
      const rel = path.join(dir, name);
      if (statSync(path.join(root, rel)).isDirectory()) return sources(rel);
      return /\.(ts|tsx|mts|cts|js|jsx|mjs)$/.test(name) ? [rel] : [];
    });
  }

  it("finds evaluateProfile run on buildEvaluationProfileFromScenario only in evaluate-scenario.ts", () => {
    const offenders = ["app", "components", "lib"]
      .flatMap(sources)
      .filter((rel) => rel !== ALLOWED)
      .filter((rel) => {
        const text = readFileSync(path.join(root, rel), "utf8");
        return text.includes("buildEvaluationProfileFromScenario") && /\bevaluateProfile\s*\(/.test(text);
      });
    expect(offenders).toEqual([]);
  });

  it("the cockpit and the readout colour the map through evaluateScenario", () => {
    // Since 2026-10-12 the cockpit runs road evaluation, whose rules run is evaluateScenario on the idea
    // with its own picks (lib/roads/evaluate-road.ts runRules), and draws the map from that run.
    expect(readFileSync(path.join(root, "components/cockpit/cockpit-page.tsx"), "utf8")).toMatch(/\bevaluateRoad\s*\(/);
    for (const rel of ["lib/roads/evaluate-road.ts", "app/api/readout/route.ts"]) {
      expect(readFileSync(path.join(root, rel), "utf8"), rel).toMatch(/\bevaluateScenario\s*\(/);
    }
  });
});
