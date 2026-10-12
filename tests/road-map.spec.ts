import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { columnNumbers, futureEdges } from "@/lib/roads/paths";
import { StrategyMap } from "@/components/cockpit/strategy-map";
import { generalRoadV2026, type Road } from "@/lib/engines/roads/v2026";
import { evaluateScenario } from "@/lib/scenarios/evaluate-scenario";

import { inventedRoad } from "./helpers/invented-road";
import { MAP_TODAY, mapCases, type MapCase } from "./helpers/strategy-map-cases";

/**
 * The map draws any road, and today's map, drawn as road 0, is exactly what it was.
 *
 * tests/fixtures/strategy-map/ holds what the old map drew (from main at 7232937 on 2026-10-11; the
 * HTML re-recorded on 2026-10-12 from the honest-map branch at a7f5bcb, #145, whose chips and reason
 * lines changed the old map on purpose) for each
 * state in tests/helpers/strategy-map-cases.ts, plus where every card's arrows went and which column
 * each card sat in. Drawing the same states through the road must give the same HTML, byte for byte.
 */
const fixtures = new URL("./fixtures/strategy-map/", import.meta.url);

function draw(road: Road, c: MapCase): string {
  return renderToStaticMarkup(
    createElement(StrategyMap, {
      road,
      scenario: c.scenario,
      evaluation: evaluateScenario(c.scenario, { today: MAP_TODAY }),
      selectedStepId: c.selectedNodeId,
      onSelectStep: () => {},
      onBranchChange: () => {},
    }),
  );
}

describe("today's map, drawn as the road Starting any business in Alberta", () => {
  it.each(mapCases)("draws $name exactly as the old map did", (c) => {
    // Each file is one line of HTML; only its line ending can differ by checkout (CRLF on Windows).
    const before = readFileSync(new URL(`${c.name}.html`, fixtures), "utf8").trimEnd();
    expect(draw(generalRoadV2026, c)).toBe(before);
  });

  it("every card's hover arrows go where they went, and every card sits in the same column", () => {
    const before = JSON.parse(readFileSync(new URL("arrows-and-columns.json", fixtures), "utf8")) as {
      arrows: Record<string, unknown>;
      columns: Record<string, number>;
    };
    const stepsById = new Map(generalRoadV2026.steps.map((s) => [s.id, s]));
    const arrows = Object.fromEntries(generalRoadV2026.steps.map((s) => [s.id, futureEdges(stepsById, s.id)]));
    expect(arrows).toEqual(before.arrows);
    expect(Object.fromEntries(columnNumbers(generalRoadV2026))).toEqual(before.columns);
  });
});

describe("the map draws any road it is given", () => {
  it("an invented road: its own columns, steps and arrows, and none of today's tax map", () => {
    const road = inventedRoad();
    const html = draw(road, { ...mapCases[0]!, selectedNodeId: null });
    expect(html).toContain("Tier 1");
    expect(html).toContain("Tier 2");
    expect(html).not.toContain("Tier 3");
    for (const label of ["Start", "Then", "Train (test only)", "Stay employed (test only)", "Own shop (test only)"]) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain("Sole Prop activation");
    expect(html).not.toContain("GST timing");
    const stepsById = new Map(road.steps.map((s) => [s.id, s]));
    expect(futureEdges(stepsById, "step-invented-train")).toEqual([
      { from: "step-invented-train", to: "step-invented-employed", depth: 1 },
      { from: "step-invented-train", to: "step-invented-own", depth: 1 },
    ]);
    expect(Object.fromEntries(columnNumbers(road))).toEqual({
      "step-invented-train": 1,
      "step-invented-employed": 2,
      "step-invented-own": 2,
    });
  });

  it("the map's files hold no tax map of their own: they import nothing from today's CFE catalog", () => {
    for (const file of ["components/cockpit/strategy-map.tsx", "components/cockpit/map-arrows.tsx"]) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(source, file).not.toMatch(/@\/lib\/engines\/cfe/);
    }
  });
});
